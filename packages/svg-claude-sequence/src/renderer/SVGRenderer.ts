import type {
  SequenceDiagram,
  Participant,
  Message,
  Note,
  ControlStructure
} from '../model/types';

export class SVGRenderer {
  private svg: SVGSVGElement;
  private mainGroup: SVGGElement;
  private readonly PARTICIPANT_WIDTH = 100;
  private readonly PARTICIPANT_HEIGHT = 40;
  private readonly NOTE_WIDTH = 120;
  private readonly NOTE_HEIGHT = 60;

  constructor(container: HTMLElement) {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.style.border = '1px solid #ccc';
    this.svg.style.background = '#ffffff';

    this.mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.appendChild(this.mainGroup);

    container.appendChild(this.svg);
  }

  render(diagram: SequenceDiagram, selectedId: string | null): void {
    // Clear previous content
    while (this.mainGroup.firstChild) {
      this.mainGroup.removeChild(this.mainGroup.firstChild);
    }

    // Render in order: control structures (background), participants, lifelines, messages, notes
    this.renderControlStructures(diagram.controlStructures, selectedId);
    this.renderParticipants(diagram.participants, selectedId);
    this.renderLifelines(diagram.participants);
    this.renderMessages(diagram.messages, diagram.participants, selectedId);
    this.renderNotes(diagram.notes, diagram.participants, selectedId);
  }

  private renderParticipants(participants: Participant[], selectedId: string | null): void {
    participants.forEach(p => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('data-id', p.id);
      group.setAttribute('data-type', 'participant');
      group.style.cursor = 'pointer';

      if (p.type === 'participant') {
        // Rectangle
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', p.x.toString());
        rect.setAttribute('y', p.y.toString());
        rect.setAttribute('width', this.PARTICIPANT_WIDTH.toString());
        rect.setAttribute('height', this.PARTICIPANT_HEIGHT.toString());
        rect.setAttribute('fill', selectedId === p.id ? '#e3f2fd' : '#f5f5f5');
        rect.setAttribute('stroke', selectedId === p.id ? '#2196f3' : '#333');
        rect.setAttribute('stroke-width', selectedId === p.id ? '2' : '1');
        rect.setAttribute('rx', '5');
        group.appendChild(rect);
      } else {
        // Actor (stick figure)
        const actorGroup = this.createActorIcon(p.x + this.PARTICIPANT_WIDTH / 2, p.y + 5);
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('x', p.x.toString());
        bg.setAttribute('y', p.y.toString());
        bg.setAttribute('width', this.PARTICIPANT_WIDTH.toString());
        bg.setAttribute('height', this.PARTICIPANT_HEIGHT.toString());
        bg.setAttribute('fill', selectedId === p.id ? '#e3f2fd' : 'transparent');
        bg.setAttribute('stroke', selectedId === p.id ? '#2196f3' : 'transparent');
        bg.setAttribute('stroke-width', '2');
        bg.setAttribute('rx', '5');
        group.appendChild(bg);
        group.appendChild(actorGroup);
      }

      // Label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', (p.x + this.PARTICIPANT_WIDTH / 2).toString());
      text.setAttribute('y', (p.y + this.PARTICIPANT_HEIGHT - 10).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#333');
      text.textContent = p.label || p.id;
      group.appendChild(text);

      this.mainGroup.appendChild(group);
    });
  }

  private createActorIcon(cx: number, cy: number): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // Head
    const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    head.setAttribute('cx', cx.toString());
    head.setAttribute('cy', cy.toString());
    head.setAttribute('r', '5');
    head.setAttribute('fill', 'none');
    head.setAttribute('stroke', '#333');
    head.setAttribute('stroke-width', '1.5');
    group.appendChild(head);

    // Body
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    body.setAttribute('x1', cx.toString());
    body.setAttribute('y1', (cy + 5).toString());
    body.setAttribute('x2', cx.toString());
    body.setAttribute('y2', (cy + 15).toString());
    body.setAttribute('stroke', '#333');
    body.setAttribute('stroke-width', '1.5');
    group.appendChild(body);

    // Arms
    const arms = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    arms.setAttribute('x1', (cx - 6).toString());
    arms.setAttribute('y1', (cy + 10).toString());
    arms.setAttribute('x2', (cx + 6).toString());
    arms.setAttribute('y2', (cy + 10).toString());
    arms.setAttribute('stroke', '#333');
    arms.setAttribute('stroke-width', '1.5');
    group.appendChild(arms);

    // Legs
    const leftLeg = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    leftLeg.setAttribute('x1', cx.toString());
    leftLeg.setAttribute('y1', (cy + 15).toString());
    leftLeg.setAttribute('x2', (cx - 5).toString());
    leftLeg.setAttribute('y2', (cy + 23).toString());
    leftLeg.setAttribute('stroke', '#333');
    leftLeg.setAttribute('stroke-width', '1.5');
    group.appendChild(leftLeg);

    const rightLeg = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    rightLeg.setAttribute('x1', cx.toString());
    rightLeg.setAttribute('y1', (cy + 15).toString());
    rightLeg.setAttribute('x2', (cx + 5).toString());
    rightLeg.setAttribute('y2', (cy + 23).toString());
    rightLeg.setAttribute('stroke', '#333');
    rightLeg.setAttribute('stroke-width', '1.5');
    group.appendChild(rightLeg);

    return group;
  }

  private renderLifelines(participants: Participant[]): void {
    participants.forEach(p => {
      const centerX = p.x + this.PARTICIPANT_WIDTH / 2;
      const startY = p.y + this.PARTICIPANT_HEIGHT + 5;

      // Create a group for the lifeline
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('data-type', 'lifeline');
      group.setAttribute('data-participant-id', p.id);

      // Visible dashed line
      const visLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      visLine.setAttribute('x1', centerX.toString());
      visLine.setAttribute('y1', startY.toString());
      visLine.setAttribute('x2', centerX.toString());
      visLine.setAttribute('y2', '2000'); // Long lifeline
      visLine.setAttribute('stroke', '#999');
      visLine.setAttribute('stroke-width', '1');
      visLine.setAttribute('stroke-dasharray', '5,5');
      visLine.style.pointerEvents = 'none'; // Don't capture clicks on the thin line
      group.appendChild(visLine);

      // Invisible wider hit area for clicking
      const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      hitArea.setAttribute('x1', centerX.toString());
      hitArea.setAttribute('y1', startY.toString());
      hitArea.setAttribute('x2', centerX.toString());
      hitArea.setAttribute('y2', '2000');
      hitArea.setAttribute('stroke', 'transparent');
      hitArea.setAttribute('stroke-width', '20'); // Much wider for easier clicking
      hitArea.style.cursor = 'crosshair';
      group.appendChild(hitArea);

      this.mainGroup.appendChild(group);
    });
  }

  private renderMessages(
    messages: Message[],
    participants: Participant[],
    selectedId: string | null
  ): void {
    messages.forEach(m => {
      const fromP = participants.find(p => p.id === m.from);
      const toP = participants.find(p => p.id === m.to);
      if (!fromP || !toP) {
        return;
      }

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('data-id', m.id);
      group.setAttribute('data-type', 'message');
      group.style.cursor = 'pointer';

      const fromX = fromP.x + this.PARTICIPANT_WIDTH / 2;
      const toX = toP.x + this.PARTICIPANT_WIDTH / 2;

      // Arrow line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', fromX.toString());
      line.setAttribute('y1', m.y.toString());
      line.setAttribute('x2', toX.toString());
      line.setAttribute('y2', m.y.toString());
      line.setAttribute('stroke', selectedId === m.id ? '#2196f3' : '#333');
      line.setAttribute('stroke-width', selectedId === m.id ? '2' : '1.5');
      line.setAttribute('fill', 'none');
      line.style.pointerEvents = 'auto';

      // Handle different arrow types
      if (m.arrowType.includes('--')) {
        line.setAttribute('stroke-dasharray', '5,3');
      }

      group.appendChild(line);

      // Arrow head
      const direction = toX > fromX ? 1 : -1;
      if (m.arrowType.includes('>>')) {
        const arrowHead = this.createArrowHead(toX, m.y, direction);
        arrowHead.setAttribute('fill', selectedId === m.id ? '#2196f3' : '#333');
        group.appendChild(arrowHead);
      } else if (m.arrowType.includes('-x')) {
        const cross = this.createCross(toX, m.y);
        cross.setAttribute('stroke', selectedId === m.id ? '#2196f3' : '#333');
        group.appendChild(cross);
      } else if (m.arrowType.includes(')')) {
        const openArrow = this.createOpenArrowHead(toX, m.y, direction);
        openArrow.setAttribute('stroke', selectedId === m.id ? '#2196f3' : '#333');
        group.appendChild(openArrow);
      }

      // Message text
      if (m.text) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const midX = (fromX + toX) / 2;
        text.setAttribute('x', midX.toString());
        text.setAttribute('y', (m.y - 5).toString());
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '12');
        text.setAttribute('fill', '#333');
        text.textContent = m.text;
        group.appendChild(text);
      }

      this.mainGroup.appendChild(group);
    });
  }

  private createArrowHead(x: number, y: number, direction: number): SVGPolygonElement {
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const size = 6;
    const points = [
      [x, y],
      [x - size * direction, y - size / 2],
      [x - size * direction, y + size / 2]
    ];
    arrow.setAttribute('points', points.map(p => p.join(',')).join(' '));
    return arrow;
  }

  private createCross(x: number, y: number): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const size = 5;

    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('x1', (x - size).toString());
    line1.setAttribute('y1', (y - size).toString());
    line1.setAttribute('x2', (x + size).toString());
    line1.setAttribute('y2', (y + size).toString());
    line1.setAttribute('stroke-width', '2');

    const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line2.setAttribute('x1', (x - size).toString());
    line2.setAttribute('y1', (y + size).toString());
    line2.setAttribute('x2', (x + size).toString());
    line2.setAttribute('y2', (y - size).toString());
    line2.setAttribute('stroke-width', '2');

    group.appendChild(line1);
    group.appendChild(line2);
    return group;
  }

  private createOpenArrowHead(x: number, y: number, direction: number): SVGPolylineElement {
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    const size = 6;
    const points = [
      [x - size * direction, y - size / 2],
      [x, y],
      [x - size * direction, y + size / 2]
    ];
    arrow.setAttribute('points', points.map(p => p.join(',')).join(' '));
    arrow.setAttribute('fill', 'none');
    arrow.setAttribute('stroke-width', '1.5');
    return arrow;
  }

  private renderNotes(
    notes: Note[],
    participants: Participant[],
    selectedId: string | null
  ): void {
    notes.forEach(n => {
      if (n.participants.length === 0) return;

      const participant = participants.find(p => p.id === n.participants[0]);
      if (!participant) return;

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('data-id', n.id);
      group.setAttribute('data-type', 'note');
      group.style.cursor = 'pointer';

      let noteX: number;
      const participantCenterX = participant.x + this.PARTICIPANT_WIDTH / 2;

      if (n.position === 'left') {
        noteX = participantCenterX - this.NOTE_WIDTH - 10;
      } else if (n.position === 'right') {
        noteX = participantCenterX + 10;
      } else {
        // over
        noteX = participantCenterX - this.NOTE_WIDTH / 2;
      }

      // Note rectangle with folded corner
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', noteX.toString());
      rect.setAttribute('y', n.y.toString());
      rect.setAttribute('width', this.NOTE_WIDTH.toString());
      rect.setAttribute('height', this.NOTE_HEIGHT.toString());
      rect.setAttribute('fill', selectedId === n.id ? '#fff9c4' : '#fffde7');
      rect.setAttribute('stroke', selectedId === n.id ? '#f57f17' : '#f9a825');
      rect.setAttribute('stroke-width', selectedId === n.id ? '2' : '1');
      group.appendChild(rect);

      // Folded corner
      const corner = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const cornerSize = 10;
      corner.setAttribute(
        'd',
        `M ${noteX + this.NOTE_WIDTH - cornerSize} ${n.y}
         L ${noteX + this.NOTE_WIDTH} ${n.y + cornerSize}
         L ${noteX + this.NOTE_WIDTH} ${n.y} Z`
      );
      corner.setAttribute('fill', '#f9a825');
      group.appendChild(corner);

      // Note text
      if (n.text) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', (noteX + 10).toString());
        text.setAttribute('y', (n.y + 20).toString());
        text.setAttribute('font-size', '11');
        text.setAttribute('fill', '#333');

        // Handle multi-line text
        const lines = n.text.split('<br/>');
        if (lines.length > 1) {
          lines.forEach((line, i) => {
            const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            tspan.setAttribute('x', (noteX + 10).toString());
            tspan.setAttribute('dy', i === 0 ? '0' : '14');
            tspan.textContent = line;
            text.appendChild(tspan);
          });
        } else {
          text.textContent = n.text;
        }

        group.appendChild(text);
      }

      this.mainGroup.appendChild(group);
    });
  }

  private renderControlStructures(
    structures: ControlStructure[],
    selectedId: string | null
  ): void {
    structures.forEach(cs => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('data-id', cs.id);
      group.setAttribute('data-type', 'controlStructure');
      group.style.cursor = 'pointer';

      // Background rectangle
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', cs.x.toString());
      rect.setAttribute('y', cs.y.toString());
      rect.setAttribute('width', cs.width.toString());
      rect.setAttribute('height', cs.height.toString());

      if (cs.type === 'rect') {
        rect.setAttribute('fill', cs.color || 'rgba(200, 200, 200, 0.3)');
        rect.setAttribute('stroke', 'none');
      } else {
        rect.setAttribute('fill', 'rgba(240, 240, 240, 0.5)');
        rect.setAttribute('stroke', selectedId === cs.id ? '#2196f3' : '#999');
        rect.setAttribute('stroke-width', selectedId === cs.id ? '2' : '1');
        rect.setAttribute('stroke-dasharray', '5,5');
      }

      group.appendChild(rect);

      // Label box for control structures (not rect)
      if (cs.type !== 'rect') {
        const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        labelBg.setAttribute('x', cs.x.toString());
        labelBg.setAttribute('y', cs.y.toString());
        labelBg.setAttribute('width', '60');
        labelBg.setAttribute('height', '20');
        labelBg.setAttribute('fill', '#e0e0e0');
        labelBg.setAttribute('stroke', '#999');
        group.appendChild(labelBg);

        const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        labelText.setAttribute('x', (cs.x + 30).toString());
        labelText.setAttribute('y', (cs.y + 14).toString());
        labelText.setAttribute('text-anchor', 'middle');
        labelText.setAttribute('font-size', '10');
        labelText.setAttribute('font-weight', 'bold');
        labelText.setAttribute('fill', '#333');
        labelText.textContent = cs.type.toUpperCase();
        group.appendChild(labelText);

        // Structure label
        if (cs.label) {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', (cs.x + 65).toString());
          text.setAttribute('y', (cs.y + 14).toString());
          text.setAttribute('font-size', '11');
          text.setAttribute('fill', '#555');
          text.textContent = cs.label;
          group.appendChild(text);
        }
      }

      this.mainGroup.appendChild(group);
    });
  }

  getSVGElement(): SVGSVGElement {
    return this.svg;
  }

  // Convert screen coordinates to SVG coordinates
  screenToSVG(screenX: number, screenY: number): { x: number; y: number } {
    const pt = this.svg.createSVGPoint();
    pt.x = screenX;
    pt.y = screenY;
    const svgPt = pt.matrixTransform(this.svg.getScreenCTM()?.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }
}
