import { DiagramModel } from '../model/DiagramModel';
import type { Participant, Message, Note } from '../model/types';
import type { DiagramObserver } from '../model/DiagramObserver';
import { CoordinateUtils } from '../utils/CoordinateUtils';
import { GeometryUtils } from '../utils/GeometryUtils';
import { MessagePositionUtils } from '../utils/MessagePositionUtils';
import { StructureUtils } from '../utils/StructureUtils';

export interface Point {
  x: number;
  y: number;
}

export interface DraggableElement {
  type: 'participant' | 'message' | 'note' | 'controlStructure';
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  data?: any;
}

/**
 * Canvas2DRenderer renders sequence diagrams using Canvas 2D API
 * Implements DiagramObserver to be notified of model changes
 */
export class Canvas2DRenderer implements DiagramObserver {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private model: DiagramModel;

  // Layout constants
  private readonly PARTICIPANT_WIDTH = 120;
  private readonly PARTICIPANT_HEIGHT = 50;
  private readonly PARTICIPANT_SPACING = 150;
  private readonly MESSAGE_SPACING = 60;
  private readonly MARGIN_TOP = 80;
  private readonly MARGIN_LEFT = 50;

  // Participant positions (can be dragged)
  private participantPositions: Map<string, Point> = new Map();

  // Message positions (y-coordinate, can be dragged vertically)
  private messagePositions: Map<number, number> = new Map(); // index -> y position

  // Note positions (can be dragged)
  private notePositions: Map<number, Point> = new Map(); // index -> position

  // Draggable elements for hit testing
  private elements: DraggableElement[] = [];

  // Control structure bounds cache (for efficient lookup during message positioning)
  private controlStructureBounds: Map<number, { x: number; y: number; width: number; height: number }> = new Map();

  // Selected message for edge reconnection
  private selectedMessage: { message: Message; index: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement, model: DiagramModel) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.model = model;

    // Setup canvas size
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Register as observer to model
    this.model.addObserver(this);

    // Initialize participant positions
    this.initializePositions();
  }

  /**
   * DiagramObserver implementation
   * Called when the diagram model changes
   */
  onDiagramChanged(): void {
    this.render();
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = container.clientWidth * dpr;
    this.canvas.height = container.clientHeight * dpr;
    this.canvas.style.width = container.clientWidth + 'px';
    this.canvas.style.height = container.clientHeight + 'px';

    this.ctx.scale(dpr, dpr);
    this.render();
  }

  private initializePositions(): void {
    const participants = this.model.getOrderedParticipants();

    // Initialize participant positions in a row
    participants.forEach((participant, index) => {
      if (!this.participantPositions.has(participant.id)) {
        this.participantPositions.set(participant.id, {
          x: this.MARGIN_LEFT + index * this.PARTICIPANT_SPACING,
          y: this.MARGIN_TOP
        });
      }
    });

    // Initialize message positions and clean up stale entries
    const statements = this.model.getStatements();
    const validMessageIndices = new Set<number>();

    let messageIndex = 0;
    statements.forEach((statement, index) => {
      if ('sender' in statement && 'receiver' in statement) {
        validMessageIndices.add(index);
        if (!this.messagePositions.has(index)) {
          this.messagePositions.set(index,
            this.MARGIN_TOP + this.PARTICIPANT_HEIGHT + 50 + messageIndex * this.MESSAGE_SPACING
          );
        }
        messageIndex++;
      }
    });

    // Remove stale message position entries that no longer correspond to valid messages
    // But keep string keys (for messages inside structures)
    Array.from(this.messagePositions.keys()).forEach(key => {
      if (typeof key === 'number' && !validMessageIndices.has(key)) {
        this.messagePositions.delete(key);
      }
    });
  }

  /**
   * Add a new participant at specified position
   */
  addParticipantAtPosition(participant: Participant, position: Point): void {
    this.participantPositions.set(participant.id, position);
    this.model.addParticipant(participant);
    // render() will be called automatically by Observer pattern
  }

  /**
   * Update participant position (for dragging)
   * Only updates visual position, not model
   */
  updateParticipantPosition(participantId: string, position: Point): void {
    this.participantPositions.set(participantId, position);
    this.render(); // Explicit render needed - no model change
  }

  /**
   * Update note position (for dragging)
   * Only updates visual position, not model
   */
  updateNotePosition(index: number, position: Point): void {
    this.notePositions.set(index, position);
    this.render(); // Explicit render needed - no model change
  }

  /**
   * Update message position (for vertical dragging)
   * Only updates visual position, not model
   */
  updateMessagePosition(messageIndex: number, y: number): void {
    this.messagePositions.set(messageIndex, y);
    this.render(); // Explicit render needed - no model change
  }

  /**
   * Update message position by message object (for messages inside structures)
   * Only updates visual position, not model
   */
  updateMessagePositionByObject(message: any, y: number, parentStructure?: any): void {
    // Store position using a unique key based on message properties
    const messageKey = MessagePositionUtils.generateMessageKey(message);

    if (parentStructure) {
      // Find the current bounds of the parent structure
      const currentStructureBounds = this.findCurrentStructureBounds(parentStructure);

      if (currentStructureBounds) {
        // Store as relative offset from structure top
        const relativeOffset = CoordinateUtils.toRelativeOffset(y, currentStructureBounds);
        this.messagePositions.set(messageKey as any, relativeOffset);
      } else {
        // Fallback to old behavior if we can't find current bounds
        if (parentStructure.bounds) {
          const relativeOffset = CoordinateUtils.toRelativeOffset(y, parentStructure.bounds);
          this.messagePositions.set(messageKey as any, relativeOffset);
        } else {
          this.messagePositions.set(messageKey as any, y);
        }
      }
    } else {
      // Store as absolute position (for top-level messages)
      this.messagePositions.set(messageKey as any, y);
    }
    this.render(); // Explicit render needed - no model change
  }

  /**
   * Find the current bounds of a structure by looking it up in controlStructureBounds
   */
  private findCurrentStructureBounds(structure: any): { x: number; y: number; width: number; height: number } | null {
    // If structure has _topLevelStatementIndex, use it directly
    if (structure && typeof structure._topLevelStatementIndex === 'number') {
      const bounds = this.controlStructureBounds.get(structure._topLevelStatementIndex);
      if (bounds) {
        return bounds;
      }
    }

    // Fallback: Try to find the structure in controlStructureBounds by matching
    const statements = this.model.getStatements();

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Check if this statement matches the structure we're looking for
      if (StructureUtils.structuresEqual(stmt, structure)) {
        const bounds = this.controlStructureBounds.get(i);
        if (bounds) {
          return bounds;
        }
      }
    }

    return null;
  }

  /**
   * Update control structure bounds (for dragging and resizing)
   */
  updateControlStructureBounds(
    statementIndex: number,
    bounds: { x: number; y: number; width: number; height: number },
    shouldUpdateContainment: boolean = false,
    shouldPersist: boolean = true
  ): void {
    const statements = this.model.getStatements();
    const statement = statements[statementIndex];

    if (statement && 'type' in statement && statement.type) {
      const oldBounds = (statement as any).bounds;

      console.log('[Renderer] updateControlStructureBounds:', {
        statementIndex,
        oldBounds,
        newBounds: bounds,
        shouldUpdateContainment,
        shouldPersist
      });

      // Update bounds
      (statement as any).bounds = bounds;

      // Only clear message positions if the structure is being resized (width/height changed)
      // Don't clear when just moving (x/y changed but width/height same)
      const isResizing = oldBounds &&
        (oldBounds.width !== bounds.width || oldBounds.height !== bounds.height);

      console.log('[Renderer] isResizing:', isResizing);

      if (isResizing) {
        // Clear all message position overrides for messages inside this structure
        // This ensures messages use their relative positions within the structure
        console.log('[Renderer] Clearing message positions for resize');
        this.clearStructureMessagePositions(statement);
      }

      // Update containment if requested (for resize)
      if (shouldUpdateContainment) {
        this.updateStructureContainment(statementIndex);
      }

      // Update the statement in the model to persist the bounds change
      // Only persist when drag/resize is complete to avoid frequent CodeEditor updates
      // This should be done AFTER containment update
      if (shouldPersist) {
        this.model.updateStatement(statementIndex, statement);
        // render() will be called automatically by Observer pattern
      } else {
        // If not persisting to model, need explicit render
        this.render();
      }
    }
  }

  /**
   * Clear position overrides for all messages inside a control structure
   */
  private clearStructureMessagePositions(structure: any): void {
    const messages: any[] = [];

    if ('statements' in structure) {
      messages.push(...structure.statements.filter((s: any) => 'sender' in s && 'receiver' in s));
    } else if ('branches' in structure) {
      structure.branches.forEach((branch: any) => {
        messages.push(...branch.statements.filter((s: any) => 'sender' in s && 'receiver' in s));
      });
    }

    // Clear messageKey-based positions for all messages in the structure
    messages.forEach(msg => {
      const messageKey = `${msg.sender}-${msg.receiver}-${msg.text || ''}`;
      this.messagePositions.delete(messageKey as any);
    });
  }

  /**
   * Update which messages are contained in a structure based on bounds
   */
  private updateStructureContainment(structureIndex: number): void {
    const statements = this.model.getStatements();
    const structure = statements[structureIndex];

    if (!structure || !('type' in structure) || !(structure as any).bounds) return;

    const bounds = (structure as any).bounds;

    // Keep existing messages in structure
    let existingMessages: any[] = [];
    if ('statements' in structure) {
      existingMessages = [...(structure as any).statements];
    } else if ('branches' in structure && (structure as any).branches.length > 0) {
      existingMessages = [...(structure as any).branches[0].statements];
    }

    const messagesToRemove: number[] = [];

    // Find all top-level messages that should be in this structure
    statements.forEach((stmt, index) => {
      if (index === structureIndex) return; // Skip self
      // Skip structures (only process messages)
      if ('type' in stmt && stmt.type) return;

      if ('sender' in stmt && 'receiver' in stmt) {
        const message = stmt as any;
        // Get message Y position - could be stored by index or by message key
        let messageY = this.messagePositions.get(index);
        if (messageY === undefined) {
          // Try to get by message key (for messages that have been dragged)
          const messageKey = MessagePositionUtils.generateMessageKey(message);
          messageY = this.messagePositions.get(messageKey as any);
        }

        if (messageY !== undefined) {
          // Get participant positions for both sender and receiver
          const senderPos = this.participantPositions.get(message.sender);
          const receiverPos = this.participantPositions.get(message.receiver);

          if (senderPos && receiverPos) {
            // Calculate message endpoints X coordinates
            const endpoints = CoordinateUtils.getMessageEndpoints(
              senderPos,
              receiverPos,
              this.PARTICIPANT_WIDTH
            );

            // Check if BOTH endpoints are fully inside the structure bounds
            const isFullyInside = GeometryUtils.isLineInBounds(
              { fromX: endpoints.fromX, toX: endpoints.toX, y: messageY },
              bounds,
              { top: 25, bottom: 10, left: 0, right: 0 }
            );

            if (isFullyInside) {
              // Check if not already in structure
              const alreadyExists = existingMessages.some((msg: any) =>
                msg.sender === stmt.sender && msg.receiver === stmt.receiver && msg.text === stmt.text
              );

              if (!alreadyExists) {
                existingMessages.push(stmt);
                messagesToRemove.push(index);
              }
            }
          }
        }
      }
    });

    // Only update if there are changes
    if (messagesToRemove.length > 0) {
      // Batch all model changes to trigger only one render at the end
      this.model.batchChanges(() => {
        // Update structure's statements with both existing and new messages
        if ('statements' in structure) {
          (structure as any).statements = existingMessages;
        } else if ('branches' in structure && (structure as any).branches.length > 0) {
          (structure as any).branches[0].statements = existingMessages;
        }

        // Remove messages from top level (in reverse order to maintain indices)
        messagesToRemove.reverse().forEach(index => {
          if (index !== structureIndex) {
            this.model.removeStatement(index);
          }
        });
      });
      // render() will be called automatically once after all batched changes
    }
  }

  /**
   * Check if a message should be moved into or out of control structures
   * @param messageData The message data including message object, Y coordinate, and parent structure
   */
  updateMessageContainment(messageData: { message: any; y: number; parentStructure: any }): void {
    const { message, y: messageY } = messageData;
    const statements = this.model.getStatements();

    if (!message || !('sender' in message)) return;

    // Find which structure (if any) should contain this message based on full containment
    let targetStructure: any = null;

    // Get participant positions for both sender and receiver
    const senderPos = this.participantPositions.get(message.sender);
    const receiverPos = this.participantPositions.get(message.receiver);

    if (senderPos && receiverPos) {
      // Calculate message endpoints X coordinates
      const endpoints = CoordinateUtils.getMessageEndpoints(
        senderPos,
        receiverPos,
        this.PARTICIPANT_WIDTH
      );

      statements.forEach((stmt) => {
        if ('type' in stmt && stmt.type && (stmt as any).bounds) {
          const bounds = (stmt as any).bounds;

          // Check if BOTH endpoints are fully inside the structure bounds
          const isFullyInside = GeometryUtils.isLineInBounds(
            { fromX: endpoints.fromX, toX: endpoints.toX, y: messageY },
            bounds,
            { top: 25, bottom: 10, left: 0, right: 0 }
          );

          if (isFullyInside) {
            targetStructure = stmt;
          }
        }
      });
    }

    // Check if message is currently in a structure or at top level
    let currentLocation: { type: 'top-level' | 'structure'; structure?: any; index?: number } | null = null;

    // Check top-level
    const topLevelIndex = statements.findIndex((s: any) =>
      'sender' in s && s.sender === message.sender && s.receiver === message.receiver && s.text === message.text
    );

    if (topLevelIndex !== -1) {
      currentLocation = { type: 'top-level', index: topLevelIndex };
    } else {
      // Check inside structures
      statements.forEach((stmt) => {
        if ('type' in stmt && stmt.type) {
          if ('statements' in stmt) {
            const msgIndex = (stmt as any).statements.findIndex((s: any) =>
              s.sender === message.sender && s.receiver === message.receiver && s.text === message.text
            );
            if (msgIndex !== -1) {
              currentLocation = { type: 'structure', structure: stmt };
            }
          } else if ('branches' in stmt) {
            (stmt as any).branches.forEach((branch: any) => {
              const msgIndex = branch.statements.findIndex((s: any) =>
                s.sender === message.sender && s.receiver === message.receiver && s.text === message.text
              );
              if (msgIndex !== -1) {
                currentLocation = { type: 'structure', structure: stmt };
              }
            });
          }
        }
      });
    }

    if (!currentLocation) return;

    // Determine if we need to move the message
    if (targetStructure && currentLocation.type === 'top-level') {
      // Move from top-level to structure
      const messageKey = `${message.sender}-${message.receiver}-${message.text || ''}`;

      // Convert absolute Y position to relative offset from structure top
      const relativeOffset = messageY - (targetStructure as any).bounds.y;
      this.messagePositions.set(messageKey as any, relativeOffset);

      // Insert message at the correct position based on Y coordinate
      if ('statements' in targetStructure) {
        this.insertMessageAtCorrectPosition(targetStructure, message, messageY, 'statements');
      } else if ('branches' in targetStructure && (targetStructure as any).branches.length > 0) {
        this.insertMessageAtCorrectPosition(targetStructure.branches[0], message, messageY, 'statements');
      }

      // Clear index-based position
      const indexToRemove = currentLocation.index!;
      this.messagePositions.delete(indexToRemove);

      // Batch model changes to trigger only one render
      this.model.batchChanges(() => {
        this.model.removeStatement(indexToRemove);

        // Update the structure in model to persist the new order
        const structureIndex = statements.findIndex(s => s === targetStructure);
        if (structureIndex !== -1) {
          this.model.updateStatement(structureIndex, targetStructure);
        }
      });

    } else if (!targetStructure && currentLocation.type === 'structure') {
      // Move from structure to top-level
      const sourceStructure = currentLocation.structure;
      const messageKey = `${message.sender}-${message.receiver}-${message.text || ''}`;

      if ('statements' in sourceStructure) {
        const msgIndex = (sourceStructure as any).statements.findIndex((s: any) =>
          s.sender === message.sender && s.receiver === message.receiver && s.text === message.text
        );
        if (msgIndex !== -1) {
          (sourceStructure as any).statements.splice(msgIndex, 1);

          // Find correct position to insert based on Y coordinate
          let insertIndex = 0;
          for (let i = 0; i < statements.length; i++) {
            const pos = this.messagePositions.get(i);
            if (pos && pos < messageY) {
              insertIndex = i + 1;
            }
          }

          this.model.addStatement(message, insertIndex);
          // Clear object-based position and set index-based position
          this.messagePositions.delete(messageKey as any);
          this.messagePositions.set(insertIndex, messageY);
        }
      } else if ('branches' in sourceStructure) {
        (sourceStructure as any).branches.forEach((branch: any) => {
          const msgIndex = branch.statements.findIndex((s: any) =>
            s.sender === message.sender && s.receiver === message.receiver && s.text === message.text
          );
          if (msgIndex !== -1) {
            branch.statements.splice(msgIndex, 1);

            let insertIndex = 0;
            for (let i = 0; i < statements.length; i++) {
              const pos = this.messagePositions.get(i);
              if (pos && pos < messageY) {
                insertIndex = i + 1;
              }
            }

            this.model.addStatement(message, insertIndex);
            // Clear object-based position and set index-based position
            this.messagePositions.delete(messageKey as any);
            this.messagePositions.set(insertIndex, messageY);
          }
        });
      }

    } else if (targetStructure && currentLocation.type === 'structure' && targetStructure !== currentLocation.structure) {
      // Move from one structure to another
      const sourceStructure = currentLocation.structure;
      const messageKey = `${message.sender}-${message.receiver}-${message.text || ''}`;
      this.messagePositions.set(messageKey as any, messageY);

      // Remove from source
      if ('statements' in sourceStructure) {
        const msgIndex = (sourceStructure as any).statements.findIndex((s: any) =>
          s.sender === message.sender && s.receiver === message.receiver && s.text === message.text
        );
        if (msgIndex !== -1) {
          (sourceStructure as any).statements.splice(msgIndex, 1);
        }
      }

      // Insert to target at correct position based on Y coordinate
      if ('statements' in targetStructure) {
        this.insertMessageAtCorrectPosition(targetStructure, message, messageY, 'statements');
      } else if ('branches' in targetStructure && (targetStructure as any).branches.length > 0) {
        this.insertMessageAtCorrectPosition(targetStructure.branches[0], message, messageY, 'statements');
      }

      // Batch model changes to trigger only one render
      this.model.batchChanges(() => {
        // Update both structures in model
        const sourceIndex = statements.findIndex(s => s === sourceStructure);
        const targetIndex = statements.findIndex(s => s === targetStructure);
        if (sourceIndex !== -1) {
          this.model.updateStatement(sourceIndex, sourceStructure);
        }
        if (targetIndex !== -1) {
          this.model.updateStatement(targetIndex, targetStructure);
        }
      });
    } else if (targetStructure && currentLocation.type === 'structure' && targetStructure === currentLocation.structure) {
      // Message stays in the same structure but position changed
      // Reorder messages in the structure based on Y coordinate
      const messageKey = `${message.sender}-${message.receiver}-${message.text || ''}`;

      // BUGFIX: Convert absolute Y to relative offset from structure top
      const relativeOffset = messageY - (targetStructure as any).bounds.y;
      this.messagePositions.set(messageKey as any, relativeOffset);

      // Reorder the messages array based on Y positions
      this.reorderMessagesInStructure(targetStructure);

      // Update the structure in the model to persist the new order
      const structureIndex = statements.findIndex(s => s === targetStructure);
      if (structureIndex !== -1) {
        this.model.updateStatement(structureIndex, targetStructure);
      }
    } else if (!targetStructure && currentLocation.type === 'top-level') {
      // Message stays at top-level but position changed
      // Position is already updated by updateMessagePosition(), which calls render()
      // This is a visual-only change, no model update needed
      return; // Early return, no render needed (already rendered by updateMessagePosition)
    }

    // All other branches modify the model, which triggers automatic render via Observer pattern
    // No explicit render() call needed
  }

  /**
   * Insert a message at the correct position in a structure based on Y coordinate
   */
  private insertMessageAtCorrectPosition(
    container: any,
    message: any,
    messageY: number,
    arrayKey: string
  ): void {
    if (!container[arrayKey]) {
      container[arrayKey] = [];
    }

    const messages = container[arrayKey].filter((s: any) => 'sender' in s && 'receiver' in s);
    const nonMessages = container[arrayKey].filter((s: any) => !('sender' in s && 'receiver' in s));

    if (messages.length === 0) {
      // No messages yet, just add it
      container[arrayKey] = [message, ...nonMessages];
      return;
    }

    // Get the structure bounds to calculate relative positions
    let structureBounds: any = null;
    if (container.bounds) {
      structureBounds = container.bounds;
    } else if (container !== null && typeof container === 'object') {
      // Try to find bounds in parent
      const statements = this.model.getStatements();
      for (const stmt of statements) {
        if (stmt === container || (stmt as any).branches?.includes(container)) {
          structureBounds = (stmt as any).bounds;
          break;
        }
      }
    }

    // Find the correct insertion index
    let insertIndex = 0;
    for (let i = 0; i < messages.length; i++) {
      const existingMsg = messages[i];
      const existingKey = `${existingMsg.sender}-${existingMsg.receiver}-${existingMsg.text || ''}`;
      const existingY = this.messagePositions.get(existingKey as any);

      let existingDefaultY = 0;
      if (structureBounds) {
        existingDefaultY = structureBounds.y + 40 + i * this.MESSAGE_SPACING;
      }

      const existingFinalY = existingY !== undefined ? existingY : existingDefaultY;

      if (messageY < existingFinalY) {
        insertIndex = i;
        break;
      } else {
        insertIndex = i + 1;
      }
    }

    // Insert the message at the correct position
    messages.splice(insertIndex, 0, message);
    container[arrayKey] = [...messages, ...nonMessages];
  }

  /**
   * Reorder messages in a structure based on their Y positions
   */
  private reorderMessagesInStructure(structure: any): void {
    if (!structure.bounds) return;

    let messages: any[] = [];

    if ('statements' in structure) {
      messages = structure.statements.filter((s: any) => 'sender' in s && 'receiver' in s);
    } else if ('branches' in structure && structure.branches.length > 0) {
      messages = structure.branches[0].statements.filter((s: any) => 'sender' in s && 'receiver' in s);
    }

    if (messages.length === 0) return;

    // Get Y positions for all messages
    const messagesWithY = messages.map((msg, index) => {
      const messageKey = `${msg.sender}-${msg.receiver}-${msg.text || ''}`;
      const y = this.messagePositions.get(messageKey as any);

      // If no explicit Y position, calculate default position
      let defaultY = structure.bounds.y + 40 + index * this.MESSAGE_SPACING;

      return {
        message: msg,
        y: y !== undefined ? y : defaultY
      };
    });

    // Sort by Y position
    messagesWithY.sort((a, b) => a.y - b.y);

    // Update the structure with reordered messages
    const reorderedMessages = messagesWithY.map(item => item.message);

    if ('statements' in structure) {
      // Get non-message statements
      const nonMessages = structure.statements.filter((s: any) => !('sender' in s && 'receiver' in s));
      // Set reordered messages only
      structure.statements = [...reorderedMessages, ...nonMessages];
    } else if ('branches' in structure && structure.branches.length > 0) {
      const nonMessages = structure.branches[0].statements.filter((s: any) => !('sender' in s && 'receiver' in s));
      structure.branches[0].statements = [...reorderedMessages, ...nonMessages];
    }
  }

  /**
   * Get message positions map for external use
   */
  getMessagePositions(): Map<number, number> {
    return this.messagePositions;
  }

  /**
   * Get participant positions for external use (for hit testing)
   */
  getParticipantPositions(): Map<string, Point> {
    return this.participantPositions;
  }

  /**
   * Get layout constants for external use
   */
  getLayoutConstants() {
    return {
      PARTICIPANT_WIDTH: this.PARTICIPANT_WIDTH,
      PARTICIPANT_HEIGHT: this.PARTICIPANT_HEIGHT,
      PARTICIPANT_SPACING: this.PARTICIPANT_SPACING,
      MESSAGE_SPACING: this.MESSAGE_SPACING,
      MARGIN_TOP: this.MARGIN_TOP,
      MARGIN_LEFT: this.MARGIN_LEFT
    };
  }

  /**
   * Get all elements (for selection detection)
   */
  getElements(): DraggableElement[] {
    return this.elements;
  }

  render(): void {
    this.elements = [];

    // Clear canvas
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    this.ctx.clearRect(0, 0, width, height);

    // Draw background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);

    // Re-initialize positions for new participants
    this.initializePositions();

    // Draw participants and lifelines
    this.drawParticipants();

    // Draw control structures (loop, alt, opt, etc.)
    this.drawControlStructures();

    // Draw messages
    this.drawMessages();

    // Draw notes
    this.drawNotes();

    // Draw edge handles for selected message
    this.drawEdgeHandles();
  }

  private drawParticipants(): void {
    const participants = this.model.getOrderedParticipants();

    participants.forEach(participant => {
      const pos = this.participantPositions.get(participant.id);
      if (!pos) return;

      // Draw participant box
      const isActor = participant.type === 'actor';

      this.ctx.save();

      // Box
      this.ctx.fillStyle = isActor ? '#e8f5e9' : '#e3f2fd';
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 2;

      this.ctx.fillRect(pos.x, pos.y, this.PARTICIPANT_WIDTH, this.PARTICIPANT_HEIGHT);
      this.ctx.strokeRect(pos.x, pos.y, this.PARTICIPANT_WIDTH, this.PARTICIPANT_HEIGHT);

      // Text
      this.ctx.fillStyle = '#000000';
      this.ctx.font = '14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      const label = participant.label || participant.id;
      const lines = label.split('<br/>');

      lines.forEach((line, index) => {
        const yOffset = (index - (lines.length - 1) / 2) * 18;
        this.ctx.fillText(
          line,
          pos.x + this.PARTICIPANT_WIDTH / 2,
          pos.y + this.PARTICIPANT_HEIGHT / 2 + yOffset,
          this.PARTICIPANT_WIDTH - 10
        );
      });

      this.ctx.restore();

      // Add to draggable elements
      this.elements.push({
        type: 'participant',
        id: participant.id,
        bounds: {
          x: pos.x,
          y: pos.y,
          width: this.PARTICIPANT_WIDTH,
          height: this.PARTICIPANT_HEIGHT
        },
        data: participant
      });

      // Draw lifeline
      this.drawLifeline(participant.id, pos);
    });
  }

  private drawLifeline(_participantId: string, pos: Point): void {
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    this.ctx.save();
    this.ctx.strokeStyle = '#666666';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);

    const x = pos.x + this.PARTICIPANT_WIDTH / 2;
    const startY = pos.y + this.PARTICIPANT_HEIGHT;
    const endY = height - 50;

    this.ctx.beginPath();
    this.ctx.moveTo(x, startY);
    this.ctx.lineTo(x, endY);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawMessages(): void {
    const statements = this.model.getStatements();
    this.drawMessagesRecursive(statements, 0, null, 0);
  }

  private drawMessagesRecursive(statements: any[], messageOffset: number, parentStructure: any, topLevelIndex: number): number {
    let messageIndex = messageOffset;
    let currentTopLevelIndex = topLevelIndex;

    statements.forEach((statement, index) => {
      if ('sender' in statement && 'receiver' in statement) {
        const message = statement as Message;
        this.drawMessage(message, index, messageIndex, parentStructure);
        messageIndex++;
      } else if ('type' in statement && statement.type) {
        // Store the top-level statement index in the structure object for later reference
        const structureWithIndex = { ...statement, _topLevelStatementIndex: currentTopLevelIndex };

        // Recursively draw messages in control structures
        if (statement.statements) {
          messageIndex = this.drawMessagesRecursive(statement.statements, messageIndex, structureWithIndex, currentTopLevelIndex);
        } else if (statement.branches) {
          statement.branches.forEach((branch: any) => {
            messageIndex = this.drawMessagesRecursive(branch.statements, messageIndex, structureWithIndex, currentTopLevelIndex);
          });
        }
        currentTopLevelIndex++;
      }
    });

    return messageIndex;
  }

  private drawMessage(message: Message, statementIndex: number, messageIndex: number, parentStructure: any): void {
    const senderPos = this.participantPositions.get(message.sender);
    const receiverPos = this.participantPositions.get(message.receiver);

    if (!senderPos || !receiverPos) return;

    // Calculate Y position based on whether message is in a structure or at top level
    let y: number;
    if (parentStructure && parentStructure.bounds) {
      // Message is inside a control structure
      // Get the CURRENT bounds of the structure (not the old bounds from parentStructure)
      const currentStructureBounds = this.findCurrentStructureBounds(parentStructure);
      const structureBounds = currentStructureBounds || parentStructure.bounds;

      // First check if message has been dragged (stored with object key as relative offset)
      const messageKey = MessagePositionUtils.generateMessageKey(message);
      const draggedOffset = this.messagePositions.get(messageKey as any);

      console.log('[Renderer] Drawing message in structure:', {
        messageText: message.text,
        messageKey,
        draggedOffset,
        structureBounds,
        currentStructureBounds,
        parentStructureBounds: parentStructure.bounds
      });

      if (draggedOffset !== undefined) {
        // Use stored offset relative to structure bounds
        y = CoordinateUtils.toAbsoluteY(draggedOffset, structureBounds);
        console.log('[Renderer] Using draggedOffset:', draggedOffset, '-> Y:', y);
      } else {
        // Use default position relative to structure
        const messagesInStructure = parentStructure.statements ||
                                     (parentStructure.branches && parentStructure.branches[0]?.statements) || [];
        const messageIndexInStructure = messagesInStructure.findIndex((m: any) =>
          m.sender === message.sender && m.receiver === message.receiver && m.text === message.text
        );

        y = MessagePositionUtils.calculateStructureMessageY(
          structureBounds,
          messageIndexInStructure,
          40,
          this.MESSAGE_SPACING
        );
        console.log('[Renderer] Using default position - index:', messageIndexInStructure, '-> Y:', y);
      }
    } else {
      // Message is at top level
      y = this.messagePositions.get(statementIndex) ||
          (this.MARGIN_TOP + this.PARTICIPANT_HEIGHT + 50 + messageIndex * this.MESSAGE_SPACING);
    }

    const endpoints = CoordinateUtils.getMessageEndpoints(
      senderPos,
      receiverPos,
      this.PARTICIPANT_WIDTH
    );
    const fromX = endpoints.fromX;
    const toX = endpoints.toX;

    this.ctx.save();

    // Line style based on arrow type
    const isDashed = message.arrow.includes('--');
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;

    if (isDashed) {
      this.ctx.setLineDash([5, 3]);
    }

    // Draw line
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, y);
    this.ctx.lineTo(toX, y);
    this.ctx.stroke();

    // Draw arrowhead
    this.drawArrowhead(message.arrow, toX, y, fromX < toX);

    // Draw message text
    if (message.text) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 4;

      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'bottom';

      const lines = message.text.split('<br/>');
      lines.forEach((line, index) => {
        const textY = y - 5 - (lines.length - 1 - index) * 15;
        this.ctx.strokeText(line, (fromX + toX) / 2, textY);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillText(line, (fromX + toX) / 2, textY);
      });
    }

    this.ctx.restore();

    // Add to elements for dragging
    const minX = Math.min(fromX, toX);
    const maxX = Math.max(fromX, toX);
    this.elements.push({
      type: 'message',
      id: `message-${statementIndex}-${message.sender}-${message.receiver}`,
      bounds: {
        x: minX,
        y: y - 10,
        width: maxX - minX,
        height: 20
      },
      data: { message, index: statementIndex, parentStructure, y }
    });
  }

  private drawArrowhead(arrowType: string, x: number, y: number, pointsRight: boolean): void {
    const size = 10;
    const direction = pointsRight ? 1 : -1;

    this.ctx.save();
    this.ctx.fillStyle = '#000000';

    if (arrowType.includes('>>')) {
      // Filled arrowhead
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x - size * direction, y - size / 2);
      this.ctx.lineTo(x - size * direction, y + size / 2);
      this.ctx.closePath();
      this.ctx.fill();
    } else if (arrowType.includes('-x') || arrowType.includes('--x')) {
      // X mark
      this.ctx.strokeStyle = '#ff0000';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x - size / 2, y - size / 2);
      this.ctx.lineTo(x + size / 2, y + size / 2);
      this.ctx.moveTo(x - size / 2, y + size / 2);
      this.ctx.lineTo(x + size / 2, y - size / 2);
      this.ctx.stroke();
    } else if (arrowType.includes(')')) {
      // Open arrowhead
      this.ctx.beginPath();
      this.ctx.moveTo(x - size * direction, y - size / 2);
      this.ctx.lineTo(x, y);
      this.ctx.lineTo(x - size * direction, y + size / 2);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawControlStructures(): void {
    const statements = this.model.getStatements();
    let messageIndex = 0;

    // Clear bounds cache before redrawing
    this.controlStructureBounds.clear();

    statements.forEach((statement, index) => {
      if ('type' in statement && statement.type) {
        this.drawControlStructure(statement as any, index, messageIndex);
      }

      // Count messages to track vertical position
      if ('sender' in statement && 'receiver' in statement) {
        messageIndex++;
      }
    });
  }

  /**
   * Draw branch dividers for alt/par structures
   */
  private drawBranchDividers(structure: any, x: number, y: number, width: number, height: number, labelHeight: number): void {
    if (!structure.branches || structure.branches.length <= 1) return;

    const branchCount = structure.branches.length;
    const branchHeight = (height - labelHeight) / branchCount;

    this.ctx.save();
    this.ctx.strokeStyle = '#9e9e9e';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 3]);

    // Draw divider lines between branches
    for (let i = 1; i < branchCount; i++) {
      const dividerY = y + labelHeight + i * branchHeight;
      this.ctx.beginPath();
      this.ctx.moveTo(x, dividerY);
      this.ctx.lineTo(x + width, dividerY);
      this.ctx.stroke();
    }

    // Draw branch labels
    this.ctx.setLineDash([]);
    this.ctx.fillStyle = '#f5f5f5';
    this.ctx.font = '11px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    structure.branches.forEach((branch: any, i: number) => {
      const branchY = y + labelHeight + i * branchHeight;
      let branchLabel = '';

      if (structure.type === 'alt') {
        if (i === 0) {
          branchLabel = `[${branch.condition || 'if'}]`;
        } else {
          branchLabel = `[${branch.condition || 'else'}]`;
        }
      } else if (structure.type === 'par') {
        branchLabel = `[${branch.label || `branch ${i + 1}`}]`;
      }

      // Draw label background
      const labelWidth = this.ctx.measureText(branchLabel).width + 10;
      this.ctx.fillStyle = '#f5f5f5';
      this.ctx.fillRect(x + 5, branchY + 3, labelWidth, 16);

      // Draw label text
      this.ctx.fillStyle = '#666666';
      this.ctx.fillText(branchLabel, x + 10, branchY + 5);
    });

    this.ctx.restore();
  }

  private drawControlStructure(structure: any, index: number, _messageOffset: number): void {
    // Use bounds from structure if available
    let x: number, y: number, width: number, height: number;

    if (structure.bounds) {
      x = structure.bounds.x;
      y = structure.bounds.y;
      width = structure.bounds.width;
      height = structure.bounds.height;
    } else {
      // Fallback: calculate from participants and message count
      const participants = this.model.getOrderedParticipants();
      const minX = this.MARGIN_LEFT - 30;
      const maxX = participants.length > 0
        ? this.MARGIN_LEFT + (participants.length - 1) * this.PARTICIPANT_SPACING + this.PARTICIPANT_WIDTH + 30
        : 300;

      // Count messages before this structure
      const allStatements = this.model.getStatements();
      let messageCount = 0;
      for (let i = 0; i < index; i++) {
        if ('sender' in allStatements[i]) {
          messageCount++;
        }
      }

      const baseY = this.MARGIN_TOP + this.PARTICIPANT_HEIGHT + 50;
      const minY = baseY + messageCount * this.MESSAGE_SPACING - 20;

      // Count messages in structure
      let innerMessageCount = 0;
      if (structure.statements) {
        structure.statements.forEach((stmt: any) => {
          if ('sender' in stmt) innerMessageCount++;
        });
      } else if (structure.branches) {
        structure.branches.forEach((branch: any) => {
          branch.statements.forEach((stmt: any) => {
            if ('sender' in stmt) innerMessageCount++;
          });
        });
      }

      x = minX;
      y = minY;
      width = maxX - minX;
      height = Math.max(innerMessageCount * this.MESSAGE_SPACING, 60) + 40;
    }

    this.ctx.save();

    // Draw structure box
    this.ctx.strokeStyle = '#9e9e9e';
    this.ctx.lineWidth = 2;
    this.ctx.fillStyle = 'rgba(158, 158, 158, 0.05)';

    this.ctx.fillRect(x, y, width, height);
    this.ctx.strokeRect(x, y, width, height);

    // Draw label box
    const labelHeight = 25;
    this.ctx.fillStyle = '#f5f5f5';
    this.ctx.fillRect(x, y, 100, labelHeight);
    this.ctx.strokeRect(x, y, 100, labelHeight);

    // Draw label text
    this.ctx.fillStyle = '#000000';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';

    let labelText = '';
    if (structure.type === 'loop') {
      labelText = `loop [${structure.label}]`;
    } else if (structure.type === 'alt') {
      labelText = `alt [${structure.branches[0]?.condition || ''}]`;
    } else if (structure.type === 'opt') {
      labelText = `opt [${structure.condition}]`;
    } else if (structure.type === 'par') {
      labelText = `par [${structure.branches[0]?.label || ''}]`;
    } else if (structure.type === 'critical') {
      labelText = `critical [${structure.action}]`;
    } else if (structure.type === 'break') {
      labelText = `break [${structure.description}]`;
    }

    this.ctx.fillText(labelText, x + 5, y + labelHeight / 2, 90);

    // Draw branch dividers for alt/par structures
    if (structure.type === 'alt' || structure.type === 'par') {
      this.drawBranchDividers(structure, x, y, width, height, labelHeight);
    }

    // Draw resize handles at corners
    const handleSize = 8;
    this.ctx.fillStyle = '#2196f3';

    // Bottom-right handle
    this.ctx.fillRect(x + width - handleSize, y + height - handleSize, handleSize, handleSize);

    // Bottom-left handle
    this.ctx.fillRect(x, y + height - handleSize, handleSize, handleSize);

    // Top-right handle
    this.ctx.fillRect(x + width - handleSize, y, handleSize, handleSize);

    // Top-left handle
    this.ctx.fillRect(x, y, handleSize, handleSize);

    this.ctx.restore();

    // Cache the bounds for this control structure
    this.controlStructureBounds.set(index, { x, y, width, height });

    // Add to elements for interaction
    this.elements.push({
      type: 'controlStructure',
      id: `control-${index}`,
      bounds: { x, y, width, height },
      data: { structure, index }
    });
  }

  private drawNotes(): void {
    const statements = this.model.getStatements();

    statements.forEach((statement, index) => {
      if ('position' in statement && 'text' in statement && !('sender' in statement)) {
        const note = statement as Note;
        this.drawNote(note, index);
      }
    });
  }

  private drawNote(note: Note, index: number): void {
    if (note.participants.length === 0) return;

    const participantPos = this.participantPositions.get(note.participants[0]);
    if (!participantPos) return;

    const noteWidth = 150;
    const noteHeight = 60;

    // Check if note has been dragged
    let x: number;
    let y: number;
    const savedPosition = this.notePositions.get(index);

    if (savedPosition) {
      // Use saved position
      x = savedPosition.x;
      y = savedPosition.y;
    } else {
      // Calculate default position
      // Find approximate Y position (based on statement index)
      const statements = this.model.getStatements();
      let yOffset = 0;
      for (let i = 0; i < index; i++) {
        if ('sender' in statements[i]) {
          yOffset += this.MESSAGE_SPACING;
        }
      }

      y = this.MARGIN_TOP + this.PARTICIPANT_HEIGHT + 50 + yOffset;

      // Calculate X position based on note position
      if (note.position === 'left') {
        x = participantPos.x - noteWidth - 20;
      } else if (note.position === 'right') {
        x = participantPos.x + this.PARTICIPANT_WIDTH + 20;
      } else {
        // over
        x = participantPos.x + this.PARTICIPANT_WIDTH / 2 - noteWidth / 2;
      }
    }

    this.ctx.save();

    // Draw note box
    this.ctx.fillStyle = '#fffde7';
    this.ctx.strokeStyle = '#f57f17';
    this.ctx.lineWidth = 2;

    this.ctx.fillRect(x, y, noteWidth, noteHeight);
    this.ctx.strokeRect(x, y, noteWidth, noteHeight);

    // Draw text
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const lines = note.text.split('<br/>');
    lines.forEach((line, lineIndex) => {
      const yOffset = (lineIndex - (lines.length - 1) / 2) * 16;
      this.ctx.fillText(
        line,
        x + noteWidth / 2,
        y + noteHeight / 2 + yOffset,
        noteWidth - 10
      );
    });

    this.ctx.restore();

    // Add to elements
    this.elements.push({
      type: 'note',
      id: `note-${index}`,
      bounds: { x, y, width: noteWidth, height: noteHeight },
      data: { note, index }
    });
  }

  dispose(): void {
    window.removeEventListener('resize', () => this.resizeCanvas());
  }

  // Edge reconnection support
  setSelectedMessage(message: Message | null, index: number | null): void {
    if (message && index !== null) {
      // Find the message element to get its y position
      // Match by both index and message content to handle messages inside structures
      const element = this.elements.find(
        el => el.type === 'message' &&
              el.data.message.sender === message.sender &&
              el.data.message.receiver === message.receiver &&
              el.data.message.text === message.text
      );
      if (element) {
        this.selectedMessage = {
          message,
          index,
          y: element.data.y
        };
      }
    } else {
      this.selectedMessage = null;
    }
    this.render();
  }

  getSelectedMessage(): { message: Message; index: number; y: number } | null {
    return this.selectedMessage;
  }

  private drawEdgeHandles(): void {
    if (!this.selectedMessage) return;

    const { message, y } = this.selectedMessage;
    const senderPos = this.participantPositions.get(message.sender);
    const receiverPos = this.participantPositions.get(message.receiver);

    if (!senderPos || !receiverPos) return;

    const fromX = senderPos.x + this.PARTICIPANT_WIDTH / 2;
    const toX = receiverPos.x + this.PARTICIPANT_WIDTH / 2;
    const handleRadius = 8;

    this.ctx.save();

    // Draw start handle
    this.ctx.beginPath();
    this.ctx.arc(fromX, y, handleRadius, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#3498db';
    this.ctx.fill();
    this.ctx.strokeStyle = '#2980b9';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw end handle
    this.ctx.beginPath();
    this.ctx.arc(toX, y, handleRadius, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#3498db';
    this.ctx.fill();
    this.ctx.strokeStyle = '#2980b9';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.restore();
  }
}
