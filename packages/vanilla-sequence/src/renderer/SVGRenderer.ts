import { Diagram } from '../models/Diagram';
import { Participant } from '../models/Participant';
import { Message } from '../models/Message';

// レイアウト定数
const LAYOUT = {
  PARTICIPANT_WIDTH: 120,
  PARTICIPANT_HEIGHT: 40,
  PARTICIPANT_MARGIN: 60,
  MESSAGE_VERTICAL_SPACING: 60,
  LIFELINE_TOP_MARGIN: 60,
  ACTIVATION_WIDTH: 10,
  NOTE_WIDTH: 140,
  NOTE_HEIGHT: 60,
  BLOCK_PADDING: 10,
  BLOCK_HEADER_HEIGHT: 30,
};

export class SVGRenderer {
  private svg: SVGSVGElement;
  private diagram: Diagram;
  private participantPositions: Map<string, { x: number; y: number }> = new Map();
  private yOffset: number = 50;

  constructor(container: HTMLElement, diagram: Diagram) {
    this.diagram = diagram;
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.style.border = '1px solid #ccc';
    container.appendChild(this.svg);
  }

  render(): void {
    // SVGをクリア
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild);
    }

    // participantの位置を計算
    this.calculateParticipantPositions();

    // 描画順序
    this.renderBlocks();
    this.renderLifelines();
    this.renderParticipants();
    this.renderMessages();
    this.renderNotes();
    this.renderActivations();

    // SVGサイズを調整
    this.adjustSVGSize();
  }

  private calculateParticipantPositions(): void {
    const participants = this.diagram.getParticipantsInOrder();
    let xOffset = 100;

    participants.forEach((participant) => {
      this.participantPositions.set(participant.id, {
        x: xOffset,
        y: this.yOffset,
      });
      participant.setPosition(xOffset, this.yOffset);
      xOffset += LAYOUT.PARTICIPANT_WIDTH + LAYOUT.PARTICIPANT_MARGIN;
    });
  }

  private renderParticipants(): void {
    this.diagram.getParticipantsInOrder().forEach(participant => {
      const pos = this.participantPositions.get(participant.id);
      if (!pos) return;

      const group = this.createSVGElement('g');
      group.setAttribute('data-participant-id', participant.id);
      group.setAttribute('class', 'participant');

      if (participant.type === 'actor') {
        this.renderActor(group, pos.x, pos.y, participant);
      } else {
        this.renderParticipantBox(group, pos.x, pos.y, participant);
      }

      this.svg.appendChild(group);
    });
  }

  private renderParticipantBox(group: SVGGElement, x: number, y: number, participant: Participant): void {
    const rect = this.createSVGElement('rect');
    rect.setAttribute('x', (x - LAYOUT.PARTICIPANT_WIDTH / 2).toString());
    rect.setAttribute('y', y.toString());
    rect.setAttribute('width', LAYOUT.PARTICIPANT_WIDTH.toString());
    rect.setAttribute('height', LAYOUT.PARTICIPANT_HEIGHT.toString());
    rect.setAttribute('fill', '#e1f5fe');
    rect.setAttribute('stroke', '#01579b');
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('rx', '5');
    group.appendChild(rect);

    const text = this.createSVGElement('text');
    text.setAttribute('x', x.toString());
    text.setAttribute('y', (y + LAYOUT.PARTICIPANT_HEIGHT / 2 + 5).toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '14');
    text.setAttribute('fill', '#000');
    text.textContent = this.parseMultiline(participant.getDisplayName())[0]; // 簡易版
    group.appendChild(text);
  }

  private renderActor(group: SVGGElement, x: number, y: number, participant: Participant): void {
    // 簡易的な人型アイコン
    const head = this.createSVGElement('circle');
    head.setAttribute('cx', x.toString());
    head.setAttribute('cy', (y + 10).toString());
    head.setAttribute('r', '8');
    head.setAttribute('fill', '#fff');
    head.setAttribute('stroke', '#01579b');
    head.setAttribute('stroke-width', '2');
    group.appendChild(head);

    const body = this.createSVGElement('line');
    body.setAttribute('x1', x.toString());
    body.setAttribute('y1', (y + 18).toString());
    body.setAttribute('x2', x.toString());
    body.setAttribute('y2', (y + 30).toString());
    body.setAttribute('stroke', '#01579b');
    body.setAttribute('stroke-width', '2');
    group.appendChild(body);

    const text = this.createSVGElement('text');
    text.setAttribute('x', x.toString());
    text.setAttribute('y', (y + 45).toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '12');
    text.textContent = participant.getDisplayName();
    group.appendChild(text);
  }

  private renderLifelines(): void {
    const maxY = this.calculateMaxY();

    this.diagram.getParticipantsInOrder().forEach(participant => {
      const pos = this.participantPositions.get(participant.id);
      if (!pos) return;

      const line = this.createSVGElement('line');
      line.setAttribute('x1', pos.x.toString());
      line.setAttribute('y1', (pos.y + LAYOUT.LIFELINE_TOP_MARGIN).toString());
      line.setAttribute('x2', pos.x.toString());
      line.setAttribute('y2', maxY.toString());
      line.setAttribute('stroke', '#999');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-dasharray', '5,5');
      line.setAttribute('class', 'lifeline');
      this.svg.appendChild(line);
    });
  }

  private renderMessages(): void {
    let currentY = this.yOffset + LAYOUT.LIFELINE_TOP_MARGIN + LAYOUT.MESSAGE_VERTICAL_SPACING;

    this.diagram.messages.forEach(message => {
      const fromPos = this.participantPositions.get(message.from);
      const toPos = this.participantPositions.get(message.to);
      if (!fromPos || !toPos) return;

      message.position = { x: fromPos.x, y: currentY };

      const group = this.createSVGElement('g');
      group.setAttribute('data-message-id', message.id);
      group.setAttribute('class', 'message');

      this.renderArrow(group, fromPos.x, currentY, toPos.x, currentY, message.arrowType);

      // メッセージテキスト
      if (message.text) {
        const text = this.createSVGElement('text');
        const midX = (fromPos.x + toPos.x) / 2;
        text.setAttribute('x', midX.toString());
        text.setAttribute('y', (currentY - 5).toString());
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '12');
        text.setAttribute('fill', '#000');
        text.textContent = message.text;
        group.appendChild(text);
      }

      this.svg.appendChild(group);
      currentY += LAYOUT.MESSAGE_VERTICAL_SPACING;
    });
  }

  private renderArrow(
    group: SVGGElement,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    arrowType: string
  ): void {
    const isDashed = arrowType.includes('--');
    const hasArrow = arrowType.includes('>');
    const hasCross = arrowType.includes('x');
    const hasOpenArrow = arrowType.includes(')');
    const hasBothEnds = arrowType.includes('<<');

    const line = this.createSVGElement('line');
    line.setAttribute('x1', x1.toString());
    line.setAttribute('y1', y1.toString());
    line.setAttribute('x2', x2.toString());
    line.setAttribute('y2', y2.toString());
    line.setAttribute('stroke', '#000');
    line.setAttribute('stroke-width', '2');
    if (isDashed) {
      line.setAttribute('stroke-dasharray', '5,5');
    }
    group.appendChild(line);

    // 矢印の向き
    const direction = x2 > x1 ? 1 : -1;

    // 矢印ヘッド（右側）
    if (hasArrow) {
      this.addArrowhead(group, x2, y2, direction);
    }
    if (hasCross) {
      this.addCross(group, x2, y2);
    }
    if (hasOpenArrow) {
      this.addOpenArrowhead(group, x2, y2, direction);
    }

    // 両端の場合、左側にも矢印
    if (hasBothEnds) {
      this.addArrowhead(group, x1, y1, -direction);
    }
  }

  private addArrowhead(group: SVGGElement, x: number, y: number, direction: number): void {
    const arrowSize = 8;
    const polygon = this.createSVGElement('polygon');
    const points = [
      `${x},${y}`,
      `${x - direction * arrowSize},${y - arrowSize / 2}`,
      `${x - direction * arrowSize},${y + arrowSize / 2}`,
    ].join(' ');
    polygon.setAttribute('points', points);
    polygon.setAttribute('fill', '#000');
    group.appendChild(polygon);
  }

  private addOpenArrowhead(group: SVGGElement, x: number, y: number, direction: number): void {
    const arrowSize = 8;
    const path = this.createSVGElement('path');
    const d = `M ${x - direction * arrowSize} ${y - arrowSize / 2} L ${x} ${y} L ${x - direction * arrowSize} ${y + arrowSize / 2}`;
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#000');
    path.setAttribute('stroke-width', '2');
    group.appendChild(path);
  }

  private addCross(group: SVGGElement, x: number, y: number): void {
    const size = 6;
    const line1 = this.createSVGElement('line');
    line1.setAttribute('x1', (x - size).toString());
    line1.setAttribute('y1', (y - size).toString());
    line1.setAttribute('x2', (x + size).toString());
    line1.setAttribute('y2', (y + size).toString());
    line1.setAttribute('stroke', '#f00');
    line1.setAttribute('stroke-width', '2');
    group.appendChild(line1);

    const line2 = this.createSVGElement('line');
    line2.setAttribute('x1', (x - size).toString());
    line2.setAttribute('y1', (y + size).toString());
    line2.setAttribute('x2', (x + size).toString());
    line2.setAttribute('y2', (y - size).toString());
    line2.setAttribute('stroke', '#f00');
    line2.setAttribute('stroke-width', '2');
    group.appendChild(line2);
  }

  private renderNotes(): void {
    this.diagram.notes.forEach(note => {
      const group = this.createSVGElement('g');
      group.setAttribute('data-note-id', note.id);
      group.setAttribute('class', 'note');

      // ノートの位置を計算
      let x = 0;
      let y = 0;

      if (note.participants.length === 1) {
        const pos = this.participantPositions.get(note.participants[0]);
        if (pos) {
          x = note.position === 'left of' ? pos.x - LAYOUT.NOTE_WIDTH - 20 : pos.x + 20;
          // Y座標はorderから計算
          y = this.yOffset + LAYOUT.LIFELINE_TOP_MARGIN + note.order * LAYOUT.MESSAGE_VERTICAL_SPACING;
        }
      } else if (note.participants.length > 1) {
        const pos1 = this.participantPositions.get(note.participants[0]);
        const pos2 = this.participantPositions.get(note.participants[1]);
        if (pos1 && pos2) {
          x = (pos1.x + pos2.x) / 2 - LAYOUT.NOTE_WIDTH / 2;
          y = this.yOffset + LAYOUT.LIFELINE_TOP_MARGIN + note.order * LAYOUT.MESSAGE_VERTICAL_SPACING;
        }
      }

      note.renderPosition = { x, y };

      const rect = this.createSVGElement('rect');
      rect.setAttribute('x', x.toString());
      rect.setAttribute('y', y.toString());
      rect.setAttribute('width', LAYOUT.NOTE_WIDTH.toString());
      rect.setAttribute('height', LAYOUT.NOTE_HEIGHT.toString());
      rect.setAttribute('fill', '#ffffcc');
      rect.setAttribute('stroke', '#000');
      rect.setAttribute('stroke-width', '1');
      group.appendChild(rect);

      const text = this.createSVGElement('text');
      text.setAttribute('x', (x + 10).toString());
      text.setAttribute('y', (y + 20).toString());
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#000');
      text.textContent = note.text;
      group.appendChild(text);

      this.svg.appendChild(group);
    });
  }

  private renderActivations(): void {
    this.diagram.activations.forEach(activation => {
      const pos = this.participantPositions.get(activation.participantId);
      if (!pos) return;

      const startY = this.yOffset + LAYOUT.LIFELINE_TOP_MARGIN + activation.startOrder * LAYOUT.MESSAGE_VERTICAL_SPACING;
      const endY = this.yOffset + LAYOUT.LIFELINE_TOP_MARGIN + activation.endOrder * LAYOUT.MESSAGE_VERTICAL_SPACING;

      const rect = this.createSVGElement('rect');
      rect.setAttribute('x', (pos.x - LAYOUT.ACTIVATION_WIDTH / 2 + activation.nestLevel * 5).toString());
      rect.setAttribute('y', startY.toString());
      rect.setAttribute('width', LAYOUT.ACTIVATION_WIDTH.toString());
      rect.setAttribute('height', (endY - startY).toString());
      rect.setAttribute('fill', '#fff');
      rect.setAttribute('stroke', '#000');
      rect.setAttribute('stroke-width', '1');
      rect.setAttribute('class', 'activation');
      this.svg.appendChild(rect);
    });
  }

  private renderBlocks(): void {
    this.diagram.blocks.forEach(block => {
      const group = this.createSVGElement('g');
      group.setAttribute('data-block-id', block.id);
      group.setAttribute('class', `block block-${block.type}`);

      const startY = this.yOffset + LAYOUT.LIFELINE_TOP_MARGIN + block.startOrder * LAYOUT.MESSAGE_VERTICAL_SPACING - LAYOUT.BLOCK_PADDING;
      const endY = this.yOffset + LAYOUT.LIFELINE_TOP_MARGIN + block.endOrder * LAYOUT.MESSAGE_VERTICAL_SPACING + LAYOUT.BLOCK_PADDING;

      // ブロックの幅は全participantにまたがる
      const minX = Math.min(...Array.from(this.participantPositions.values()).map(p => p.x)) - LAYOUT.PARTICIPANT_WIDTH / 2 - 20;
      const maxX = Math.max(...Array.from(this.participantPositions.values()).map(p => p.x)) + LAYOUT.PARTICIPANT_WIDTH / 2 + 20;

      const rect = this.createSVGElement('rect');
      rect.setAttribute('x', minX.toString());
      rect.setAttribute('y', startY.toString());
      rect.setAttribute('width', (maxX - minX).toString());
      rect.setAttribute('height', (endY - startY).toString());
      rect.setAttribute('fill', block.color ? this.colorToString(block.color) : 'rgba(200, 200, 200, 0.2)');
      rect.setAttribute('stroke', '#666');
      rect.setAttribute('stroke-width', '1');
      group.appendChild(rect);

      // ブロックラベル
      const labelRect = this.createSVGElement('rect');
      labelRect.setAttribute('x', minX.toString());
      labelRect.setAttribute('y', startY.toString());
      labelRect.setAttribute('width', '100');
      labelRect.setAttribute('height', LAYOUT.BLOCK_HEADER_HEIGHT.toString());
      labelRect.setAttribute('fill', 'rgba(150, 150, 150, 0.3)');
      group.appendChild(labelRect);

      const labelText = this.createSVGElement('text');
      labelText.setAttribute('x', (minX + 5).toString());
      labelText.setAttribute('y', (startY + 18).toString());
      labelText.setAttribute('font-size', '12');
      labelText.setAttribute('font-weight', 'bold');
      labelText.textContent = `${block.type}: ${block.label}`;
      group.appendChild(labelText);

      this.svg.appendChild(group);
    });
  }

  private calculateMaxY(): number {
    const messageCount = this.diagram.messages.length + this.diagram.notes.length;
    return this.yOffset + LAYOUT.LIFELINE_TOP_MARGIN + (messageCount + 2) * LAYOUT.MESSAGE_VERTICAL_SPACING;
  }

  private adjustSVGSize(): void {
    const maxY = this.calculateMaxY();
    const participants = this.diagram.getParticipantsInOrder();
    const maxX = participants.length > 0
      ? Math.max(...Array.from(this.participantPositions.values()).map(p => p.x)) + LAYOUT.PARTICIPANT_WIDTH + 100
      : 800;

    this.svg.setAttribute('viewBox', `0 0 ${maxX} ${maxY}`);
  }

  private createSVGElement(tag: string): any {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
  }

  private parseMultiline(text: string): string[] {
    return text.split('<br/>').map(s => s.trim());
  }

  private colorToString(color: { r: number; g: number; b: number; a?: number }): string {
    if (color.a !== undefined) {
      return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
    }
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  }

  getSVGElement(): SVGSVGElement {
    return this.svg;
  }

  getParticipantAt(x: number, y: number): Participant | null {
    for (const [id, pos] of this.participantPositions.entries()) {
      const halfWidth = LAYOUT.PARTICIPANT_WIDTH / 2;
      if (x >= pos.x - halfWidth && x <= pos.x + halfWidth &&
          y >= pos.y && y <= pos.y + LAYOUT.PARTICIPANT_HEIGHT) {
        return this.diagram.getParticipant(id) || null;
      }
    }
    return null;
  }

  getMessageAt(x: number, y: number): Message | null {
    const threshold = 10;
    for (const message of this.diagram.messages) {
      if (Math.abs(y - message.position.y) < threshold) {
        const fromPos = this.participantPositions.get(message.from);
        const toPos = this.participantPositions.get(message.to);
        if (fromPos && toPos) {
          const minX = Math.min(fromPos.x, toPos.x);
          const maxX = Math.max(fromPos.x, toPos.x);
          if (x >= minX && x <= maxX) {
            return message;
          }
        }
      }
    }
    return null;
  }
}
