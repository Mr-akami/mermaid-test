import type { ArrowType, Position } from '../types';

export class Message {
  id: string;
  from: string; // participant id
  to: string;   // participant id
  arrowType: ArrowType;
  text: string;
  order: number; // 時系列順序
  position: Position;

  // activation shorthand
  activateFrom: boolean = false;
  activateTo: boolean = false;
  deactivateFrom: boolean = false;
  deactivateTo: boolean = false;

  constructor(from: string, to: string, arrowType: ArrowType, text: string = '') {
    this.id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.from = from;
    this.to = to;
    this.arrowType = arrowType;
    this.text = text;
    this.order = 0;
    this.position = { x: 0, y: 0 };
  }

  setText(text: string) {
    this.text = text;
  }

  setArrowType(arrowType: ArrowType) {
    this.arrowType = arrowType;
  }

  setOrder(order: number) {
    this.order = order;
  }
}
