import type { SequenceDiagram, Participant, Message, Note } from '../models/types';
import { ParticipantType, ArrowType, NotePosition } from '../models/types';

interface Point {
  x: number;
  y: number;
}

interface DraggableElement {
  type: 'participant' | 'message' | 'note' | 'control';
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  data: any;
}

export class CanvasEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private diagram: SequenceDiagram;

  // Layout constants
  private readonly PARTICIPANT_WIDTH = 120;
  private readonly PARTICIPANT_HEIGHT = 60;
  private readonly PARTICIPANT_SPACING = 180;
  private readonly MESSAGE_HEIGHT = 40;
  private readonly TOP_MARGIN = 80;
  private readonly LIFELINE_START_Y = 140;

  // Drag state
  private isDragging = false;
  private dragTarget: DraggableElement | null = null;
  private dragOffset: Point = { x: 0, y: 0 };

  // Click state for message creation
  private messageCreationMode = false;
  private selectedLifeline: string | null = null;

  // Note creation mode
  private noteCreationMode = false;

  // Participant positions
  private participantPositions = new Map<string, number>();

  // Draggable elements
  private elements: DraggableElement[] = [];

  // Selection
  private selectedElement: DraggableElement | null = null;

  // Event callbacks
  public onSelectionChange?: (element: DraggableElement | null) => void;
  public onDiagramChange?: (diagram: SequenceDiagram) => void;

  constructor(canvas: HTMLCanvasElement, diagram: SequenceDiagram) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.diagram = diagram;

    this.setupCanvas();
    this.setupEventListeners();
    this.render();
  }

  private setupCanvas(): void {
    // Set canvas size
    const width = this.canvas.clientWidth || 800;
    const height = this.canvas.clientHeight || 600;

    this.canvas.width = width;
    this.canvas.height = Math.max(height, 600);

    console.log('Canvas size:', this.canvas.width, 'x', this.canvas.height);
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));

    window.addEventListener('resize', () => {
      this.setupCanvas();
      this.render();
    });
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const element = this.getElementAt(x, y);
    if (element && element.type === 'participant') {
      this.isDragging = true;
      this.dragTarget = element;
      this.dragOffset = {
        x: x - element.bounds.x,
        y: y - element.bounds.y,
      };
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isDragging && this.dragTarget) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.dragTarget.type === 'participant') {
        // Update participant position
        const newX = x - this.dragOffset.x;
        this.participantPositions.set(this.dragTarget.id, newX);
        this.render();
      }
    } else {
      // Cursor feedback
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const element = this.getElementAt(x, y);

      this.canvas.style.cursor = element ? 'pointer' : 'default';
    }
  }

  private handleMouseUp(): void {
    this.isDragging = false;
    this.dragTarget = null;
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const element = this.getElementAt(x, y);

    // Selection
    this.selectedElement = element;
    if (this.onSelectionChange) {
      this.onSelectionChange(element);
    }

    // Message creation mode
    if (this.messageCreationMode) {
      const lifeline = this.getLifelineAt(x, y);
      if (lifeline) {
        if (!this.selectedLifeline) {
          this.selectedLifeline = lifeline;
        } else {
          // Create message
          this.createMessage(this.selectedLifeline, lifeline, y);
          this.selectedLifeline = null;
          this.messageCreationMode = false;
        }
      }
    }

    // Note creation mode
    if (this.noteCreationMode) {
      const lifeline = this.getLifelineAt(x, y);
      if (lifeline) {
        this.createNote(lifeline, y);
        this.noteCreationMode = false;
      }
    }

    this.render();
  }

  private getElementAt(x: number, y: number): DraggableElement | null {
    for (const element of this.elements) {
      const bounds = element.bounds;
      if (
        x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height
      ) {
        return element;
      }
    }
    return null;
  }

  private getLifelineAt(x: number, y: number): string | null {
    for (const [id, posX] of this.participantPositions) {
      if (Math.abs(x - posX) < 20 && y > this.LIFELINE_START_Y) {
        return id;
      }
    }
    return null;
  }

  private createMessage(from: string, to: string, y: number): void {
    const message: Message = {
      id: `msg-${Date.now()}`,
      sender: from,
      receiver: to,
      arrowType: ArrowType.SOLID_ARROW,
      text: 'New Message',
    };

    this.diagram.elements.push({
      type: 'message',
      data: message,
    });

    if (this.onDiagramChange) {
      this.onDiagramChange(this.diagram);
    }

    this.render();
  }

  public updateDiagram(diagram: SequenceDiagram): void {
    this.diagram = diagram;
    this.render();
  }

  public enableMessageCreation(): void {
    this.messageCreationMode = true;
    this.selectedLifeline = null;
  }

  public enableNoteCreation(): void {
    this.noteCreationMode = true;
  }

  public addParticipant(participant: Participant): void {
    this.diagram.participants.push(participant);
    if (this.onDiagramChange) {
      this.onDiagramChange(this.diagram);
    }
    this.render();
  }

  private createNote(participantId: string, _y: number): void {
    const text = prompt('Enter note text:');
    if (!text) return;

    const position = prompt('Enter position (left/right/over):', 'right');
    if (!position) return;

    let notePosition = NotePosition.RIGHT;
    if (position.toLowerCase() === 'left') {
      notePosition = NotePosition.LEFT;
    } else if (position.toLowerCase() === 'over') {
      notePosition = NotePosition.OVER;
    }

    const note: Note = {
      id: `note-${Date.now()}`,
      position: notePosition,
      participants: [participantId],
      text: text,
    };

    this.diagram.elements.push({
      type: 'note',
      data: note,
    });

    if (this.onDiagramChange) {
      this.onDiagramChange(this.diagram);
    }

    this.render();
  }

  public render(): void {
    // Clear canvas with background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.elements = [];

    console.log('Rendering diagram with', this.diagram.participants.length, 'participants and', this.diagram.elements.length, 'elements');

    // Calculate participant positions
    this.calculateParticipantPositions();

    // Render participants
    this.renderParticipants();

    // Render messages and notes in sequence
    this.renderElements();

    // Render selection
    if (this.selectedElement) {
      this.renderSelection(this.selectedElement);
    }
  }

  private calculateParticipantPositions(): void {
    const participants = this.diagram.participants;
    const count = participants.length;

    // Calculate spacing based on canvas width
    const margin = 60; // Left and right margin
    const availableWidth = this.canvas.width - (2 * margin);
    const spacing = count > 1 ? availableWidth / (count - 1) : 0;

    console.log('Canvas width:', this.canvas.width, 'Participant count:', count, 'Spacing:', spacing);

    // Clear and recalculate all positions to adapt to canvas width changes
    this.participantPositions.clear();

    participants.forEach((participant, index) => {
      const x = count === 1
        ? this.canvas.width / 2  // Center single participant
        : margin + (index * spacing);
      this.participantPositions.set(participant.id, x);
    });
  }

  private renderParticipants(): void {
    for (const participant of this.diagram.participants) {
      const x = this.participantPositions.get(participant.id) || 0;
      const y = this.TOP_MARGIN;

      // Draw participant box or actor
      if (participant.type === ParticipantType.PARTICIPANT) {
        this.drawParticipantBox(x, y, participant.label || participant.id);
      } else {
        this.drawActor(x, y, participant.label || participant.id);
      }

      // Draw lifeline
      this.drawLifeline(x, this.LIFELINE_START_Y);

      // Add to draggable elements
      this.elements.push({
        type: 'participant',
        id: participant.id,
        bounds: {
          x: x - this.PARTICIPANT_WIDTH / 2,
          y,
          width: this.PARTICIPANT_WIDTH,
          height: this.PARTICIPANT_HEIGHT,
        },
        data: participant,
      });
    }
  }

  private drawParticipantBox(x: number, y: number, label: string): void {
    this.ctx.fillStyle = '#E3F2FD';
    this.ctx.strokeStyle = '#1976D2';
    this.ctx.lineWidth = 2;

    const boxX = x - this.PARTICIPANT_WIDTH / 2;
    const boxY = y;

    this.ctx.fillRect(boxX, boxY, this.PARTICIPANT_WIDTH, this.PARTICIPANT_HEIGHT);
    this.ctx.strokeRect(boxX, boxY, this.PARTICIPANT_WIDTH, this.PARTICIPANT_HEIGHT);

    // Draw label
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, x, y + this.PARTICIPANT_HEIGHT / 2);
  }

  private drawActor(x: number, y: number, label: string): void {
    this.ctx.strokeStyle = '#1976D2';
    this.ctx.fillStyle = '#E3F2FD';
    this.ctx.lineWidth = 2;

    // Head
    this.ctx.beginPath();
    this.ctx.arc(x, y + 15, 10, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Body
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + 25);
    this.ctx.lineTo(x, y + 45);
    this.ctx.stroke();

    // Arms
    this.ctx.beginPath();
    this.ctx.moveTo(x - 15, y + 35);
    this.ctx.lineTo(x + 15, y + 35);
    this.ctx.stroke();

    // Legs
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + 45);
    this.ctx.lineTo(x - 10, y + 60);
    this.ctx.moveTo(x, y + 45);
    this.ctx.lineTo(x + 10, y + 60);
    this.ctx.stroke();

    // Label
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(label, x, y + 75);
  }

  private drawLifeline(x: number, startY: number): void {
    this.ctx.strokeStyle = '#999';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);

    this.ctx.beginPath();
    this.ctx.moveTo(x, startY);
    this.ctx.lineTo(x, this.canvas.height - 50);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
  }

  private renderElements(): void {
    let currentY = this.LIFELINE_START_Y + 40;

    const messageCount = this.diagram.elements.filter(e => e.type === 'message').length;
    const noteCount = this.diagram.elements.filter(e => e.type === 'note').length;

    console.log('Rendering', messageCount, 'messages and', noteCount, 'notes');
    console.log('Participant positions:', Array.from(this.participantPositions.entries()));

    for (const element of this.diagram.elements) {
      if (element.type === 'message') {
        const message = element.data as Message;
        const fromX = this.participantPositions.get(message.sender) || 0;
        const toX = this.participantPositions.get(message.receiver) || 0;

        console.log('Drawing message from', message.sender, 'to', message.receiver, 'at y=', currentY);
        this.drawMessage(fromX, toX, currentY, message);
        currentY += this.MESSAGE_HEIGHT;
      } else if (element.type === 'note') {
        const note = element.data as Note;
        const participantId = note.participants[0];
        const x = this.participantPositions.get(participantId) || 0;

        console.log('Drawing note for', participantId, 'at y=', currentY);
        this.drawNote(x, currentY, note);
        currentY += this.MESSAGE_HEIGHT;
      }
    }
  }

  private drawMessage(
    fromX: number,
    toX: number,
    y: number,
    message: Message
  ): void {
    this.ctx.strokeStyle = '#333';
    this.ctx.fillStyle = '#333';
    this.ctx.lineWidth = 2;

    // Arrow line
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, y);
    this.ctx.lineTo(toX, y);
    this.ctx.stroke();

    // Arrowhead
    const direction = toX > fromX ? 1 : -1;
    const arrowSize = 8;

    this.ctx.beginPath();
    this.ctx.moveTo(toX, y);
    this.ctx.lineTo(toX - direction * arrowSize, y - arrowSize / 2);
    this.ctx.lineTo(toX - direction * arrowSize, y + arrowSize / 2);
    this.ctx.closePath();
    this.ctx.fill();

    // Label
    if (message.text) {
      this.ctx.fillStyle = '#000';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(message.text, (fromX + toX) / 2, y - 10);
    }
  }

  private drawNote(x: number, y: number, note: Note): void {
    const noteWidth = 140;
    const noteHeight = 60;
    let noteX = x;

    // Position based on note position
    if (note.position === NotePosition.RIGHT || note.position === 'right of') {
      noteX = x + 20;
    } else if (note.position === NotePosition.LEFT || note.position === 'left of') {
      noteX = x - noteWidth - 20;
    } else if (note.position === NotePosition.OVER || note.position === 'over') {
      noteX = x - noteWidth / 2;
    }

    // Draw note background
    this.ctx.fillStyle = '#FFF9C4';
    this.ctx.strokeStyle = '#F57C00';
    this.ctx.lineWidth = 2;

    // Draw main rectangle
    this.ctx.fillRect(noteX, y - 30, noteWidth, noteHeight);
    this.ctx.strokeRect(noteX, y - 30, noteWidth, noteHeight);

    // Draw folded corner
    const cornerSize = 10;
    this.ctx.beginPath();
    this.ctx.moveTo(noteX + noteWidth - cornerSize, y - 30);
    this.ctx.lineTo(noteX + noteWidth, y - 30 + cornerSize);
    this.ctx.lineTo(noteX + noteWidth, y - 30);
    this.ctx.closePath();
    this.ctx.fillStyle = '#FFE082';
    this.ctx.fill();
    this.ctx.stroke();

    // Draw text
    this.ctx.fillStyle = '#000';
    this.ctx.font = '11px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Word wrap text
    const words = note.text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = this.ctx.measureText(testLine);
      if (metrics.width > noteWidth - 10 && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    // Draw lines
    const lineHeight = 14;
    const startY = y - 30 + noteHeight / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
      this.ctx.fillText(line, noteX + noteWidth / 2, startY + i * lineHeight);
    });
  }

  private renderSelection(element: DraggableElement): void {
    this.ctx.strokeStyle = '#FF5722';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([5, 5]);

    const bounds = element.bounds;
    this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    this.ctx.setLineDash([]);
  }

  public dispose(): void {
    // Cleanup
  }
}
