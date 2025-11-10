/**
 * D3.js-based renderer for sequence diagrams
 */

import * as d3 from 'd3';
import type {
  SequenceDiagram,
  DiagramElement,
  Message,
  Note,
  Participant,
  Loop,
  Alt,
  Opt,
  Par,
  Rect
} from './model';

// Layout constants
const ACTOR_WIDTH = 120;
const ACTOR_HEIGHT = 40;
const ACTOR_MARGIN = 40;
const MESSAGE_HEIGHT = 50;
const ACTIVATION_WIDTH = 10;
const NOTE_WIDTH = 150;
const NOTE_HEIGHT = 60;
const BLOCK_PADDING = 20;

interface RenderContext {
  diagram: SequenceDiagram;
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  currentY: number;
  actorPositions: Map<string, number>; // actor ID -> x position
  activationStacks: Map<string, number[]>; // actor ID -> stack of activation levels
  participantOrder: string[];
}

export class SequenceRenderer {
  private container: HTMLElement;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Render a sequence diagram
   */
  render(diagram: SequenceDiagram): void {
    // Clear previous content
    d3.select(this.container).selectAll('*').remove();

    // Create SVG
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', '0 0 1200 800')
      .style('border', '1px solid #ccc')
      .style('background', 'white');

    // Create main group for zoom/pan
    const mainGroup = this.svg.append('g')
      .attr('class', 'main-group');

    // Initialize render context
    const ctx: RenderContext = {
      diagram,
      svg: this.svg,
      currentY: 100,
      actorPositions: new Map(),
      activationStacks: new Map(),
      participantOrder: []
    };

    // Calculate actor positions
    this.layoutActors(ctx);

    // Render actors (top)
    this.renderActors(ctx, mainGroup, 'top');

    // Render elements
    for (const element of diagram.elements) {
      this.renderElement(ctx, mainGroup, element);
    }

    // Render actors (bottom) if mirrorActors is enabled
    if (diagram.config.mirrorActors) {
      this.renderActors(ctx, mainGroup, 'bottom');
    }

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        mainGroup.attr('transform', event.transform.toString());
      });

    this.svg.call(zoom);
  }

  /**
   * Layout actors horizontally
   */
  private layoutActors(ctx: RenderContext): void {
    // Get participants in display order
    const participants = Array.from(ctx.diagram.participants.values())
      .sort((a, b) => {
        if (a.explicit !== b.explicit) {
          return a.explicit ? -1 : 1;
        }
        return a.order - b.order;
      });

    ctx.participantOrder = participants.map(p => p.id);

    // Calculate positions
    let x = ctx.diagram.config.diagramMarginX + ACTOR_WIDTH / 2;
    for (const p of participants) {
      ctx.actorPositions.set(p.id, x);
      ctx.activationStacks.set(p.id, []);
      x += ACTOR_WIDTH + ACTOR_MARGIN;
    }
  }

  /**
   * Render actors at top or bottom
   */
  private renderActors(
    ctx: RenderContext,
    parent: d3.Selection<SVGGElement, unknown, null, undefined>,
    position: 'top' | 'bottom'
  ): void {
    const y = position === 'top' ? 50 : ctx.currentY + 50;

    for (const id of ctx.participantOrder) {
      const participant = ctx.diagram.participants.get(id)!;
      const x = ctx.actorPositions.get(id)!;

      const actorGroup = parent.append('g')
        .attr('class', `actor actor-${position}`)
        .attr('transform', `translate(${x - ACTOR_WIDTH / 2}, ${y})`);

      if (participant.type === 'actor') {
        // Draw actor icon (simple stick figure)
        this.drawActorIcon(actorGroup);
      } else {
        // Draw participant box
        actorGroup.append('rect')
          .attr('width', ACTOR_WIDTH)
          .attr('height', ACTOR_HEIGHT)
          .attr('fill', '#e8f4f8')
          .attr('stroke', '#333')
          .attr('stroke-width', 2)
          .attr('rx', 5);
      }

      // Add label
      const label = participant.label || participant.id;
      actorGroup.append('text')
        .attr('class', 'actor-text')
        .attr('x', ACTOR_WIDTH / 2)
        .attr('y', ACTOR_HEIGHT / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .style('font-size', `${ctx.diagram.config.actorFontSize}px`)
        .style('font-family', ctx.diagram.config.actorFontFamily)
        .text(label);

      // Draw lifeline
      if (position === 'top') {
        const lifelineHeight = ctx.currentY - y + 100;
        parent.append('line')
          .attr('class', 'actor-line')
          .attr('x1', x)
          .attr('y1', y + ACTOR_HEIGHT)
          .attr('x2', x)
          .attr('y2', y + ACTOR_HEIGHT + lifelineHeight)
          .attr('stroke', '#999')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,5');
      }
    }
  }

  /**
   * Draw a simple actor icon (stick figure)
   */
  private drawActorIcon(group: d3.Selection<SVGGElement, unknown, null, undefined>): void {
    const cx = ACTOR_WIDTH / 2;
    const cy = 15;

    // Head
    group.append('circle')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', 8)
      .attr('fill', 'none')
      .attr('stroke', '#333')
      .attr('stroke-width', 2);

    // Body
    group.append('line')
      .attr('x1', cx)
      .attr('y1', cy + 8)
      .attr('x2', cx)
      .attr('y2', cy + 20)
      .attr('stroke', '#333')
      .attr('stroke-width', 2);

    // Arms
    group.append('line')
      .attr('x1', cx - 10)
      .attr('y1', cy + 15)
      .attr('x2', cx + 10)
      .attr('y2', cy + 15)
      .attr('stroke', '#333')
      .attr('stroke-width', 2);

    // Legs
    group.append('line')
      .attr('x1', cx)
      .attr('y1', cy + 20)
      .attr('x2', cx - 8)
      .attr('y2', cy + 32)
      .attr('stroke', '#333')
      .attr('stroke-width', 2);

    group.append('line')
      .attr('x1', cx)
      .attr('y1', cy + 20)
      .attr('x2', cx + 8)
      .attr('y2', cy + 32)
      .attr('stroke', '#333')
      .attr('stroke-width', 2);
  }

  /**
   * Render a single diagram element
   */
  private renderElement(
    ctx: RenderContext,
    parent: d3.Selection<SVGGElement, unknown, null, undefined>,
    element: DiagramElement
  ): void {
    switch (element.type) {
      case 'message':
        this.renderMessage(ctx, parent, element as Message);
        break;
      case 'note':
        this.renderNote(ctx, parent, element as Note);
        break;
      case 'activation':
        // Activations are handled within messages
        break;
      case 'loop':
        this.renderLoop(ctx, parent, element as Loop);
        break;
      case 'alt':
        this.renderAlt(ctx, parent, element as Alt);
        break;
      case 'opt':
        this.renderOpt(ctx, parent, element as Opt);
        break;
      case 'par':
        this.renderPar(ctx, parent, element as Par);
        break;
      case 'rect':
        this.renderRect(ctx, parent, element as Rect);
        break;
      default:
        // Skip other types for now
        break;
    }
  }

  /**
   * Render a message arrow
   */
  private renderMessage(
    ctx: RenderContext,
    parent: d3.Selection<SVGGElement, unknown, null, undefined>,
    message: Message
  ): void {
    const fromX = ctx.actorPositions.get(message.from)!;
    const toX = ctx.actorPositions.get(message.to)!;
    const y = ctx.currentY;

    const messageGroup = parent.append('g')
      .attr('class', 'message');

    // Draw arrow
    const dashed = message.arrow.includes('--');
    const hasArrowhead = message.arrow.includes('>');
    const hasCross = message.arrow.includes('x');
    const isAsync = message.arrow.includes(')');

    messageGroup.append('line')
      .attr('class', 'messageLine0')
      .attr('x1', fromX)
      .attr('y1', y)
      .attr('x2', toX)
      .attr('y2', y)
      .attr('stroke', '#333')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', dashed ? '5,5' : 'none')
      .attr('marker-end', hasArrowhead ? 'url(#arrowhead)' : '');

    // Add arrowhead marker if needed
    if (hasArrowhead && !parent.select('#arrowhead').node()) {
      const defs = parent.append('defs');
      defs.append('marker')
        .attr('id', 'arrowhead')
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('refX', 9)
        .attr('refY', 3)
        .attr('orient', 'auto')
        .append('polygon')
        .attr('points', '0 0, 10 3, 0 6')
        .attr('fill', '#333');
    }

    // Add cross for destruction
    if (hasCross) {
      const crossSize = 8;
      messageGroup.append('line')
        .attr('x1', toX - crossSize)
        .attr('y1', y - crossSize)
        .attr('x2', toX + crossSize)
        .attr('y2', y + crossSize)
        .attr('stroke', '#333')
        .attr('stroke-width', 2);

      messageGroup.append('line')
        .attr('x1', toX - crossSize)
        .attr('y1', y + crossSize)
        .attr('x2', toX + crossSize)
        .attr('y2', y - crossSize)
        .attr('stroke', '#333')
        .attr('stroke-width', 2);
    }

    // Add message text
    if (message.text) {
      const textX = (fromX + toX) / 2;
      messageGroup.append('text')
        .attr('class', 'messageText')
        .attr('x', textX)
        .attr('y', y - 5)
        .attr('text-anchor', 'middle')
        .style('font-size', `${ctx.diagram.config.messageFontSize}px`)
        .style('font-family', ctx.diagram.config.messageFontFamily)
        .text(message.text);
    }

    // Handle activations
    if (message.activateTo) {
      const stack = ctx.activationStacks.get(message.to)!;
      stack.push(ctx.currentY);
    }
    if (message.deactivateFrom) {
      const stack = ctx.activationStacks.get(message.from)!;
      const startY = stack.pop();
      if (startY !== undefined) {
        this.drawActivation(parent, ctx.actorPositions.get(message.from)!, startY, ctx.currentY);
      }
    }

    ctx.currentY += MESSAGE_HEIGHT;
  }

  /**
   * Draw an activation box
   */
  private drawActivation(
    parent: d3.Selection<SVGGElement, unknown, null, undefined>,
    x: number,
    y1: number,
    y2: number
  ): void {
    parent.append('rect')
      .attr('class', 'activation')
      .attr('x', x - ACTIVATION_WIDTH / 2)
      .attr('y', y1)
      .attr('width', ACTIVATION_WIDTH)
      .attr('height', y2 - y1)
      .attr('fill', '#fff')
      .attr('stroke', '#333')
      .attr('stroke-width', 2);
  }

  /**
   * Render a note
   */
  private renderNote(
    ctx: RenderContext,
    parent: d3.Selection<SVGGElement, unknown, null, undefined>,
    note: Note
  ): void {
    let x: number;

    if (note.actors.length === 1) {
      const actorX = ctx.actorPositions.get(note.actors[0])!;
      if (note.position === 'left of') {
        x = actorX - NOTE_WIDTH - 20;
      } else {
        x = actorX + 20;
      }
    } else {
      // Over multiple actors
      const x1 = ctx.actorPositions.get(note.actors[0])!;
      const x2 = ctx.actorPositions.get(note.actors[1])!;
      x = (x1 + x2) / 2 - NOTE_WIDTH / 2;
    }

    const y = ctx.currentY;

    const noteGroup = parent.append('g')
      .attr('class', 'note');

    // Note background
    noteGroup.append('rect')
      .attr('x', x)
      .attr('y', y)
      .attr('width', NOTE_WIDTH)
      .attr('height', NOTE_HEIGHT)
      .attr('fill', '#fffacd')
      .attr('stroke', '#333')
      .attr('stroke-width', 1)
      .attr('rx', 3);

    // Note text
    noteGroup.append('text')
      .attr('class', 'noteText')
      .attr('x', x + NOTE_WIDTH / 2)
      .attr('y', y + NOTE_HEIGHT / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-size', `${ctx.diagram.config.noteFontSize}px`)
      .style('font-family', ctx.diagram.config.noteFontFamily)
      .text(note.text);

    ctx.currentY += NOTE_HEIGHT + 20;
  }

  /**
   * Render a loop block
   */
  private renderLoop(
    ctx: RenderContext,
    parent: d3.Selection<SVGGElement, unknown, null, undefined>,
    loop: Loop
  ): void {
    const startY = ctx.currentY;
    ctx.currentY += BLOCK_PADDING;

    // Render loop contents
    for (const stmt of loop.statements) {
      this.renderElement(ctx, parent, stmt);
    }

    const endY = ctx.currentY;
    ctx.currentY += BLOCK_PADDING;

    // Draw loop box
    this.drawBlock(parent, 'loop', loop.label, startY, endY);
  }

  /**
   * Render alt block
   */
  private renderAlt(
    ctx: RenderContext,
    parent: d3.Selection<SVGGElement, unknown, null, undefined>,
    alt: Alt
  ): void {
    const startY = ctx.currentY;
    const branchYs: number[] = [];

    for (let i = 0; i < alt.branches.length; i++) {
      const branch = alt.branches[i];
      branchYs.push(ctx.currentY);
      ctx.currentY += BLOCK_PADDING;

      for (const stmt of branch.statements) {
        this.renderElement(ctx, parent, stmt);
      }
    }

    const endY = ctx.currentY;
    ctx.currentY += BLOCK_PADDING;

    // Draw alt box with branches
    this.drawBlock(parent, 'alt', alt.branches[0].condition, startY, endY, branchYs.slice(1));
  }

  /**
   * Render opt block
   */
  private renderOpt(
    ctx: RenderContext,
    parent: d3.Selection<SVGGElement, unknown, null, undefined>,
    opt: Opt
  ): void {
    const startY = ctx.currentY;
    ctx.currentY += BLOCK_PADDING;

    for (const stmt of opt.statements) {
      this.renderElement(ctx, parent, stmt);
    }

    const endY = ctx.currentY;
    ctx.currentY += BLOCK_PADDING;

    this.drawBlock(parent, 'opt', opt.condition, startY, endY);
  }

  /**
   * Render par block
   */
  private renderPar(
    ctx: RenderContext,
    parent: d3.Selection<SVGGElement, unknown, null, undefined>,
    par: Par
  ): void {
    const startY = ctx.currentY;
    const branchYs: number[] = [];

    for (let i = 0; i < par.branches.length; i++) {
      const branch = par.branches[i];
      branchYs.push(ctx.currentY);
      ctx.currentY += BLOCK_PADDING;

      for (const stmt of branch.statements) {
        this.renderElement(ctx, parent, stmt);
      }
    }

    const endY = ctx.currentY;
    ctx.currentY += BLOCK_PADDING;

    this.drawBlock(parent, 'par', par.branches[0].label, startY, endY, branchYs.slice(1));
  }

  /**
   * Render rect (background highlight)
   */
  private renderRect(
    ctx: RenderContext,
    parent: d3.Selection<SVGGElement, unknown, null, undefined>,
    rect: Rect
  ): void {
    const startY = ctx.currentY;
    ctx.currentY += 10;

    for (const stmt of rect.statements) {
      this.renderElement(ctx, parent, stmt);
    }

    const endY = ctx.currentY;
    ctx.currentY += 10;

    // Draw colored background
    const minX = Math.min(...Array.from(ctx.actorPositions.values()));
    const maxX = Math.max(...Array.from(ctx.actorPositions.values()));

    parent.insert('rect', ':first-child')
      .attr('x', minX - 60)
      .attr('y', startY)
      .attr('width', maxX - minX + 120)
      .attr('height', endY - startY)
      .attr('fill', rect.color)
      .attr('opacity', 0.3);
  }

  /**
   * Draw a control structure block
   */
  private drawBlock(
    parent: d3.Selection<SVGGElement, unknown, null, undefined>,
    type: string,
    label: string,
    startY: number,
    endY: number,
    branchYs: number[] = []
  ): void {
    const minX = Math.min(...Array.from(this.svg!.select('.main-group').datum() as any));
    const maxX = Math.max(...Array.from(this.svg!.select('.main-group').datum() as any));

    const blockGroup = parent.append('g')
      .attr('class', `block ${type}`);

    // Main box
    blockGroup.append('rect')
      .attr('class', 'loopLine')
      .attr('x', 20)
      .attr('y', startY)
      .attr('width', 1000)
      .attr('height', endY - startY)
      .attr('fill', 'none')
      .attr('stroke', '#333')
      .attr('stroke-width', 2);

    // Label box
    blockGroup.append('rect')
      .attr('class', 'labelBox')
      .attr('x', 20)
      .attr('y', startY)
      .attr('width', 80)
      .attr('height', 25)
      .attr('fill', '#f0f0f0')
      .attr('stroke', '#333')
      .attr('stroke-width', 2);

    blockGroup.append('text')
      .attr('class', 'labelText')
      .attr('x', 60)
      .attr('y', startY + 12.5)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(`[${type}] ${label}`);

    // Branch dividers
    for (const branchY of branchYs) {
      blockGroup.append('line')
        .attr('x1', 20)
        .attr('y1', branchY)
        .attr('x2', 1020)
        .attr('y2', branchY)
        .attr('stroke', '#333')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,5');
    }
  }
}
