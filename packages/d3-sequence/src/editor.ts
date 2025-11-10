/**
 * GUI Editor for sequence diagrams
 * Handles user interactions and diagram modifications
 */

import type {
  SequenceDiagram,
  DiagramElement,
  Message,
  Note,
  ParticipantType,
  ArrowType,
  NotePosition
} from './model';
import { addParticipant, getOrCreateParticipant } from './model';
import { exportToMermaid, parseFromMermaid } from './mermaid';
import { SequenceRenderer } from './renderer';

export interface EditorCallbacks {
  onDiagramChange?: (diagram: SequenceDiagram) => void;
  onMermaidTextChange?: (text: string) => void;
}

export class SequenceDiagramEditor {
  private diagram: SequenceDiagram;
  private renderer: SequenceRenderer;
  private callbacks: EditorCallbacks;
  private selectedElement: DiagramElement | null = null;

  constructor(
    diagram: SequenceDiagram,
    canvasContainer: HTMLElement,
    callbacks: EditorCallbacks = {}
  ) {
    this.diagram = diagram;
    this.renderer = new SequenceRenderer(canvasContainer);
    this.callbacks = callbacks;

    this.render();
  }

  /**
   * Get current diagram
   */
  getDiagram(): SequenceDiagram {
    return this.diagram;
  }

  /**
   * Set diagram from Mermaid text
   */
  setFromMermaid(text: string): void {
    try {
      this.diagram = parseFromMermaid(text);
      this.render();
      this.notifyChange();
    } catch (error) {
      console.error('Failed to parse Mermaid text:', error);
      throw error;
    }
  }

  /**
   * Get Mermaid text representation
   */
  getMermaidText(): string {
    return exportToMermaid(this.diagram);
  }

  /**
   * Add a new participant
   */
  addParticipant(
    id: string,
    type: ParticipantType = 'participant',
    label?: string
  ): void {
    addParticipant(this.diagram, id, type, label, true);
    this.render();
    this.notifyChange();
  }

  /**
   * Remove a participant
   */
  removeParticipant(id: string): void {
    this.diagram.participants.delete(id);

    // Remove messages involving this participant
    this.diagram.elements = this.diagram.elements.filter(el => {
      if (el.type === 'message') {
        const msg = el as Message;
        return msg.from !== id && msg.to !== id;
      }
      if (el.type === 'note') {
        const note = el as Note;
        return !note.actors.includes(id);
      }
      return true;
    });

    this.render();
    this.notifyChange();
  }

  /**
   * Update participant properties
   */
  updateParticipant(
    id: string,
    updates: Partial<{ type: ParticipantType; label: string }>
  ): void {
    const participant = this.diagram.participants.get(id);
    if (participant) {
      if (updates.type !== undefined) {
        participant.type = updates.type;
      }
      if (updates.label !== undefined) {
        participant.label = updates.label;
      }
      this.render();
      this.notifyChange();
    }
  }

  /**
   * Add a message
   */
  addMessage(
    from: string,
    to: string,
    arrow: ArrowType = '->>',
    text?: string
  ): void {
    // Ensure participants exist
    getOrCreateParticipant(this.diagram, from);
    getOrCreateParticipant(this.diagram, to);

    const message: Message = {
      type: 'message',
      from,
      to,
      arrow,
      text
    };

    this.diagram.elements.push(message);
    this.render();
    this.notifyChange();
  }

  /**
   * Add a note
   */
  addNote(
    position: NotePosition,
    actors: string[],
    text: string
  ): void {
    const note: Note = {
      type: 'note',
      position,
      actors,
      text
    };

    this.diagram.elements.push(note);
    this.render();
    this.notifyChange();
  }

  /**
   * Add a loop block
   */
  addLoop(label: string): void {
    this.diagram.elements.push({
      type: 'loop',
      label,
      statements: []
    });
    this.render();
    this.notifyChange();
  }

  /**
   * Add an alt block
   */
  addAlt(condition1: string, condition2: string): void {
    this.diagram.elements.push({
      type: 'alt',
      branches: [
        { condition: condition1, statements: [] },
        { condition: condition2, statements: [] }
      ]
    });
    this.render();
    this.notifyChange();
  }

  /**
   * Toggle autonumber
   */
  toggleAutonumber(): void {
    this.diagram.config.autonumber = !this.diagram.config.autonumber;
    this.render();
    this.notifyChange();
  }

  /**
   * Toggle mirror actors
   */
  toggleMirrorActors(): void {
    this.diagram.config.mirrorActors = !this.diagram.config.mirrorActors;
    this.render();
    this.notifyChange();
  }

  /**
   * Remove an element by index
   */
  removeElement(index: number): void {
    if (index >= 0 && index < this.diagram.elements.length) {
      this.diagram.elements.splice(index, 1);
      this.render();
      this.notifyChange();
    }
  }

  /**
   * Move element up in the sequence
   */
  moveElementUp(index: number): void {
    if (index > 0 && index < this.diagram.elements.length) {
      const temp = this.diagram.elements[index];
      this.diagram.elements[index] = this.diagram.elements[index - 1];
      this.diagram.elements[index - 1] = temp;
      this.render();
      this.notifyChange();
    }
  }

  /**
   * Move element down in the sequence
   */
  moveElementDown(index: number): void {
    if (index >= 0 && index < this.diagram.elements.length - 1) {
      const temp = this.diagram.elements[index];
      this.diagram.elements[index] = this.diagram.elements[index + 1];
      this.diagram.elements[index + 1] = temp;
      this.render();
      this.notifyChange();
    }
  }

  /**
   * Clear all elements (keep participants)
   */
  clearElements(): void {
    this.diagram.elements = [];
    this.render();
    this.notifyChange();
  }

  /**
   * Clear entire diagram
   */
  clearDiagram(): void {
    this.diagram.participants.clear();
    this.diagram.elements = [];
    this.render();
    this.notifyChange();
  }

  /**
   * Render the diagram
   */
  private render(): void {
    this.renderer.render(this.diagram);
  }

  /**
   * Notify callbacks of changes
   */
  private notifyChange(): void {
    if (this.callbacks.onDiagramChange) {
      this.callbacks.onDiagramChange(this.diagram);
    }
    if (this.callbacks.onMermaidTextChange) {
      this.callbacks.onMermaidTextChange(this.getMermaidText());
    }
  }
}
