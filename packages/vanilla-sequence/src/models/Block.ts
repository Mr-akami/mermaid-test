import type { BlockType, Position, Color } from '../types';

export interface BlockSection {
  label: string;
  startOrder: number; // この section の開始位置
}

export class Block {
  id: string;
  type: BlockType;
  label: string;
  startOrder: number; // ブロック全体の開始位置
  endOrder: number;   // ブロック全体の終了位置
  sections: BlockSection[]; // alt の else, par の and, critical の option 等
  color?: Color; // rect, box 用
  description?: string; // box 用
  renderPosition: Position;
  renderHeight: number = 0;

  constructor(type: BlockType, label: string, startOrder: number, endOrder: number) {
    this.id = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.label = label;
    this.startOrder = startOrder;
    this.endOrder = endOrder;
    this.sections = [];
    this.renderPosition = { x: 0, y: 0 };
  }

  addSection(label: string, order: number) {
    this.sections.push({ label, startOrder: order });
  }

  setColor(color: Color) {
    this.color = color;
  }

  setRange(startOrder: number, endOrder: number) {
    this.startOrder = startOrder;
    this.endOrder = endOrder;
  }
}
