import { DiagramModel } from '../model/DiagramModel';
import { SVGRenderer } from '../renderer/SVGRenderer';

type InteractionMode =
  | 'select'
  | 'addParticipant'
  | 'addActor'
  | 'addMessage'
  | 'addNote'
  | 'addLoop'
  | 'addAlt'
  | 'addOpt'
  | 'addPar'
  | 'addCritical'
  | 'addBreak'
  | 'addRect';

export class InteractionHandler {
  private mode: InteractionMode = 'select';
  private draggedElement: { type: string; id: string } | null = null;
  private dragStartPos: { x: number; y: number } | null = null;
  private messageCreation: { fromId: string; fromY: number } | null = null;
  private selectionStart: { x: number; y: number } | null = null;
  private selectionRect: SVGRectElement | null = null;
  private model: DiagramModel;
  private renderer: SVGRenderer;
  private isDragging: boolean = false;
  private hasMoved: boolean = false;

  constructor(model: DiagramModel, renderer: SVGRenderer) {
    this.model = model;
    this.renderer = renderer;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const svg = this.renderer.getSVGElement();

    svg.addEventListener('mousedown', this.handleMouseDown.bind(this));
    svg.addEventListener('mousemove', this.handleMouseMove.bind(this));
    svg.addEventListener('mouseup', this.handleMouseUp.bind(this));
    svg.addEventListener('click', this.handleClick.bind(this));
  }

  setMode(mode: InteractionMode): void {
    this.mode = mode;
    this.messageCreation = null;
    this.clearSelectionRect();
  }

  getMode(): InteractionMode {
    return this.mode;
  }

  private handleMouseDown(event: MouseEvent): void {
    const svgPoint = this.renderer.screenToSVG(event.clientX, event.clientY);
    this.hasMoved = false;

    if (this.mode === 'select') {
      const element = this.getElementFromEvent(event);
      if (element) {
        event.preventDefault();
        event.stopPropagation();
        this.draggedElement = element;
        this.dragStartPos = svgPoint;
        this.isDragging = true;
        this.model.setSelectedElementId(element.id);
      } else {
        // Start selection rectangle
        this.selectionStart = svgPoint;
        this.model.setSelectedElementId(null);
      }
    } else if (this.mode.startsWith('add')) {
      // For control structures, start selection rectangle
      if (
        this.mode === 'addLoop' ||
        this.mode === 'addAlt' ||
        this.mode === 'addOpt' ||
        this.mode === 'addPar' ||
        this.mode === 'addCritical' ||
        this.mode === 'addBreak' ||
        this.mode === 'addRect'
      ) {
        this.selectionStart = svgPoint;
      }
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    const svgPoint = this.renderer.screenToSVG(event.clientX, event.clientY);

    if (this.isDragging && this.draggedElement && this.dragStartPos && this.mode === 'select') {
      event.preventDefault();
      event.stopPropagation();

      const dx = svgPoint.x - this.dragStartPos.x;
      const dy = svgPoint.y - this.dragStartPos.y;

      // Only mark as moved if significant movement
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        this.hasMoved = true;
      }

      if (this.draggedElement.type === 'participant') {
        const participant = this.model.getParticipantById(this.draggedElement.id);
        if (participant) {
          this.model.moveParticipant(
            this.draggedElement.id,
            participant.x + dx,
            participant.y + dy
          );
        }
      } else if (this.draggedElement.type === 'message') {
        const message = this.model.getMessageById(this.draggedElement.id);
        if (message) {
          this.model.moveMessage(this.draggedElement.id, message.y + dy);
        }
      }

      this.dragStartPos = svgPoint;
    } else if (this.selectionStart) {
      // Draw selection rectangle
      this.updateSelectionRect(this.selectionStart, svgPoint);
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.draggedElement = null;
      this.dragStartPos = null;
    }

    if (this.selectionStart && this.mode !== 'select') {
      const svgPoint = this.renderer.screenToSVG(event.clientX, event.clientY);
      this.handleControlStructureCreation(this.selectionStart, svgPoint);
      this.selectionStart = null;
      this.clearSelectionRect();
    } else if (this.selectionStart) {
      this.selectionStart = null;
      this.clearSelectionRect();
    }
  }

  private handleClick(event: MouseEvent): void {
    // Don't handle click if we just dragged
    if (this.hasMoved) {
      this.hasMoved = false;
      return;
    }

    const svgPoint = this.renderer.screenToSVG(event.clientX, event.clientY);

    if (this.mode === 'addParticipant') {
      this.model.addParticipant('participant', svgPoint.x - 50, svgPoint.y);
      this.setMode('select');
    } else if (this.mode === 'addActor') {
      this.model.addParticipant('actor', svgPoint.x - 50, svgPoint.y);
      this.setMode('select');
    } else if (this.mode === 'addMessage') {
      // Two-click process for messages
      const lifelineId = this.getLifelineFromEvent(event);
      if (lifelineId) {
        if (!this.messageCreation) {
          // First click: select source
          this.messageCreation = {
            fromId: lifelineId,
            fromY: svgPoint.y
          };
        } else {
          // Second click: create message
          this.model.addMessage(
            this.messageCreation.fromId,
            lifelineId,
            '->>',
            this.messageCreation.fromY
          );
          this.messageCreation = null;
          this.setMode('select');
        }
      }
    } else if (this.mode === 'addNote') {
      const lifelineId = this.getLifelineFromEvent(event);
      if (lifelineId) {
        this.model.addNote('right', [lifelineId], svgPoint.y);
        this.setMode('select');
      }
    } else if (this.mode === 'select') {
      const element = this.getElementFromEvent(event);
      if (element) {
        this.model.setSelectedElementId(element.id);
      } else {
        this.model.setSelectedElementId(null);
      }
    }
  }

  private handleControlStructureCreation(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): void {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);

    if (width < 20 || height < 20) return; // Too small

    let type: 'loop' | 'alt' | 'opt' | 'par' | 'critical' | 'break' | 'rect';

    switch (this.mode) {
      case 'addLoop':
        type = 'loop';
        break;
      case 'addAlt':
        type = 'alt';
        break;
      case 'addOpt':
        type = 'opt';
        break;
      case 'addPar':
        type = 'par';
        break;
      case 'addCritical':
        type = 'critical';
        break;
      case 'addBreak':
        type = 'break';
        break;
      case 'addRect':
        type = 'rect';
        break;
      default:
        return;
    }

    // Calculate which messages fall within this region
    const diagram = this.model.getDiagram();
    const messagesInRange = diagram.messages.filter(
      m => m.y >= y && m.y <= y + height
    );

    const startOrder = messagesInRange.length > 0
      ? Math.min(...messagesInRange.map(m => m.order))
      : 0;
    const endOrder = messagesInRange.length > 0
      ? Math.max(...messagesInRange.map(m => m.order))
      : 0;

    this.model.addControlStructure(type, startOrder, endOrder, x, y, width, height);
    this.setMode('select');
  }

  private updateSelectionRect(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): void {
    const svg = this.renderer.getSVGElement();

    if (!this.selectionRect) {
      this.selectionRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      this.selectionRect.setAttribute('fill', 'rgba(33, 150, 243, 0.1)');
      this.selectionRect.setAttribute('stroke', '#2196f3');
      this.selectionRect.setAttribute('stroke-width', '1');
      this.selectionRect.setAttribute('stroke-dasharray', '3,3');
      svg.appendChild(this.selectionRect);
    }

    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);

    this.selectionRect.setAttribute('x', x.toString());
    this.selectionRect.setAttribute('y', y.toString());
    this.selectionRect.setAttribute('width', width.toString());
    this.selectionRect.setAttribute('height', height.toString());
  }

  private clearSelectionRect(): void {
    if (this.selectionRect) {
      this.selectionRect.remove();
      this.selectionRect = null;
    }
  }

  private getElementFromEvent(event: MouseEvent): { type: string; id: string } | null {
    let target = event.target as SVGElement | null;

    // Traverse up to find element with data-id
    while (target && target !== this.renderer.getSVGElement()) {
      const id = target.getAttribute('data-id');
      const type = target.getAttribute('data-type');

      if (id && type) {
        return { type, id };
      }

      target = target.parentElement as SVGElement | null;
    }

    return null;
  }

  private getLifelineFromEvent(event: MouseEvent): string | null {
    let target = event.target as SVGElement | null;

    // Traverse up to find lifeline
    while (target && target !== this.renderer.getSVGElement()) {
      const type = target.getAttribute('data-type');

      if (type === 'lifeline') {
        const participantId = target.getAttribute('data-participant-id');
        return participantId;
      }

      target = target.parentElement as SVGElement | null;
    }

    return null;
  }

  // Keyboard shortcuts
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedId = this.model.getSelectedElementId();
      if (selectedId) {
        const diagram = this.model.getDiagram();
        const participant = diagram.participants.find(p => p.id === selectedId);
        const message = diagram.messages.find(m => m.id === selectedId);
        const note = diagram.notes.find(n => n.id === selectedId);
        const cs = diagram.controlStructures.find(c => c.id === selectedId);

        if (participant) {
          this.model.deleteParticipant(selectedId);
        } else if (message) {
          this.model.deleteMessage(selectedId);
        } else if (note) {
          this.model.deleteNote(selectedId);
        } else if (cs) {
          this.model.deleteControlStructure(selectedId);
        }

        this.model.setSelectedElementId(null);
      }
    } else if (event.key === 'Escape') {
      this.setMode('select');
      this.model.setSelectedElementId(null);
    }
  }
}
