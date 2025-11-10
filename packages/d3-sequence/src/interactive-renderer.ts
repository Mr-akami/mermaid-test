/**
 * Interactive D3.js-based renderer for sequence diagrams
 * Supports click-to-place, drag-and-drop, and direct manipulation
 */

import * as d3 from 'd3';
import type {
  SequenceDiagram,
  Participant,
  Message,
  ArrowType,
  ParticipantType,
  Loop
} from './model';

// Layout constants
const ACTOR_WIDTH = 120;
const ACTOR_HEIGHT = 40;
const ACTOR_SPACING = 160;
const MESSAGE_HEIGHT = 60;
const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;

type Tool = 'select' | 'participant' | 'actor' | 'message' | 'note' | 'loop' | 'alt';

interface LoopLayout {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  loop: Loop;
  messageIndices: number[]; // indices of messages within this loop
}

interface ParticipantLayout {
  id: string;
  x: number;
  y: number;
  participant: Participant;
}

interface MessageLayout {
  index: number;
  y: number;
  message: Message;
  fromX: number;
  toX: number;
}

export interface InteractiveRendererCallbacks {
  onElementSelected?: (element: any) => void;
  onDiagramChange?: () => void;
}

export class InteractiveSequenceRenderer {
  private container: HTMLElement;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private mainGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private diagram: SequenceDiagram;
  private callbacks: InteractiveRendererCallbacks;

  private currentTool: Tool = 'select';
  private selectedElement: any = null;

  private participantLayouts: ParticipantLayout[] = [];
  private messageLayouts: MessageLayout[] = [];
  private loopLayouts: LoopLayout[] = [];

  // Saved loop positions (by loop reference) - only X and width, Y and height follow messages
  private savedLoopPositions: Map<Loop, { x: number; width: number }> = new Map();

  // Zoom behavior
  private zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;

  // Message creation state
  private messageCreationState: {
    from?: string;
    fromX?: number;
    fromY?: number;
  } = {};

  // Selection rectangle
  private selectionStart: { x: number; y: number } | null = null;

  // Loop creation state
  private loopSelectionStart: { x: number; y: number } | null = null;

  constructor(
    diagram: SequenceDiagram,
    container: HTMLElement,
    callbacks: InteractiveRendererCallbacks = {}
  ) {
    this.diagram = diagram;
    this.container = container;
    this.callbacks = callbacks;
    this.initializeSVG();
  }

  /**
   * Initialize SVG canvas
   */
  private initializeSVG(): void {
    // Clear previous content
    d3.select(this.container).selectAll('*').remove();

    // Create SVG
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('background', '#fff');

    // Create main group for zoom/pan
    this.mainGroup = this.svg.append('g')
      .attr('class', 'main-group');

    // Add zoom behavior
    this.zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        if (this.currentTool === 'select') {
          this.mainGroup!.attr('transform', event.transform.toString());
        }
      });

    this.svg.call(this.zoomBehavior as any);

    // Add canvas click handler
    this.svg.on('click', (event) => this.handleCanvasClick(event));
    this.svg.on('mousedown', (event) => this.handleCanvasMouseDown(event));
    this.svg.on('mousemove', (event) => this.handleCanvasMouseMove(event));
    this.svg.on('mouseup', (event) => this.handleCanvasMouseUp(event));
  }

  /**
   * Set current tool
   */
  setTool(tool: Tool): void {
    console.log('Tool changed to:', tool);
    this.currentTool = tool;
    this.messageCreationState = {};
    this.loopSelectionStart = null;

    // Reset lifeline styles when changing tools
    if (this.mainGroup) {
      this.mainGroup.selectAll('.lifeline')
        .style('stroke', '#999')
        .style('stroke-width', 2);

      // Clear any selection rectangle
      this.mainGroup.selectAll('.selection-rect').remove();
    }

    // Enable/disable zoom based on tool
    if (this.svg && this.zoomBehavior) {
      if (tool === 'select') {
        // Enable zoom for select tool
        this.svg.call(this.zoomBehavior as any);
      } else {
        // Disable zoom for other tools (participant, actor, message, loop, etc.)
        this.svg.on('.zoom', null);
      }
    }

    // Update cursor
    const containerEl = this.container;
    containerEl.classList.remove('tool-active', 'dragging');
    if (tool !== 'select') {
      containerEl.classList.add('tool-active');
    }
  }

  /**
   * Get current tool
   */
  getTool(): Tool {
    return this.currentTool;
  }

  /**
   * Render the diagram
   */
  render(): void {
    if (!this.mainGroup) return;

    // Clear main group
    this.mainGroup.selectAll('*').remove();

    // Layout participants
    this.layoutParticipants();

    // Render participants
    this.renderParticipants();

    // Layout messages
    this.layoutMessages();

    // Layout loops
    this.layoutLoops();

    // Render loops (before messages so they appear behind)
    this.renderLoops();

    // Render messages
    this.renderMessages();
  }

  /**
   * Layout participants horizontally
   */
  private layoutParticipants(): void {
    this.participantLayouts = [];

    const participants = Array.from(this.diagram.participants.values())
      .sort((a, b) => a.order - b.order);

    participants.forEach((p, index) => {
      this.participantLayouts.push({
        id: p.id,
        x: 100 + index * ACTOR_SPACING,
        y: 80,
        participant: p
      });
    });
  }

  /**
   * Render participants
   */
  private renderParticipants(): void {
    if (!this.mainGroup) return;

    for (const layout of this.participantLayouts) {
      const group = this.mainGroup.append('g')
        .attr('class', `${layout.participant.type}-group`)
        .attr('transform', `translate(${layout.x}, ${layout.y})`)
        .attr('data-id', layout.id)
        .style('cursor', 'move');

      // Draw participant box or actor icon
      if (layout.participant.type === 'actor') {
        this.drawActorIcon(group);
      } else {
        group.append('rect')
          .attr('x', -ACTOR_WIDTH / 2)
          .attr('y', 0)
          .attr('width', ACTOR_WIDTH)
          .attr('height', ACTOR_HEIGHT)
          .attr('fill', '#e8f4f8')
          .attr('stroke', '#333')
          .attr('stroke-width', 2)
          .attr('rx', 5);
      }

      // Add label
      const label = layout.participant.label || layout.id;
      group.append('text')
        .attr('y', ACTOR_HEIGHT / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('pointer-events', 'none')
        .text(label);

      // Draw lifeline with wider invisible clickable area
      const lifelineHeight = 600;

      // Invisible wider line for easier clicking
      const lifelineHitArea = group.append('line')
        .attr('class', 'lifeline-hit-area')
        .attr('y1', ACTOR_HEIGHT)
        .attr('y2', ACTOR_HEIGHT + lifelineHeight)
        .attr('stroke', 'transparent')
        .attr('stroke-width', 20)
        .attr('data-participant-id', layout.id)
        .style('cursor', 'pointer');

      // Visible lifeline
      const lifeline = group.append('line')
        .attr('class', 'lifeline')
        .attr('y1', ACTOR_HEIGHT)
        .attr('y2', ACTOR_HEIGHT + lifelineHeight)
        .attr('stroke', '#999')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('stroke-linecap', 'round')
        .attr('data-participant-id', layout.id)
        .style('pointer-events', 'none');

      // Add lifeline click handler for message creation (on hit area)
      lifelineHitArea.on('click', (event) => {
        console.log('Lifeline clicked:', layout.id, 'tool:', this.currentTool);
        event.stopPropagation();
        if (this.currentTool === 'message') {
          this.handleLifelineClick(layout.id, event);
        }
      });

      // Prevent drag on lifeline when in message mode
      lifelineHitArea.on('mousedown', (event) => {
        if (this.currentTool === 'message') {
          event.stopPropagation();
        }
      });

      // Hover effect on message tool
      lifelineHitArea.on('mouseenter', () => {
        if (this.currentTool === 'message') {
          lifeline.style('stroke', '#3498db').style('stroke-width', 3);
        }
      });

      lifelineHitArea.on('mouseleave', () => {
        if (this.currentTool === 'message' && this.messageCreationState.from !== layout.id) {
          lifeline.style('stroke', '#999').style('stroke-width', 2);
        }
      });

      // Add drag behavior
      const drag = d3.drag<SVGGElement, unknown>()
        .on('start', () => {
          if (this.currentTool === 'select') {
            group.raise();
          }
        })
        .on('drag', (event) => {
          if (this.currentTool === 'select') {
            const currentTransform = group.attr('transform');
            const match = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(currentTransform);
            if (match) {
              const newX = parseFloat(match[1]) + event.dx;
              group.attr('transform', `translate(${newX}, ${match[2]})`);

              // Update layout
              const layoutItem = this.participantLayouts.find(l => l.id === layout.id);
              if (layoutItem) {
                layoutItem.x = newX;
              }
            }
          }
        })
        .on('end', () => {
          this.render(); // Re-render to update message positions
          this.notifyChange();
        });

      group.call(drag as any);

      // Add click handler for selection
      group.on('click', (event) => {
        if (this.currentTool === 'select') {
          event.stopPropagation();
          this.selectElement({ type: 'participant', data: layout.participant });
        }
      });
    }
  }

  /**
   * Draw actor icon (stick figure)
   */
  private drawActorIcon(group: d3.Selection<SVGGElement, unknown, null, undefined>): void {
    const cy = 20;

    // Head
    group.append('circle')
      .attr('cy', cy)
      .attr('r', 8)
      .attr('fill', 'none')
      .attr('stroke', '#333')
      .attr('stroke-width', 2);

    // Body
    group.append('line')
      .attr('y1', cy + 8)
      .attr('y2', cy + 20)
      .attr('stroke', '#333')
      .attr('stroke-width', 2);

    // Arms
    group.append('line')
      .attr('x1', -10)
      .attr('y1', cy + 15)
      .attr('x2', 10)
      .attr('y2', cy + 15)
      .attr('stroke', '#333')
      .attr('stroke-width', 2);

    // Legs
    group.append('line')
      .attr('y1', cy + 20)
      .attr('x2', -8)
      .attr('y2', cy + 32)
      .attr('stroke', '#333')
      .attr('stroke-width', 2);

    group.append('line')
      .attr('y1', cy + 20)
      .attr('x2', 8)
      .attr('y2', cy + 32)
      .attr('stroke', '#333')
      .attr('stroke-width', 2);
  }

  /**
   * Layout messages vertically
   */
  private layoutMessages(): void {
    // Save existing Y positions by message reference
    const existingYPositions = new Map<Message, number>();
    for (const layout of this.messageLayouts) {
      existingYPositions.set(layout.message, layout.y);
    }

    // Find the maximum Y position for new messages
    let maxY = 200;
    if (this.messageLayouts.length > 0) {
      maxY = Math.max(...this.messageLayouts.map(l => l.y)) + MESSAGE_HEIGHT;
    }

    this.messageLayouts = [];

    // Recursive function to process elements (including nested ones in loops)
    const processElement = (element: any, index: number) => {
      if (element.type === 'message') {
        const msg = element as Message;
        const fromLayout = this.participantLayouts.find(p => p.id === msg.from);
        const toLayout = this.participantLayouts.find(p => p.id === msg.to);

        if (fromLayout && toLayout) {
          // Use existing Y position if available, otherwise use next available position
          let y: number;
          if (existingYPositions.has(msg)) {
            y = existingYPositions.get(msg)!;
          } else {
            y = maxY;
            maxY += MESSAGE_HEIGHT;
          }

          this.messageLayouts.push({
            index,
            y,
            message: msg,
            fromX: fromLayout.x,
            toX: toLayout.x
          });
        }
      } else if (element.type === 'loop') {
        // Process messages inside loop
        const loop = element as Loop;
        loop.statements.forEach((stmt, stmtIndex) => {
          processElement(stmt, index); // Use parent loop's index for now
        });
      }
    };

    this.diagram.elements.forEach((element, index) => {
      processElement(element, index);
    });

    // Sort by Y position to maintain visual order
    this.messageLayouts.sort((a, b) => a.y - b.y);
  }

  /**
   * Render messages
   */
  private renderMessages(): void {
    if (!this.mainGroup) return;

    for (const layout of this.messageLayouts) {
      const group = this.mainGroup.append('g')
        .attr('class', 'message-group')
        .attr('data-index', layout.index);

      // Draw arrow
      const dashed = layout.message.arrow.includes('--');
      const hasArrowhead = layout.message.arrow.includes('>');

      group.append('line')
        .attr('x1', layout.fromX)
        .attr('y1', layout.y)
        .attr('x2', layout.toX)
        .attr('y2', layout.y)
        .attr('stroke', '#333')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', dashed ? '5,5' : 'none')
        .attr('marker-end', hasArrowhead ? 'url(#arrowhead)' : '');

      // Add arrowhead marker definition
      if (hasArrowhead && !this.mainGroup.select('#arrowhead').node()) {
        const defs = this.mainGroup.append('defs');
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

      // Add message text
      if (layout.message.text) {
        const textX = (layout.fromX + layout.toX) / 2;
        group.append('text')
          .attr('x', textX)
          .attr('y', layout.y - 8)
          .attr('text-anchor', 'middle')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .text(layout.message.text);
      }

      // Add drag behavior for vertical movement
      const drag = d3.drag<SVGGElement, unknown>()
        .on('drag', (event) => {
          if (this.currentTool === 'select') {
            const newY = layout.y + event.dy;
            layout.y = Math.max(150, newY); // Prevent dragging above participants

            // Update position
            group.select('line').attr('y1', layout.y).attr('y2', layout.y);
            group.select('text').attr('y', layout.y - 8);
          }
        })
        .on('end', () => {
          // Check if this message belongs to a loop
          let parentLoop: Loop | null = null;
          let parentLoopIndex = -1;

          this.diagram.elements.forEach((element, idx) => {
            if (element.type === 'loop') {
              const loop = element as Loop;
              if (loop.statements.includes(layout.message)) {
                parentLoop = loop;
                parentLoopIndex = idx;
              }
            }
          });

          // If message belongs to a loop, check if it's been dragged outside
          if (parentLoop) {
            // Find the loop layout
            const loopLayout = this.loopLayouts.find(l => l.loop === parentLoop);
            if (loopLayout) {
              const loopMinY = loopLayout.y;
              const loopMaxY = loopLayout.y + loopLayout.height;

              // Check if message is outside loop bounds
              if (layout.y < loopMinY || layout.y > loopMaxY) {
                // Remove message from loop
                const messageIndex = parentLoop.statements.indexOf(layout.message);
                if (messageIndex !== -1) {
                  parentLoop.statements.splice(messageIndex, 1);
                }

                // If loop is now empty, remove it entirely
                if (parentLoop.statements.length === 0) {
                  this.diagram.elements.splice(parentLoopIndex, 1);
                } else {
                  // Add message to top-level elements
                  // Insert at the appropriate position based on Y coordinate
                  let insertIndex = 0;
                  for (let i = 0; i < this.diagram.elements.length; i++) {
                    const el = this.diagram.elements[i];
                    if (el.type === 'message') {
                      const msgLayout = this.messageLayouts.find(l => l.message === el);
                      if (msgLayout && msgLayout.y < layout.y) {
                        insertIndex = i + 1;
                      }
                    }
                  }
                  this.diagram.elements.splice(insertIndex, 0, layout.message);
                }

                console.log('Message removed from loop');
              }
            }
          } else {
            // Message is not in a loop, check if it's been dragged into one
            let targetLoop: Loop | null = null;
            let targetLoopIndex = -1;

            for (let i = 0; i < this.loopLayouts.length; i++) {
              const loopLayout = this.loopLayouts[i];
              const loopMinY = loopLayout.y;
              const loopMaxY = loopLayout.y + loopLayout.height;

              // Check if message is inside this loop bounds
              if (layout.y >= loopMinY && layout.y <= loopMaxY) {
                targetLoop = loopLayout.loop;
                targetLoopIndex = loopLayout.index;
                break;
              }
            }

            if (targetLoop) {
              // Remove message from top-level elements
              const msgIndex = this.diagram.elements.indexOf(layout.message);
              if (msgIndex !== -1) {
                this.diagram.elements.splice(msgIndex, 1);
              }

              // Add message to loop's statements in sorted order by Y
              const insertIndex = targetLoop.statements.findIndex(stmt => {
                if (stmt.type === 'message') {
                  const stmtLayout = this.messageLayouts.find(l => l.message === stmt);
                  return stmtLayout && stmtLayout.y > layout.y;
                }
                return false;
              });

              if (insertIndex === -1) {
                // Add to end
                targetLoop.statements.push(layout.message);
              } else {
                // Insert at appropriate position
                targetLoop.statements.splice(insertIndex, 0, layout.message);
              }

              console.log('Message added to loop');
            }
          }

          // Re-sort messages by Y position
          this.messageLayouts.sort((a, b) => a.y - b.y);
          this.updateMessageOrder();
          this.notifyChange();
        });

      group.call(drag as any);

      // Add click handler
      group.on('click', (event) => {
        if (this.currentTool === 'select') {
          event.stopPropagation();
          this.selectElement({ type: 'message', data: layout.message, index: layout.index });
        }
      });
    }
  }

  /**
   * Handle lifeline click for message creation
   */
  private handleLifelineClick(participantId: string, event: MouseEvent): void {
    console.log('handleLifelineClick called:', participantId);
    if (this.currentTool === 'message') {
      event.stopPropagation();

      const layout = this.participantLayouts.find(p => p.id === participantId);
      if (!layout) {
        console.log('Layout not found for', participantId);
        return;
      }

      if (!this.messageCreationState.from) {
        // First click - set source
        this.messageCreationState.from = participantId;
        this.messageCreationState.fromX = layout.x;

        // Get Y coordinate
        const point = d3.pointer(event, this.mainGroup!.node());
        this.messageCreationState.fromY = point[1];

        console.log('Message source set:', this.messageCreationState.from);

        // Visual feedback - highlight the source lifeline
        this.mainGroup!.selectAll('.lifeline').style('stroke', '#999');
        this.mainGroup!.selectAll(`[data-participant-id="${participantId}"]`)
          .style('stroke', '#3498db')
          .style('stroke-width', 4);

      } else {
        // Second click - create message
        const to = participantId;
        const from = this.messageCreationState.from;

        console.log('Creating message from', from, 'to', to);

        if (from && to) {
          this.createMessage(from, to);
          this.messageCreationState = {};

          // Reset lifeline styles
          this.mainGroup!.selectAll('.lifeline')
            .style('stroke', '#999')
            .style('stroke-width', 2);
        }
      }
    }
  }

  /**
   * Create a new message
   */
  private createMessage(from: string, to: string): void {
    const message: Message = {
      type: 'message',
      from,
      to,
      arrow: '->>',
      text: 'New Message'
    };

    this.diagram.elements.push(message);
    this.render();
    this.notifyChange();
    this.selectElement({ type: 'message', data: message, index: this.diagram.elements.length - 1 });
  }

  /**
   * Handle canvas click
   */
  private handleCanvasClick(event: MouseEvent): void {
    if (this.currentTool === 'participant' || this.currentTool === 'actor') {
      const point = d3.pointer(event, this.mainGroup!.node());
      this.addParticipantAt(point[0], point[1], this.currentTool);
    } else if (this.currentTool === 'select') {
      // Deselect
      this.selectElement(null);
    }
  }

  /**
   * Handle canvas mouse down for selection rectangle
   */
  private handleCanvasMouseDown(event: MouseEvent): void {
    if (this.currentTool === 'select' && event.target === this.svg!.node()) {
      const point = d3.pointer(event, this.mainGroup!.node());
      this.selectionStart = { x: point[0], y: point[1] };
    } else if (this.currentTool === 'loop') {
      const point = d3.pointer(event, this.mainGroup!.node());
      this.loopSelectionStart = { x: point[0], y: point[1] };
      console.log('Loop selection started at:', point);
    }
  }

  /**
   * Handle canvas mouse move
   */
  private handleCanvasMouseMove(event: MouseEvent): void {
    // Only draw selection rectangle if mouse button is pressed (buttons === 1 means left button)
    if (event.buttons === 0) {
      // No button pressed, clear any existing selection rectangle
      this.clearSelectionRectangle();
      return;
    }

    if (this.selectionStart && this.currentTool === 'select') {
      const point = d3.pointer(event, this.mainGroup!.node());
      this.drawSelectionRectangle(this.selectionStart.x, this.selectionStart.y, point[0], point[1]);
    } else if (this.loopSelectionStart && this.currentTool === 'loop') {
      const point = d3.pointer(event, this.mainGroup!.node());
      this.drawSelectionRectangle(this.loopSelectionStart.x, this.loopSelectionStart.y, point[0], point[1], '#3498db');
    }
  }

  /**
   * Handle canvas mouse up
   */
  private handleCanvasMouseUp(event: MouseEvent): void {
    if (this.selectionStart) {
      const point = d3.pointer(event, this.mainGroup!.node());
      // TODO: Select elements within rectangle
      this.clearSelectionRectangle();
      this.selectionStart = null;
    } else if (this.loopSelectionStart && this.currentTool === 'loop') {
      const point = d3.pointer(event, this.mainGroup!.node());
      this.createLoopFromSelection(this.loopSelectionStart.x, this.loopSelectionStart.y, point[0], point[1]);
      this.clearSelectionRectangle();
      this.loopSelectionStart = null;
    } else {
      // Clear selection rectangle if mouse up without starting selection
      this.clearSelectionRectangle();
      this.selectionStart = null;
      this.loopSelectionStart = null;
    }
  }

  /**
   * Draw selection rectangle
   */
  private drawSelectionRectangle(x1: number, y1: number, x2: number, y2: number, color: string = '#3498db'): void {
    this.mainGroup!.selectAll('.selection-rect').remove();

    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    this.mainGroup!.append('rect')
      .attr('class', 'selection-rect')
      .attr('x', x)
      .attr('y', y)
      .attr('width', width)
      .attr('height', height)
      .style('stroke', color);
  }

  /**
   * Clear selection rectangle
   */
  private clearSelectionRectangle(): void {
    this.mainGroup!.selectAll('.selection-rect').remove();
  }

  /**
   * Add participant at position
   */
  private addParticipantAt(x: number, y: number, type: ParticipantType): void {
    const id = `${type}${this.diagram.participants.size + 1}`;
    const participant: Participant = {
      id,
      type,
      label: id,
      links: [],
      explicit: true,
      order: this.diagram.participants.size
    };

    this.diagram.participants.set(id, participant);

    // Add to layout
    this.participantLayouts.push({
      id,
      x,
      y: 80,
      participant
    });

    this.render();
    this.notifyChange();
    this.selectElement({ type: 'participant', data: participant });
  }

  /**
   * Select element
   */
  private selectElement(element: any): void {
    this.selectedElement = element;

    // Update visual selection
    this.mainGroup!.selectAll('.selected').classed('selected', false);

    if (element) {
      if (element.type === 'participant') {
        this.mainGroup!.selectAll(`[data-id="${element.data.id}"]`).classed('selected', true);
      } else if (element.type === 'message') {
        this.mainGroup!.selectAll(`[data-index="${element.index}"]`).classed('selected', true);
      }
    }

    if (this.callbacks.onElementSelected) {
      this.callbacks.onElementSelected(element);
    }
  }

  /**
   * Get selected element
   */
  getSelectedElement(): any {
    return this.selectedElement;
  }

  /**
   * Update message order after drag
   */
  private updateMessageOrder(): void {
    const newElements: any[] = [];
    const messages = new Map<number, any>();

    // Collect messages
    this.diagram.elements.forEach((el, index) => {
      if (el.type === 'message') {
        messages.set(index, el);
      } else {
        newElements.push(el);
      }
    });

    // Re-insert messages in new order
    this.messageLayouts.forEach(layout => {
      if (messages.has(layout.index)) {
        newElements.push(messages.get(layout.index));
      }
    });

    this.diagram.elements = newElements;
  }

  /**
   * Notify change callback
   */
  private notifyChange(): void {
    if (this.callbacks.onDiagramChange) {
      this.callbacks.onDiagramChange();
    }
  }

  /**
   * Update diagram reference
   */
  setDiagram(diagram: SequenceDiagram): void {
    this.diagram = diagram;
    this.render();
  }

  /**
   * Delete selected element
   */
  deleteSelected(): void {
    if (!this.selectedElement) return;

    if (this.selectedElement.type === 'participant') {
      this.diagram.participants.delete(this.selectedElement.data.id);

      // Remove associated messages
      this.diagram.elements = this.diagram.elements.filter(el => {
        if (el.type === 'message') {
          const msg = el as Message;
          return msg.from !== this.selectedElement.data.id && msg.to !== this.selectedElement.data.id;
        }
        return true;
      });
    } else if (this.selectedElement.type === 'message') {
      this.diagram.elements.splice(this.selectedElement.index, 1);
    } else if (this.selectedElement.type === 'loop') {
      // Remove loop and restore its messages to the main elements
      const loop = this.selectedElement.data as Loop;
      const loopIndex = this.selectedElement.index;

      // Replace the loop with its statements
      this.diagram.elements.splice(loopIndex, 1, ...loop.statements);
    }

    this.selectedElement = null;
    this.render();
    this.notifyChange();
  }

  /**
   * Create a loop from selection rectangle
   */
  createLoopFromSelection(x1: number, y1: number, x2: number, y2: number): void {
    const selX = Math.min(x1, x2);
    const selY = Math.min(y1, y2);
    const selWidth = Math.abs(x2 - x1);
    const selHeight = Math.abs(y2 - y1);

    console.log('Creating loop from selection:', { selX, selY, selWidth, selHeight });

    // Find messages within the selection
    const selectedMessageIndices: number[] = [];
    for (const layout of this.messageLayouts) {
      // Check if message Y is within selection
      if (layout.y >= selY && layout.y <= selY + selHeight) {
        selectedMessageIndices.push(layout.index);
      }
    }

    console.log('Selected message indices:', selectedMessageIndices);

    if (selectedMessageIndices.length === 0) {
      alert('No messages selected. Please drag over messages to create a loop.');
      return;
    }

    // Prompt for loop label
    const label = prompt('Enter loop label:', 'Every minute') || 'loop';

    // Find the first and last message indices to wrap
    const minIndex = Math.min(...selectedMessageIndices);
    const maxIndex = Math.max(...selectedMessageIndices);

    // Extract messages from diagram.elements
    const messagesToWrap: any[] = [];
    const newElements: any[] = [];

    this.diagram.elements.forEach((el, idx) => {
      if (el.type === 'message' && idx >= minIndex && idx <= maxIndex) {
        // This message should be wrapped in the loop
        messagesToWrap.push(el);
      } else if (idx < minIndex) {
        // Elements before the loop
        newElements.push(el);
      } else if (idx === minIndex) {
        // This is never reached since we already handled minIndex above
        // but we need to insert the loop here
      }
      // Elements after maxIndex will be added after loop
    });

    // Create loop element
    const loop: Loop = {
      type: 'loop',
      label,
      statements: messagesToWrap
    };

    // Add the loop
    newElements.push(loop);

    // Add elements after the loop
    this.diagram.elements.forEach((el, idx) => {
      if (idx > maxIndex) {
        newElements.push(el);
      }
    });

    // Replace elements array
    this.diagram.elements = newElements;

    console.log('Loop created:', loop);

    // Re-render
    this.render();
    this.notifyChange();

    // Switch back to select tool
    this.setTool('select');
  }

  /**
   * Layout loops
   */
  layoutLoops(): void {
    this.loopLayouts = [];

    let currentMessageIndex = 0;

    this.diagram.elements.forEach((element, elemIndex) => {
      if (element.type === 'loop') {
        const loop = element as Loop;

        // Find messages in this loop
        const messageIndices: number[] = [];
        let minY = Infinity;
        let maxY = -Infinity;

        loop.statements.forEach(stmt => {
          if (stmt.type === 'message') {
            // Find this message in messageLayouts
            const layout = this.messageLayouts.find(l => l.message === stmt);
            if (layout) {
              messageIndices.push(layout.index);
              minY = Math.min(minY, layout.y);
              maxY = Math.max(maxY, layout.y);
            }
          }
          currentMessageIndex++;
        });

        if (messageIndices.length > 0) {
          // Calculate loop bounds based on messages
          const calculatedMinX = Math.min(...this.participantLayouts.map(p => p.x)) - 80;
          const calculatedMaxX = Math.max(...this.participantLayouts.map(p => p.x)) + 80;
          const calculatedY = minY - 30;
          const calculatedWidth = calculatedMaxX - calculatedMinX;
          const calculatedHeight = maxY - minY + 60;

          // Check if we have saved position for this loop
          const savedPos = this.savedLoopPositions.get(loop);

          let finalX, finalWidth;

          if (savedPos) {
            // Use saved X and width (horizontal position preserved)
            finalX = savedPos.x;
            finalWidth = savedPos.width;
          } else {
            // Use calculated position
            finalX = calculatedMinX;
            finalWidth = calculatedWidth;
          }

          // Y and height always follow messages (vertical position always dynamic)
          const finalY = calculatedY;
          const finalHeight = calculatedHeight;

          this.loopLayouts.push({
            index: elemIndex,
            x: finalX,
            y: finalY,
            width: finalWidth,
            height: finalHeight,
            loop,
            messageIndices
          });
        }
      } else if (element.type === 'message') {
        currentMessageIndex++;
      }
    });
  }

  /**
   * Render loops
   */
  renderLoops(): void {
    if (!this.mainGroup) return;

    for (const layout of this.loopLayouts) {
      const group = this.mainGroup.append('g')
        .attr('class', 'loop-block')
        .attr('data-index', layout.index);

      // Background
      group.append('rect')
        .attr('class', 'loop-background')
        .attr('x', layout.x)
        .attr('y', layout.y)
        .attr('width', layout.width)
        .attr('height', layout.height)
        .attr('fill', 'rgba(200, 230, 255, 0.1)')
        .attr('stroke', '#3498db')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '10,5')
        .attr('rx', 5);

      // Label box
      group.append('rect')
        .attr('x', layout.x)
        .attr('y', layout.y)
        .attr('width', 100)
        .attr('height', 25)
        .attr('fill', '#3498db')
        .attr('stroke', '#2980b9')
        .attr('stroke-width', 2)
        .attr('rx', 3);

      group.append('text')
        .attr('x', layout.x + 50)
        .attr('y', layout.y + 12.5)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('pointer-events', 'none')
        .text(`loop [${layout.loop.label}]`);

      // Add drag behavior
      let dragStartMessagePositions: Map<Message, number> = new Map();
      let dragStartLoopY = 0;

      const drag = d3.drag<SVGGElement, unknown>()
        .on('start', () => {
          // Save initial positions at drag start
          dragStartMessagePositions.clear();
          dragStartLoopY = layout.y;

          layout.loop.statements.forEach(stmt => {
            if (stmt.type === 'message') {
              const msgLayout = this.messageLayouts.find(l => l.message === stmt);
              if (msgLayout) {
                dragStartMessagePositions.set(stmt, msgLayout.y);
              }
            }
          });
        })
        .on('drag', (event) => {
          if (this.currentTool === 'select') {
            layout.x += event.dx;
            layout.y += event.dy;

            group.select('.loop-background')
              .attr('x', layout.x)
              .attr('y', layout.y);

            group.selectAll('rect:nth-child(2), text')
              .attr('x', function() {
                const currentX = parseFloat(d3.select(this).attr('x'));
                return currentX + event.dx;
              })
              .attr('y', function() {
                const currentY = parseFloat(d3.select(this).attr('y'));
                return currentY + event.dy;
              });

            // Calculate total drag distance from start
            const totalDy = layout.y - dragStartLoopY;

            // Move messages inside the loop
            layout.loop.statements.forEach(stmt => {
              if (stmt.type === 'message') {
                const initialY = dragStartMessagePositions.get(stmt);
                if (initialY !== undefined) {
                  // Find the message layout
                  const msgLayout = this.messageLayouts.find(l => l.message === stmt);
                  if (msgLayout) {
                    // Calculate new Y based on initial position + total drag distance
                    const newY = initialY + totalDy;
                    msgLayout.y = newY;

                    // Find and update the rendered message element
                    this.mainGroup!.selectAll('.message-group')
                      .filter(function() {
                        const dataIndex = d3.select(this).attr('data-index');
                        return dataIndex === String(msgLayout.index);
                      })
                      .each(function() {
                        const msgGroup = d3.select(this);

                        // Update line elements (y1 and y2)
                        msgGroup.selectAll('line').each(function() {
                          const line = d3.select(this);
                          line.attr('y1', newY).attr('y2', newY);
                        });

                        // Update text elements (y)
                        msgGroup.selectAll('text').each(function() {
                          const text = d3.select(this);
                          text.attr('y', newY - 8);
                        });
                      });
                  }
                }
              }
            });
          }
        })
        .on('end', () => {
          // Save loop horizontal position (X and width only)
          // Y and height will always follow messages
          this.savedLoopPositions.set(layout.loop, {
            x: layout.x,
            width: layout.width
          });
          dragStartMessagePositions.clear();
          this.notifyChange();
        });

      group.call(drag as any);

      // Add resize handles
      this.addLoopResizeHandles(group, layout);

      // Click handler
      group.on('click', (event) => {
        if (this.currentTool === 'select') {
          event.stopPropagation();
          this.selectElement({ type: 'loop', data: layout.loop, index: layout.index });
        }
      });
    }
  }

  /**
   * Add resize handles to loop
   */
  addLoopResizeHandles(group: any, layout: LoopLayout): void {
    const handleSize = 10;

    // Bottom-right resize handle
    const handle = group.append('rect')
      .attr('class', 'resize-handle')
      .attr('x', layout.x + layout.width - handleSize)
      .attr('y', layout.y + layout.height - handleSize)
      .attr('width', handleSize)
      .attr('height', handleSize);

    const resizeDrag = d3.drag<SVGRectElement, unknown>()
      .on('drag', (event) => {
        layout.width = Math.max(100, layout.width + event.dx);
        layout.height = Math.max(60, layout.height + event.dy);

        group.select('.loop-background')
          .attr('width', layout.width)
          .attr('height', layout.height);

        handle
          .attr('x', layout.x + layout.width - handleSize)
          .attr('y', layout.y + layout.height - handleSize);
      })
      .on('end', () => {
        // Save loop horizontal position after resize (X and width only)
        // Y and height will always follow messages
        this.savedLoopPositions.set(layout.loop, {
          x: layout.x,
          width: layout.width
        });
        this.notifyChange();
      });

    handle.call(resizeDrag as any);
  }
}
