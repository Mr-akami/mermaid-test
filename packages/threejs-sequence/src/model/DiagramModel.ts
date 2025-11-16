import type {
  SequenceDiagram,
  Participant,
  Box,
  Statement,
  Message,
  Activation
} from './types';
import { IdGenerator } from '../services/IdGenerator';
import type { DiagramObserver } from './DiagramObserver';

/**
 * DiagramModel manages the sequence diagram data and provides methods for editing
 * Uses Observer pattern to notify renderers of changes
 */
export class DiagramModel {
  private diagram: SequenceDiagram;
  private observers: DiagramObserver[] = [];
  // Legacy support for old change listeners
  private changeListeners: Array<() => void> = [];
  // Flag to batch multiple changes and notify once
  private batchingChanges = false;

  constructor(initialDiagram?: Partial<SequenceDiagram>) {
    this.diagram = {
      participants: [],
      boxes: [],
      statements: [],
      autoNumber: false,
      ...initialDiagram
    };
  }

  // Getters
  getDiagram(): SequenceDiagram {
    return this.diagram;
  }

  getParticipants(): Participant[] {
    return this.diagram.participants;
  }

  getBoxes(): Box[] {
    return this.diagram.boxes;
  }

  getStatements(): Statement[] {
    return this.diagram.statements;
  }

  // ID generation
  generateId(prefix: string): string {
    const existingIds = this.diagram.participants.map(p => p.id);
    return IdGenerator.generateId(prefix, existingIds);
  }

  // Participant operations
  addParticipant(participant: Participant): void {
    this.diagram.participants.push(participant);
    this.notifyChange();
  }

  updateParticipant(id: string, updates: Partial<Participant>): void {
    const participant = this.diagram.participants.find(p => p.id === id);
    if (participant) {
      Object.assign(participant, updates);
      this.notifyChange();
    }
  }

  removeParticipant(id: string): void {
    this.diagram.participants = this.diagram.participants.filter(p => p.id !== id);
    this.notifyChange();
  }

  // Box operations
  addBox(box: Box): void {
    this.diagram.boxes.push(box);
    this.notifyChange();
  }

  updateBox(id: string, updates: Partial<Box>): void {
    const box = this.diagram.boxes.find(b => b.id === id);
    if (box) {
      Object.assign(box, updates);
      this.notifyChange();
    }
  }

  removeBox(id: string): void {
    this.diagram.boxes = this.diagram.boxes.filter(b => b.id !== id);
    // Clear box references in participants
    this.diagram.participants.forEach(p => {
      if (p.boxId === id) {
        p.boxId = undefined;
      }
    });
    this.notifyChange();
  }

  // Statement operations
  addStatement(statement: Statement, index?: number): void {
    if (index !== undefined) {
      this.diagram.statements.splice(index, 0, statement);
    } else {
      this.diagram.statements.push(statement);
    }
    this.notifyChange();
  }

  updateStatement(index: number, statement: Statement): void {
    if (index >= 0 && index < this.diagram.statements.length) {
      this.diagram.statements[index] = statement;
      this.notifyChange();
    }
  }

  removeStatement(index: number): void {
    if (index >= 0 && index < this.diagram.statements.length) {
      this.diagram.statements.splice(index, 1);
      this.notifyChange();
    }
  }

  moveStatement(fromIndex: number, toIndex: number): void {
    if (fromIndex >= 0 && fromIndex < this.diagram.statements.length &&
        toIndex >= 0 && toIndex < this.diagram.statements.length) {
      const statement = this.diagram.statements.splice(fromIndex, 1)[0];
      this.diagram.statements.splice(toIndex, 0, statement);
      this.notifyChange();
    }
  }

  // Config operations
  setAutoNumber(enabled: boolean): void {
    this.diagram.autoNumber = enabled;
    this.notifyChange();
  }

  updateConfig(config: Partial<SequenceDiagram['config']>): void {
    this.diagram.config = {
      ...this.diagram.config,
      ...config
    };
    this.notifyChange();
  }

  // Observer pattern methods
  /**
   * Register an observer to be notified of diagram changes
   * @param observer The observer to register
   */
  addObserver(observer: DiagramObserver): void {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }

  /**
   * Unregister an observer
   * @param observer The observer to unregister
   */
  removeObserver(observer: DiagramObserver): void {
    this.observers = this.observers.filter(o => o !== observer);
  }

  /**
   * Notify all observers of a change
   */
  private notifyObservers(): void {
    this.observers.forEach(observer => {
      observer.onDiagramChanged();
    });
  }

  // Legacy change notification (for backward compatibility)
  onChange(listener: () => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }

  private notifyChange(): void {
    // Skip notification if batching changes
    if (this.batchingChanges) {
      return;
    }
    // Notify both observers and legacy listeners
    this.notifyObservers();
    this.changeListeners.forEach(listener => listener());
  }

  /**
   * Execute a function with batched change notifications
   * All model changes within the function will only trigger one notification at the end
   * @param fn Function to execute with batched changes
   */
  batchChanges(fn: () => void): void {
    this.batchingChanges = true;
    try {
      fn();
    } finally {
      this.batchingChanges = false;
      // Notify once after all changes
      this.notifyObservers();
      this.changeListeners.forEach(listener => listener());
    }
  }

  // Helper methods for activation tracking
  getActivations(): Activation[] {
    const activations: Activation[] = [];
    const activeStack: Map<string, number[]> = new Map(); // participantId -> stack of start indices

    this.diagram.statements.forEach((statement, index) => {
      if ('sender' in statement && 'receiver' in statement) {
        const msg = statement as Message;

        // Handle activation
        if (msg.activateReceiver) {
          const stack = activeStack.get(msg.receiver) || [];
          stack.push(index);
          activeStack.set(msg.receiver, stack);
        }
        if (msg.activateSender) {
          const stack = activeStack.get(msg.sender) || [];
          stack.push(index);
          activeStack.set(msg.sender, stack);
        }

        // Handle deactivation
        if (msg.deactivateReceiver) {
          const stack = activeStack.get(msg.receiver);
          if (stack && stack.length > 0) {
            const startIndex = stack.pop()!;
            activations.push({
              participantId: msg.receiver,
              startIndex,
              endIndex: index,
              level: stack.length
            });
          }
        }
        if (msg.deactivateSender) {
          const stack = activeStack.get(msg.sender);
          if (stack && stack.length > 0) {
            const startIndex = stack.pop()!;
            activations.push({
              participantId: msg.sender,
              startIndex,
              endIndex: index,
              level: stack.length
            });
          }
        }
      }
    });

    // Close any remaining open activations
    activeStack.forEach((stack, participantId) => {
      stack.forEach(startIndex => {
        activations.push({
          participantId,
          startIndex,
          endIndex: this.diagram.statements.length - 1,
          level: 0
        });
      });
    });

    return activations;
  }

  // Get ordered participants (explicit first, then implicit)
  getOrderedParticipants(): Participant[] {
    const explicitParticipants = this.diagram.participants.slice();
    const implicitParticipantIds = new Set<string>();

    // Find participants mentioned in messages but not explicitly defined
    this.diagram.statements.forEach(statement => {
      if ('sender' in statement && 'receiver' in statement) {
        const msg = statement as Message;
        if (!explicitParticipants.find(p => p.id === msg.sender)) {
          implicitParticipantIds.add(msg.sender);
        }
        if (!explicitParticipants.find(p => p.id === msg.receiver)) {
          implicitParticipantIds.add(msg.receiver);
        }
      }
    });

    // Create implicit participants
    const implicitParticipants: Participant[] = Array.from(implicitParticipantIds).map(id => ({
      id,
      type: 'participant',
      links: []
    }));

    return [...explicitParticipants, ...implicitParticipants];
  }
}
