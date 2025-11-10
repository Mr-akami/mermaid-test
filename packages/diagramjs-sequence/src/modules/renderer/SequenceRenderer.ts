/**
 * SequenceRenderer - Custom renderer for sequence diagram elements
 */

import { create, attr, append, classes } from 'tiny-svg';
import type { Canvas, EventBus, Shape, Connection } from 'diagram-js';
import type { ParticipantElement, MessageElement, NoteElement, BlockElement, ArrowType } from '../../types/sequence';

const PARTICIPANT_WIDTH = 100;
const PARTICIPANT_HEIGHT = 40;
const ACTOR_WIDTH = 60;
const ACTOR_HEIGHT = 70;
const NOTE_WIDTH = 120;
const NOTE_HEIGHT = 60;
const MESSAGE_Y_SPACING = 60;
const LIFELINE_Y_START = 50;

export default class SequenceRenderer {
  static $inject = ['eventBus', 'canvas'];

  constructor(
    private eventBus: EventBus,
    private canvas: Canvas
  ) {
    this.init();
  }

  private init() {
    this.eventBus.on('render.shape', 1500, (evt: any) => {
      const { element, gfx } = evt;

      if (this.canRender(element)) {
        return this.drawShape(gfx, element);
      }
    });

    this.eventBus.on('render.connection', 1500, (evt: any) => {
      const { element, gfx } = evt;

      if (this.canRender(element)) {
        return this.drawConnection(gfx, element);
      }
    });
  }

  canRender(element: any): boolean {
    return element.type === 'participant' ||
           element.type === 'actor' ||
           element.type === 'message' ||
           element.type === 'note' ||
           element.type === 'lifeline' ||
           element.type === 'loop' ||
           element.type === 'alt' ||
           element.type === 'opt' ||
           element.type === 'par' ||
           element.type === 'critical' ||
           element.type === 'break' ||
           element.type === 'rect' ||
           element.type === 'box';
  }

  drawShape(gfx: SVGElement, element: Shape): SVGElement {
    const type = element.type;

    if (type === 'participant') {
      return this.drawParticipant(gfx, element as ParticipantElement);
    } else if (type === 'actor') {
      return this.drawActor(gfx, element as ParticipantElement);
    } else if (type === 'note') {
      return this.drawNote(gfx, element as NoteElement);
    } else if (type === 'lifeline') {
      return this.drawLifeline(gfx, element);
    } else if (['loop', 'alt', 'opt', 'par', 'critical', 'break', 'rect', 'box'].includes(type)) {
      return this.drawBlock(gfx, element as BlockElement);
    }

    return gfx;
  }

  drawConnection(gfx: SVGElement, element: Connection): SVGElement {
    if (element.type === 'message') {
      return this.drawMessage(gfx, element as any);
    }
    return gfx;
  }

  private drawParticipant(gfx: SVGElement, element: ParticipantElement): SVGElement {
    const rect = create('rect');
    const { businessObject } = element;

    attr(rect, {
      x: 0,
      y: 0,
      width: PARTICIPANT_WIDTH,
      height: PARTICIPANT_HEIGHT,
      rx: 5,
      ry: 5,
      fill: '#fff',
      stroke: '#000',
      'stroke-width': 2
    });

    append(gfx, rect);

    // Add label
    const text = create('text');
    const label = businessObject?.label || businessObject?.id || '';

    attr(text, {
      x: PARTICIPANT_WIDTH / 2,
      y: PARTICIPANT_HEIGHT / 2,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      'font-family': 'Arial, sans-serif',
      'font-size': '12px',
      fill: '#000'
    });

    text.textContent = label;
    append(gfx, text);

    classes(gfx).add('participant');

    return gfx;
  }

  private drawActor(gfx: SVGElement, element: ParticipantElement): SVGElement {
    const g = create('g');
    const { businessObject } = element;

    // Draw stick figure
    // Head
    const head = create('circle');
    attr(head, {
      cx: ACTOR_WIDTH / 2,
      cy: 15,
      r: 8,
      fill: 'none',
      stroke: '#000',
      'stroke-width': 2
    });
    append(g, head);

    // Body
    const body = create('line');
    attr(body, {
      x1: ACTOR_WIDTH / 2,
      y1: 23,
      x2: ACTOR_WIDTH / 2,
      y2: 45,
      stroke: '#000',
      'stroke-width': 2
    });
    append(g, body);

    // Arms
    const arms = create('line');
    attr(arms, {
      x1: ACTOR_WIDTH / 2 - 15,
      y1: 32,
      x2: ACTOR_WIDTH / 2 + 15,
      y2: 32,
      stroke: '#000',
      'stroke-width': 2
    });
    append(g, arms);

    // Left leg
    const leftLeg = create('line');
    attr(leftLeg, {
      x1: ACTOR_WIDTH / 2,
      y1: 45,
      x2: ACTOR_WIDTH / 2 - 10,
      y2: 60,
      stroke: '#000',
      'stroke-width': 2
    });
    append(g, leftLeg);

    // Right leg
    const rightLeg = create('line');
    attr(rightLeg, {
      x1: ACTOR_WIDTH / 2,
      y1: 45,
      x2: ACTOR_WIDTH / 2 + 10,
      y2: 60,
      stroke: '#000',
      'stroke-width': 2
    });
    append(g, rightLeg);

    append(gfx, g);

    // Add label below
    const text = create('text');
    const label = businessObject?.label || businessObject?.id || '';

    attr(text, {
      x: ACTOR_WIDTH / 2,
      y: ACTOR_HEIGHT - 5,
      'text-anchor': 'middle',
      'font-family': 'Arial, sans-serif',
      'font-size': '12px',
      fill: '#000'
    });

    text.textContent = label;
    append(gfx, text);

    classes(gfx).add('actor');

    return gfx;
  }

  private drawLifeline(gfx: SVGElement, element: any): SVGElement {
    const line = create('line');

    attr(line, {
      x1: 0,
      y1: 0,
      x2: 0,
      y2: element.height || 400,
      stroke: '#000',
      'stroke-width': 1,
      'stroke-dasharray': '5,5'
    });

    append(gfx, line);
    classes(gfx).add('lifeline');

    return gfx;
  }

  private drawMessage(gfx: SVGElement, element: MessageElement): SVGElement {
    const { waypoints, businessObject } = element;
    if (!waypoints || waypoints.length < 2) return gfx;

    const start = waypoints[0];
    const end = waypoints[waypoints.length - 1];
    const arrowType = businessObject?.arrowType || '->>';

    // Determine line style
    const isDashed = arrowType.includes('--');

    // Draw line
    const line = create('line');
    attr(line, {
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      stroke: '#000',
      'stroke-width': 2,
      ...(isDashed && { 'stroke-dasharray': '5,5' })
    });
    append(gfx, line);

    // Draw arrowhead
    this.drawArrowhead(gfx, start, end, arrowType);

    // Add message text
    if (businessObject?.text) {
      const text = create('text');
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2 - 5;

      attr(text, {
        x: midX,
        y: midY,
        'text-anchor': 'middle',
        'font-family': 'Arial, sans-serif',
        'font-size': '11px',
        fill: '#000'
      });

      text.textContent = businessObject.text;
      append(gfx, text);
    }

    classes(gfx).add('message');

    return gfx;
  }

  private drawArrowhead(gfx: SVGElement, start: any, end: any, arrowType: ArrowType): void {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    const arrowSize = 8;

    // Check arrow type
    if (arrowType === '->' || arrowType === '-->') {
      // No arrowhead
      return;
    }

    if (arrowType === '-x' || arrowType === '--x') {
      // X marker
      const x1 = end.x - arrowSize * Math.cos(angle + Math.PI / 4);
      const y1 = end.y - arrowSize * Math.sin(angle + Math.PI / 4);
      const x2 = end.x - arrowSize * Math.cos(angle - Math.PI / 4);
      const y2 = end.y - arrowSize * Math.sin(angle - Math.PI / 4);

      const cross1 = create('line');
      attr(cross1, {
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        stroke: '#000',
        'stroke-width': 2
      });
      append(gfx, cross1);

      const cross2 = create('line');
      attr(cross2, {
        x1: x1,
        y1: y2,
        x2: x2,
        y2: y1,
        stroke: '#000',
        'stroke-width': 2
      });
      append(gfx, cross2);

      return;
    }

    if (arrowType === '-)' || arrowType === '--)') {
      // Open arrowhead
      const x1 = end.x - arrowSize * Math.cos(angle - Math.PI / 6);
      const y1 = end.y - arrowSize * Math.sin(angle - Math.PI / 6);
      const x2 = end.x - arrowSize * Math.cos(angle + Math.PI / 6);
      const y2 = end.y - arrowSize * Math.sin(angle + Math.PI / 6);

      const path = create('path');
      attr(path, {
        d: `M ${x1} ${y1} L ${end.x} ${end.y} L ${x2} ${y2}`,
        fill: 'none',
        stroke: '#000',
        'stroke-width': 2
      });
      append(gfx, path);

      return;
    }

    // Regular arrowhead (solid or both ends)
    const drawArrow = (atEnd: boolean) => {
      const point = atEnd ? end : start;
      const dir = atEnd ? angle : angle + Math.PI;

      const x1 = point.x - arrowSize * Math.cos(dir - Math.PI / 6);
      const y1 = point.y - arrowSize * Math.sin(dir - Math.PI / 6);
      const x2 = point.x - arrowSize * Math.cos(dir + Math.PI / 6);
      const y2 = point.y - arrowSize * Math.sin(dir + Math.PI / 6);

      const path = create('path');
      attr(path, {
        d: `M ${x1} ${y1} L ${point.x} ${point.y} L ${x2} ${y2} Z`,
        fill: '#000',
        stroke: '#000',
        'stroke-width': 1
      });
      append(gfx, path);
    };

    // Both ends arrows
    if (arrowType === '<<->>' || arrowType === '<<-->>') {
      drawArrow(true);
      drawArrow(false);
    } else {
      // Single arrow at end
      drawArrow(true);
    }
  }

  private drawNote(gfx: SVGElement, element: NoteElement): SVGElement {
    const cornerSize = 10;

    // Main rectangle
    const rect = create('rect');
    attr(rect, {
      x: 0,
      y: 0,
      width: NOTE_WIDTH - cornerSize,
      height: NOTE_HEIGHT,
      fill: '#ffffcc',
      stroke: '#000',
      'stroke-width': 1
    });
    append(gfx, rect);

    // Folded corner
    const path = create('path');
    attr(path, {
      d: `M ${NOTE_WIDTH - cornerSize} 0 L ${NOTE_WIDTH - cornerSize} ${cornerSize} L ${NOTE_WIDTH} ${cornerSize} Z`,
      fill: '#f0f0c0',
      stroke: '#000',
      'stroke-width': 1
    });
    append(gfx, path);

    // Note text
    if (element.businessObject?.text) {
      const text = create('text');
      attr(text, {
        x: NOTE_WIDTH / 2,
        y: NOTE_HEIGHT / 2,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        'font-family': 'Arial, sans-serif',
        'font-size': '11px',
        fill: '#000'
      });

      text.textContent = element.businessObject.text;
      append(gfx, text);
    }

    classes(gfx).add('note');

    return gfx;
  }

  private drawBlock(gfx: SVGElement, element: BlockElement): SVGElement {
    const { businessObject, width = 200, height = 100 } = element;
    const headerHeight = 25;

    // Main rectangle
    const rect = create('rect');
    const fillColor = businessObject?.color ||
                     (element.type === 'rect' ? 'rgba(200, 200, 200, 0.3)' : 'transparent');

    attr(rect, {
      x: 0,
      y: 0,
      width: width,
      height: height,
      fill: fillColor,
      stroke: '#000',
      'stroke-width': 1,
      rx: 3,
      ry: 3
    });
    append(gfx, rect);

    // Header for blocks (not rect)
    if (element.type !== 'rect' && element.type !== 'box') {
      const headerRect = create('rect');
      attr(headerRect, {
        x: 0,
        y: 0,
        width: width,
        height: headerHeight,
        fill: 'rgba(200, 200, 200, 0.5)',
        stroke: '#000',
        'stroke-width': 1
      });
      append(gfx, headerRect);

      // Label
      const label = businessObject?.label || element.type;
      const text = create('text');
      attr(text, {
        x: 10,
        y: headerHeight / 2,
        'dominant-baseline': 'middle',
        'font-family': 'Arial, sans-serif',
        'font-size': '11px',
        'font-weight': 'bold',
        fill: '#000'
      });

      text.textContent = `[${element.type}] ${label}`;
      append(gfx, text);
    }

    classes(gfx).add('block');
    classes(gfx).add(element.type);

    return gfx;
  }

  getShapePath(shape: Shape): string {
    const type = shape.type;

    if (type === 'participant') {
      return this.getRectPath(shape);
    } else if (type === 'actor') {
      return this.getRectPath(shape);
    } else if (type === 'note') {
      return this.getRectPath(shape);
    } else if (['loop', 'alt', 'opt', 'par', 'critical', 'break', 'rect', 'box'].includes(type)) {
      return this.getRectPath(shape);
    }

    return '';
  }

  private getRectPath(shape: Shape): string {
    const { x = 0, y = 0, width = 100, height = 40 } = shape;
    return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
  }
}

export const SequenceRendererModule = {
  __init__: ['sequenceRenderer'],
  sequenceRenderer: ['type', SequenceRenderer]
};
