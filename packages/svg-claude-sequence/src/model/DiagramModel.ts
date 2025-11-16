import type {
  SequenceDiagram,
  Participant,
  Message,
  Note,
  ControlStructure,
  Box,
  DiagramConfig,
  ParticipantType,
  ArrowType,
  NotePosition
} from './types';

export class DiagramModel {
  private diagram: SequenceDiagram;
  private listeners: Set<() => void> = new Set();
  private selectedElementId: string | null = null;

  constructor() {
    this.diagram = {
      participants: [],
      messages: [],
      notes: [],
      activations: [],
      controlStructures: [],
      boxes: [],
      config: this.getDefaultConfig()
    };
  }

  private getDefaultConfig(): DiagramConfig {
    return {
      autonumber: false,
      mirrorActors: true,
      diagramMarginX: 50,
      diagramMarginY: 10,
      boxTextMargin: 5,
      noteMargin: 10,
      messageMargin: 35,
      actorFontSize: 14,
      noteFontSize: 14,
      messageFontSize: 16
    };
  }

  // Event listeners
  addListener(listener: () => void): void {
    this.listeners.add(listener);
  }

  removeListener(listener: () => void): void {
    this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  // Getters
  getDiagram(): SequenceDiagram {
    return this.diagram;
  }

  getSelectedElementId(): string | null {
    return this.selectedElementId;
  }

  setSelectedElementId(id: string | null): void {
    this.selectedElementId = id;
    this.notify();
  }

  // Participant operations
  addParticipant(type: ParticipantType, x: number, y: number): Participant {
    const order = this.diagram.participants.length;
    const participant: Participant = {
      id: `p${Date.now()}`,
      type,
      x,
      y,
      order
    };
    this.diagram.participants.push(participant);
    this.notify();
    return participant;
  }

  updateParticipant(id: string, updates: Partial<Participant>): void {
    const participant = this.diagram.participants.find(p => p.id === id);
    if (participant) {
      Object.assign(participant, updates);
      this.notify();
    }
  }

  moveParticipant(id: string, x: number, y: number): void {
    const participant = this.diagram.participants.find(p => p.id === id);
    if (participant) {
      participant.x = x;
      participant.y = y;
      this.notify();
    }
  }

  deleteParticipant(id: string): void {
    this.diagram.participants = this.diagram.participants.filter(p => p.id !== id);
    // Also remove related messages, notes, etc.
    this.diagram.messages = this.diagram.messages.filter(
      m => m.from !== id && m.to !== id
    );
    this.diagram.notes = this.diagram.notes.filter(
      n => !n.participants.includes(id)
    );
    this.notify();
  }

  getParticipantById(id: string): Participant | undefined {
    return this.diagram.participants.find(p => p.id === id);
  }

  // Message operations
  addMessage(from: string, to: string, arrowType: ArrowType, y: number): Message {
    const order = this.getNextSequenceOrder();
    const message: Message = {
      id: `m${Date.now()}`,
      from,
      to,
      arrowType,
      text: '',
      y,
      order
    };
    this.diagram.messages.push(message);
    this.notify();
    return message;
  }

  updateMessage(id: string, updates: Partial<Message>): void {
    const message = this.diagram.messages.find(m => m.id === id);
    if (message) {
      Object.assign(message, updates);
      this.notify();
    }
  }

  moveMessage(id: string, y: number): void {
    const message = this.diagram.messages.find(m => m.id === id);
    if (message) {
      message.y = y;
      // Update order based on y position
      this.reorderElements();
      this.notify();
    }
  }

  deleteMessage(id: string): void {
    this.diagram.messages = this.diagram.messages.filter(m => m.id !== id);
    this.notify();
  }

  getMessageById(id: string): Message | undefined {
    return this.diagram.messages.find(m => m.id === id);
  }

  // Note operations
  addNote(position: NotePosition, participants: string[], y: number): Note {
    const order = this.getNextSequenceOrder();
    const note: Note = {
      id: `n${Date.now()}`,
      position,
      participants,
      text: '',
      y,
      order
    };
    this.diagram.notes.push(note);
    this.notify();
    return note;
  }

  updateNote(id: string, updates: Partial<Note>): void {
    const note = this.diagram.notes.find(n => n.id === id);
    if (note) {
      Object.assign(note, updates);
      this.notify();
    }
  }

  deleteNote(id: string): void {
    this.diagram.notes = this.diagram.notes.filter(n => n.id !== id);
    this.notify();
  }

  // Control structure operations
  addControlStructure(
    type: ControlStructure['type'],
    startOrder: number,
    endOrder: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): ControlStructure {
    const structure: ControlStructure = {
      id: `cs${Date.now()}`,
      type,
      label: '',
      startOrder,
      endOrder,
      x,
      y,
      width,
      height
    };
    this.diagram.controlStructures.push(structure);
    this.notify();
    return structure;
  }

  updateControlStructure(id: string, updates: Partial<ControlStructure>): void {
    const structure = this.diagram.controlStructures.find(cs => cs.id === id);
    if (structure) {
      Object.assign(structure, updates);
      this.notify();
    }
  }

  deleteControlStructure(id: string): void {
    this.diagram.controlStructures = this.diagram.controlStructures.filter(
      cs => cs.id !== id
    );
    this.notify();
  }

  // Box operations
  addBox(participants: string[]): Box {
    const box: Box = {
      id: `b${Date.now()}`,
      participants
    };
    this.diagram.boxes.push(box);
    this.notify();
    return box;
  }

  updateBox(id: string, updates: Partial<Box>): void {
    const box = this.diagram.boxes.find(b => b.id === id);
    if (box) {
      Object.assign(box, updates);
      this.notify();
    }
  }

  deleteBox(id: string): void {
    this.diagram.boxes = this.diagram.boxes.filter(b => b.id !== id);
    this.notify();
  }

  // Helper methods
  private getNextSequenceOrder(): number {
    const allOrders = [
      ...this.diagram.messages.map(m => m.order),
      ...this.diagram.notes.map(n => n.order)
    ];
    return allOrders.length > 0 ? Math.max(...allOrders) + 1 : 0;
  }

  private reorderElements(): void {
    // Combine messages and notes, sort by y position
    const elements = [
      ...this.diagram.messages.map(m => ({ type: 'message' as const, y: m.y, item: m })),
      ...this.diagram.notes.map(n => ({ type: 'note' as const, y: n.y, item: n }))
    ].sort((a, b) => a.y - b.y);

    // Reassign orders
    elements.forEach((el, index) => {
      el.item.order = index;
    });
  }

  // Config operations
  updateConfig(updates: Partial<DiagramConfig>): void {
    Object.assign(this.diagram.config, updates);
    this.notify();
  }

  // Get element at position
  getElementAtPosition(x: number, y: number): { type: string; id: string } | null {
    // Check participants
    for (const p of this.diagram.participants) {
      if (this.isPointInParticipant(x, y, p)) {
        return { type: 'participant', id: p.id };
      }
    }

    // Check messages
    for (const m of this.diagram.messages) {
      if (this.isPointInMessage(x, y, m)) {
        return { type: 'message', id: m.id };
      }
    }

    // Check notes
    for (const n of this.diagram.notes) {
      if (this.isPointInNote(x, y, n)) {
        return { type: 'note', id: n.id };
      }
    }

    // Check control structures
    for (const cs of this.diagram.controlStructures) {
      if (this.isPointInControlStructure(x, y, cs)) {
        return { type: 'controlStructure', id: cs.id };
      }
    }

    return null;
  }

  private isPointInParticipant(x: number, y: number, p: Participant): boolean {
    const width = 100;
    const height = 40;
    return x >= p.x && x <= p.x + width && y >= p.y && y <= p.y + height;
  }

  private isPointInMessage(x: number, y: number, m: Message): boolean {
    const fromP = this.getParticipantById(m.from);
    const toP = this.getParticipantById(m.to);
    if (!fromP || !toP) return false;

    const minX = Math.min(fromP.x, toP.x);
    const maxX = Math.max(fromP.x, toP.x) + 100;
    const hitBox = 5;

    return x >= minX && x <= maxX && y >= m.y - hitBox && y <= m.y + hitBox;
  }

  private isPointInNote(_x: number, _y: number, _n: Note): boolean {
    // Simplified check - would need actual note position calculation
    return false;
  }

  private isPointInControlStructure(x: number, y: number, cs: ControlStructure): boolean {
    return (
      x >= cs.x &&
      x <= cs.x + cs.width &&
      y >= cs.y &&
      y <= cs.y + cs.height
    );
  }
}
