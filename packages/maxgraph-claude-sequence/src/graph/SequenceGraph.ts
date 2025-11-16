import { Graph, Cell, InternalEvent, GraphDataModel } from '@maxgraph/core';
import type { CellStyle } from '@maxgraph/core';
import type { Participant, Message, ParticipantType, ArrowType } from '../model/types';
import { SequenceDiagramModel } from '../model/DiagramModel';

export class SequenceGraph {
  private graph: Graph;
  private model: SequenceDiagramModel;
  private participantCells: Map<string, Cell> = new Map();
  private lifelineCells: Map<string, Cell> = new Map();
  private messageCells: Map<string, Cell> = new Map();
  private tempEdge: { sourceId: string; sourceCell: Cell } | null = null;

  constructor(container: HTMLElement, model: SequenceDiagramModel) {
    this.model = model;

    // Disable context menu
    InternalEvent.disableContextMenu(container);

    // Initialize graph
    const graphModel = new GraphDataModel();
    this.graph = new Graph(container, graphModel);

    // Configure graph
    this.configureGraph();
    this.setupEventHandlers();
    this.setupStyles();

    // Listen to model changes
    this.model.onChange(() => this.refresh());
  }

  private configureGraph(): void {
    // Enable panning with right mouse button
    this.graph.setPanning(true);

    // Disable cell editing by default (use property panel instead)
    this.graph.setCellsEditable(false);

    // Enable cell selection
    this.graph.setCellsSelectable(true);

    // Disable cell resizing for participants (we'll handle this separately)
    this.graph.setCellsResizable(false);

    // Enable cell movement
    this.graph.setCellsMovable(true);

    // Disable default connection creation
    this.graph.setConnectable(false);
  }

  private setupStyles(): void {
    const stylesheet = this.graph.getStylesheet();

    // Participant style (rectangle)
    const participantStyle: CellStyle = {
      shape: 'rectangle',
      fillColor: '#E8F5E9',
      strokeColor: '#4CAF50',
      strokeWidth: 2,
      fontColor: '#000000',
      fontSize: 12,
      rounded: true,
    };
    stylesheet.putCellStyle('participant', participantStyle);

    // Actor style (ellipse for head + rectangle for body)
    const actorStyle: CellStyle = {
      shape: 'ellipse',
      fillColor: '#FFF3E0',
      strokeColor: '#FF9800',
      strokeWidth: 2,
      fontColor: '#000000',
      fontSize: 12,
    };
    stylesheet.putCellStyle('actor', actorStyle);

    // Lifeline style (dashed vertical line)
    const lifelineStyle: CellStyle = {
      shape: 'line',
      strokeColor: '#999999',
      strokeWidth: 1,
      dashed: true,
      edgeStyle: 'none',
    };
    stylesheet.putCellStyle('lifeline', lifelineStyle);

    // Message styles for different arrow types
    this.setupMessageStyles(stylesheet);
  }

  private setupMessageStyles(stylesheet: any): void {
    const baseMessageStyle: CellStyle = {
      strokeWidth: 2,
      fontSize: 11,
      fontColor: '#000000',
    };

    // Solid line with arrowhead
    stylesheet.putCellStyle('message-solid-arrow', {
      ...baseMessageStyle,
      strokeColor: '#2196F3',
      endArrow: 'classic',
      dashed: false,
    });

    // Dashed line with arrowhead
    stylesheet.putCellStyle('message-dashed-arrow', {
      ...baseMessageStyle,
      strokeColor: '#2196F3',
      endArrow: 'classic',
      dashed: true,
    });

    // Solid line, no arrowhead
    stylesheet.putCellStyle('message-solid', {
      ...baseMessageStyle,
      strokeColor: '#2196F3',
      endArrow: 'none',
      dashed: false,
    });

    // Dashed line, no arrowhead
    stylesheet.putCellStyle('message-dashed', {
      ...baseMessageStyle,
      strokeColor: '#2196F3',
      endArrow: 'none',
      dashed: true,
    });

    // Solid line with X at end
    stylesheet.putCellStyle('message-solid-cross', {
      ...baseMessageStyle,
      strokeColor: '#F44336',
      endArrow: 'cross',
      dashed: false,
    });

    // Dashed line with X at end
    stylesheet.putCellStyle('message-dashed-cross', {
      ...baseMessageStyle,
      strokeColor: '#F44336',
      endArrow: 'cross',
      dashed: true,
    });

    // Solid line with open arrowhead
    stylesheet.putCellStyle('message-solid-open', {
      ...baseMessageStyle,
      strokeColor: '#2196F3',
      endArrow: 'open',
      dashed: false,
    });

    // Dashed line with open arrowhead
    stylesheet.putCellStyle('message-dashed-open', {
      ...baseMessageStyle,
      strokeColor: '#2196F3',
      endArrow: 'open',
      dashed: true,
    });

    // Both ends arrows
    stylesheet.putCellStyle('message-both-solid', {
      ...baseMessageStyle,
      strokeColor: '#2196F3',
      startArrow: 'classic',
      endArrow: 'classic',
      dashed: false,
    });

    stylesheet.putCellStyle('message-both-dashed', {
      ...baseMessageStyle,
      strokeColor: '#2196F3',
      startArrow: 'classic',
      endArrow: 'classic',
      dashed: true,
    });
  }

  private setupEventHandlers(): void {
    // Handle cell selection
    this.graph.addListener(InternalEvent.CLICK, (_sender: any, evt: any) => {
      const cell = evt.getProperty('cell');
      const mouseEvent = evt.getProperty('event');
      if (cell) {
        this.handleCellClick(cell, mouseEvent);
      }
    });

    // Handle cell movement
    this.graph.addListener(InternalEvent.CELLS_MOVED, (_sender: any, evt: any) => {
      const cells = evt.getProperty('cells');
      this.handleCellsMoved(cells);
    });
  }

  private handleCellClick(cell: Cell, mouseEvent?: MouseEvent): void {
    const cellId = cell.getId();
    if (!cellId) return;

    // Check if it's a lifeline click for message creation
    // Lifeline IDs are in format: participantId_lifeline
    const participantId = this.getParticipantIdFromLifeline(cellId);
    if (participantId) {
      this.handleLifelineClick(participantId, cell, mouseEvent);
    }
  }

  private getParticipantIdFromLifeline(cellId: string): string | null {
    // Check if this cell is a lifeline
    for (const [pid, lifelineCell] of this.lifelineCells.entries()) {
      if (lifelineCell.getId() === cellId) {
        return pid;
      }
    }
    return null;
  }

  private handleLifelineClick(participantId: string, lifelineCell: Cell, mouseEvent?: MouseEvent): void {
    if (!this.tempEdge) {
      // First click - start edge creation
      this.tempEdge = {
        sourceId: participantId,
        sourceCell: lifelineCell,
      };
      console.log('Message creation started from:', participantId);
    } else {
      // Second click - complete edge creation
      if (this.tempEdge.sourceId !== participantId) {
        // Get Y coordinate from mouse event
        let mouseY = 150;
        if (mouseEvent) {
          const container = this.graph.getContainer();
          const rect = container.getBoundingClientRect();
          mouseY = mouseEvent.clientY - rect.top;
        } else {
          const geometry = lifelineCell.getGeometry();
          mouseY = geometry ? geometry.y : 150;
        }
        this.createMessage(this.tempEdge.sourceId, participantId, mouseY);
      }
      this.tempEdge = null;
    }
  }

  private handleCellsMoved(cells: Cell[]): void {
    cells.forEach(cell => {
      const cellId = cell.getId();
      if (!cellId) return;

      const geometry = cell.getGeometry();
      if (!geometry) return;

      // Update participant position in model
      const participant = this.model.getParticipant(cellId);
      if (participant) {
        // Update participant position (this will also update lifeline)
        participant.x = geometry.x;
        participant.y = geometry.y;

        // Update lifeline position
        const lifelineCell = this.lifelineCells.get(cellId);
        if (lifelineCell) {
          const width = 100;
          const height = participant.type === 'actor' ? 40 : 60;
          const lifelineGeometry = lifelineCell.getGeometry();
          if (lifelineGeometry) {
            lifelineGeometry.x = geometry.x + width / 2 - 1;
            lifelineGeometry.y = geometry.y + height;
          }
        }
      }

      // Update message position
      const message = this.model.getMessage(cellId);
      if (message) {
        message.y = geometry.y;
        // Reorder messages based on Y position
        this.model.getAllMessages().sort((a, b) => a.y - b.y);
        this.model.getAllMessages().forEach((msg, index) => {
          msg.order = index;
        });
      }
    });
  }

  // Public API for creating elements
  public createParticipant(x: number, y: number, type: ParticipantType, label: string): string {
    const id = `${type}_${Date.now()}`;
    const participant: Participant = {
      id,
      type,
      label,
      x,
      y,
    };

    this.model.addParticipant(participant);
    return id;
  }

  private createMessage(fromId: string, toId: string, clickY?: number): void {
    const id = `msg_${Date.now()}`;

    // Use click position if provided, otherwise calculate based on existing messages
    let y: number;
    if (clickY !== undefined) {
      y = clickY;
    } else {
      const messages = this.model.getAllMessages();
      const lastMessage = messages[messages.length - 1];
      y = lastMessage ? lastMessage.y + 60 : 150;
    }

    const messages = this.model.getAllMessages();
    const message: Message = {
      id,
      fromId,
      toId,
      arrowType: '->>',
      text: '',
      order: messages.length,
      y,
    };

    this.model.addMessage(message);
  }

  public updateParticipantType(id: string, type: ParticipantType): void {
    this.model.updateParticipant(id, { type });
  }

  public updateMessageArrowType(id: string, arrowType: ArrowType): void {
    this.model.updateMessage(id, { arrowType });
  }

  public updateMessageText(id: string, text: string): void {
    this.model.updateMessage(id, { text });
  }

  private getMessageStyle(arrowType: ArrowType): string {
    const styleMap: Record<ArrowType, string> = {
      '->': 'message-solid',
      '-->': 'message-dashed',
      '->>': 'message-solid-arrow',
      '-->>': 'message-dashed-arrow',
      '<<->>': 'message-both-solid',
      '<<-->>': 'message-both-dashed',
      '-x': 'message-solid-cross',
      '--x': 'message-dashed-cross',
      '-)': 'message-solid-open',
      '--))': 'message-dashed-open',
    };
    return styleMap[arrowType] || 'message-solid-arrow';
  }

  private refresh(): void {
    const graphModel = this.graph.getDataModel();
    const parent = this.graph.getDefaultParent();

    graphModel.beginUpdate();
    try {
      // Clear existing cells
      const children = parent?.children;
      if (children && children.length > 0) {
        this.graph.removeCells(children);
      }
      this.participantCells.clear();
      this.lifelineCells.clear();
      this.messageCells.clear();

      // Render participants and lifelines
      const participants = this.model.getAllParticipants();
      participants.forEach(participant => {
        this.renderParticipant(participant, parent);
      });

      // Render messages
      const messages = this.model.getAllMessages();
      messages.forEach(message => {
        this.renderMessage(message, parent);
      });
    } finally {
      graphModel.endUpdate();
    }
  }

  private renderParticipant(participant: Participant, parent: Cell): void {
    const { id, type, label, x, y } = participant;

    // Create participant cell (head)
    const style = type === 'actor' ? 'actor' : 'participant';
    const width = 100;
    const height = type === 'actor' ? 40 : 60;

    const cell = this.graph.insertVertex({
      parent,
      id,
      value: label,
      position: [x, y],
      size: [width, height],
      style: { baseStyleNames: [style] },
    });

    this.participantCells.set(id, cell);

    // Create lifeline (vertical dashed line)
    // We'll create a thin rectangle to simulate a vertical line
    const lifelineHeight = 500;
    const lifelineX = x + width / 2 - 1; // Center it
    const lifelineY = y + height;

    const lifelineCell = this.graph.insertVertex({
      parent,
      id: `${id}_lifeline`,
      value: '',
      position: [lifelineX, lifelineY],
      size: [2, lifelineHeight],
      style: {
        shape: 'rectangle',
        strokeColor: '#CCCCCC',
        strokeWidth: 1,
        dashed: true,
        dashPattern: '3 3',
        fillColor: '#FFFFFF',
        opacity: 50,
        resizable: false,
        movable: false,
        editable: false,
      },
    });

    this.lifelineCells.set(id, lifelineCell);
  }

  private renderMessage(message: Message, parent: Cell): void {
    const { id, fromId, toId, arrowType, text, y } = message;

    const fromParticipant = this.model.getParticipant(fromId);
    const toParticipant = this.model.getParticipant(toId);

    if (!fromParticipant || !toParticipant) return;

    const styleName = this.getMessageStyle(arrowType);

    const edge = this.graph.insertEdge({
      parent,
      id,
      value: text,
      source: this.lifelineCells.get(fromId),
      target: this.lifelineCells.get(toId),
      style: {
        baseStyleNames: [styleName],
        exitX: 0.5,
        exitY: (y - (fromParticipant.y + 60)) / 500,
        entryX: 0.5,
        entryY: (y - (toParticipant.y + 60)) / 500,
      },
    });

    this.messageCells.set(id, edge);
  }

  public getGraph(): Graph {
    return this.graph;
  }

  public getSelectedCell(): Cell | null {
    const selected = this.graph.getSelectionCells();
    return selected.length > 0 ? selected[0] : null;
  }

  public getSelectedId(): string | null {
    const cell = this.getSelectedCell();
    return cell ? cell.getId() : null;
  }
}
