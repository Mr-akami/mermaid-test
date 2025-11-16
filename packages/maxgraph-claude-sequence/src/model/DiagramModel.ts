import type {
  DiagramModel,
  Participant,
  Message,
  Note,
  Box,
  ControlStructure,
} from './types';

export class SequenceDiagramModel {
  private model: DiagramModel;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.model = {
      participants: new Map(),
      messages: [],
      notes: [],
      boxes: new Map(),
      controlStructures: [],
      autoNumber: false,
    };
  }

  // Event handling
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyChange(): void {
    this.listeners.forEach(listener => listener());
  }

  // Participants
  addParticipant(participant: Participant): void {
    this.model.participants.set(participant.id, participant);
    this.notifyChange();
  }

  updateParticipant(id: string, updates: Partial<Participant>): void {
    const participant = this.model.participants.get(id);
    if (participant) {
      Object.assign(participant, updates);
      this.notifyChange();
    }
  }

  removeParticipant(id: string): void {
    this.model.participants.delete(id);
    // Remove related messages and notes
    this.model.messages = this.model.messages.filter(
      m => m.fromId !== id && m.toId !== id
    );
    this.model.notes = this.model.notes.filter(
      n => !n.participantIds.includes(id)
    );
    this.notifyChange();
  }

  getParticipant(id: string): Participant | undefined {
    return this.model.participants.get(id);
  }

  getAllParticipants(): Participant[] {
    return Array.from(this.model.participants.values());
  }

  // Messages
  addMessage(message: Message): void {
    this.model.messages.push(message);
    this.reorderMessages();
    this.notifyChange();
  }

  updateMessage(id: string, updates: Partial<Message>): void {
    const message = this.model.messages.find(m => m.id === id);
    if (message) {
      Object.assign(message, updates);
      if (updates.y !== undefined) {
        this.reorderMessages();
      }
      this.notifyChange();
    }
  }

  removeMessage(id: string): void {
    this.model.messages = this.model.messages.filter(m => m.id !== id);
    this.reorderMessages();
    this.notifyChange();
  }

  getMessage(id: string): Message | undefined {
    return this.model.messages.find(m => m.id === id);
  }

  getAllMessages(): Message[] {
    return [...this.model.messages];
  }

  private reorderMessages(): void {
    this.model.messages.sort((a, b) => a.y - b.y);
    this.model.messages.forEach((msg, index) => {
      msg.order = index;
    });
  }

  // Notes
  addNote(note: Note): void {
    this.model.notes.push(note);
    this.reorderNotes();
    this.notifyChange();
  }

  updateNote(id: string, updates: Partial<Note>): void {
    const note = this.model.notes.find(n => n.id === id);
    if (note) {
      Object.assign(note, updates);
      if (updates.y !== undefined) {
        this.reorderNotes();
      }
      this.notifyChange();
    }
  }

  removeNote(id: string): void {
    this.model.notes = this.model.notes.filter(n => n.id !== id);
    this.reorderNotes();
    this.notifyChange();
  }

  getNote(id: string): Note | undefined {
    return this.model.notes.find(n => n.id === id);
  }

  getAllNotes(): Note[] {
    return [...this.model.notes];
  }

  private reorderNotes(): void {
    this.model.notes.sort((a, b) => a.y - b.y);
    this.model.notes.forEach((note, index) => {
      note.order = index;
    });
  }

  // Boxes
  addBox(box: Box): void {
    this.model.boxes.set(box.id, box);
    this.notifyChange();
  }

  updateBox(id: string, updates: Partial<Box>): void {
    const box = this.model.boxes.get(id);
    if (box) {
      Object.assign(box, updates);
      this.notifyChange();
    }
  }

  removeBox(id: string): void {
    this.model.boxes.delete(id);
    // Clear boxId from participants
    this.model.participants.forEach(p => {
      if (p.boxId === id) {
        p.boxId = undefined;
      }
    });
    this.notifyChange();
  }

  getBox(id: string): Box | undefined {
    return this.model.boxes.get(id);
  }

  getAllBoxes(): Box[] {
    return Array.from(this.model.boxes.values());
  }

  // Control Structures
  addControlStructure(structure: ControlStructure): void {
    this.model.controlStructures.push(structure);
    this.notifyChange();
  }

  updateControlStructure(id: string, updates: Partial<ControlStructure>): void {
    const structure = this.model.controlStructures.find(s => s.id === id);
    if (structure) {
      Object.assign(structure, updates);
      this.notifyChange();
    }
  }

  removeControlStructure(id: string): void {
    this.model.controlStructures = this.model.controlStructures.filter(
      s => s.id !== id
    );
    this.notifyChange();
  }

  getControlStructure(id: string): ControlStructure | undefined {
    return this.model.controlStructures.find(s => s.id === id);
  }

  getAllControlStructures(): ControlStructure[] {
    return [...this.model.controlStructures];
  }

  // Config
  setAutoNumber(enabled: boolean): void {
    this.model.autoNumber = enabled;
    this.notifyChange();
  }

  getAutoNumber(): boolean {
    return this.model.autoNumber;
  }

  // Export/Import
  getModel(): DiagramModel {
    return this.model;
  }

  clear(): void {
    this.model = {
      participants: new Map(),
      messages: [],
      notes: [],
      boxes: new Map(),
      controlStructures: [],
      autoNumber: false,
    };
    this.notifyChange();
  }
}
