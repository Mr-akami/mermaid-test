import type { ParticipantType, Position, Link } from '../types';

export class Participant {
  id: string;
  type: ParticipantType;
  label?: string;
  position: Position;
  order: number; // 表示順序
  isExplicit: boolean; // 明示的定義かどうか
  links: Link[] = [];
  isCreated: boolean = false; // create構文で作成されたか
  isDestroyed: boolean = false; // destroy構文で破棄されたか

  constructor(id: string, type: ParticipantType = 'participant', isExplicit: boolean = false) {
    this.id = id;
    this.type = type;
    this.isExplicit = isExplicit;
    this.position = { x: 0, y: 0 };
    this.order = 0;
  }

  setLabel(label: string) {
    this.label = label;
  }

  setPosition(x: number, y: number) {
    this.position = { x, y };
  }

  addLink(label: string, url: string) {
    this.links.push({ label, url });
  }

  removeLink(index: number) {
    this.links.splice(index, 1);
  }

  getDisplayName(): string {
    return this.label || this.id;
  }
}
