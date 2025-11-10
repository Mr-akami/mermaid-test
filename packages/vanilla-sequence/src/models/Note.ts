import type { NotePosition, Position } from '../types';

export class Note {
  id: string;
  position: NotePosition;
  participants: string[]; // participant ids
  text: string;
  order: number;
  renderPosition: Position;

  constructor(position: NotePosition, participants: string[], text: string) {
    this.id = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.position = position;
    this.participants = participants;
    this.text = text;
    this.order = 0;
    this.renderPosition = { x: 0, y: 0 };
  }

  setText(text: string) {
    this.text = text;
  }

  setPosition(position: NotePosition) {
    this.position = position;
  }
}
