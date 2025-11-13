import type { DiagramModel } from '../model/DiagramModel';
import type { Canvas2DRenderer, Point, DraggableElement } from '../renderer/Canvas2DRenderer';
import type { SelectedElement } from '../ui/PropertyPanel';
import type { ArrowType, Message } from '../model/types';

type InteractionMode = 'select' | 'add-participant' | 'add-actor' | 'create-edge' | 'rectangle-select';

/**
 * Canvas2DInteractionHandler manages interactions for 2D canvas
 */
export class Canvas2DInteractionHandler {
  private canvas: HTMLCanvasElement;
  private renderer: Canvas2DRenderer;
  private model: DiagramModel;
  private mode: InteractionMode = 'select';

  // Callbacks
  private onSelectCallback?: (element: SelectedElement) => void;

  // Drag state
  private isDragging = false;
  private dragElement: DraggableElement | null = null;
  private dragStartPoint: Point | null = null;
  private dragOffset: Point = { x: 0, y: 0 };

  // Resize state
  private isResizing = false;
  private resizeElement: DraggableElement | null = null;
  private resizeHandle: 'tl' | 'tr' | 'bl' | 'br' | null = null;
  private resizeStartBounds: { x: number; y: number; width: number; height: number } | null = null;

  // Edge creation state
  private edgeCreationStart: string | null = null; // participant id
  private pendingEdgeType: ArrowType = '->>';

  // Rectangle selection state
  private isRectangleSelecting = false;
  private rectangleStart: Point | null = null;
  private rectangleCurrent: Point | null = null;

  // Add participant/actor state
  private pendingParticipantType: 'participant' | 'actor' | null = null;

  // Edge handle dragging state
  private isDraggingEdgeHandle = false;
  private edgeHandleType: 'start' | 'end' | null = null;
  private edgeHandleMessage: { message: Message; index: number } | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    renderer: Canvas2DRenderer,
    model: DiagramModel,
    options?: {
      onSelect?: (element: SelectedElement) => void;
    }
  ) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.model = model;
    this.onSelectCallback = options?.onSelect;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('click', (e) => this.onClick(e));
  }

  /**
   * Set interaction mode
   */
  setMode(mode: InteractionMode, options?: any): void {
    this.mode = mode;

    if (mode === 'add-participant') {
      this.pendingParticipantType = 'participant';
      this.canvas.style.cursor = 'crosshair';
    } else if (mode === 'add-actor') {
      this.pendingParticipantType = 'actor';
      this.canvas.style.cursor = 'crosshair';
    } else if (mode === 'create-edge') {
      this.pendingEdgeType = options?.arrowType || '->>';
      this.edgeCreationStart = null;
      this.canvas.style.cursor = 'crosshair';
    } else if (mode === 'rectangle-select') {
      this.canvas.style.cursor = 'crosshair';
    } else {
      this.pendingParticipantType = null;
      this.edgeCreationStart = null;
      this.canvas.style.cursor = 'default';
    }
  }

  private getCanvasPoint(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const point = this.getCanvasPoint(e);

    if (this.mode === 'select') {
      // Check if clicking on edge handle first
      const edgeHandle = this.renderer.getEdgeHandle(point);
      if (edgeHandle) {
        this.isDraggingEdgeHandle = true;
        this.edgeHandleType = edgeHandle.type;
        this.edgeHandleMessage = { message: edgeHandle.message, index: edgeHandle.index };
        this.canvas.style.cursor = 'grabbing';
        return;
      }

      const element = this.renderer.getElementAtPoint(point);

      if (element) {
        // Check if clicking on a resize handle
        if (element.type === 'controlStructure') {
          const handle = this.getResizeHandle(point, element);
          if (handle) {
            this.isResizing = true;
            this.resizeElement = element;
            this.resizeHandle = handle;
            this.resizeStartBounds = { ...element.bounds };
            this.dragStartPoint = point;
            // Clear edge handles when resizing
            this.renderer.setSelectedMessage(null, null);
            return;
          }
        }

        // Regular drag
        this.isDragging = true;
        this.dragElement = element;
        this.dragStartPoint = point;

        // Clear edge handles when dragging non-message elements
        if (element.type !== 'message') {
          this.renderer.setSelectedMessage(null, null);
        }

        if (element.type === 'participant') {
          this.dragOffset = {
            x: point.x - element.bounds.x,
            y: point.y - element.bounds.y
          };
        } else if (element.type === 'message') {
          this.dragOffset = {
            x: 0,
            y: point.y - element.bounds.y
          };
        } else if (element.type === 'controlStructure') {
          this.dragOffset = {
            x: point.x - element.bounds.x,
            y: point.y - element.bounds.y
          };
        } else if (element.type === 'note') {
          this.dragOffset = {
            x: point.x - element.bounds.x,
            y: point.y - element.bounds.y
          };
        }
      }
    } else if (this.mode === 'rectangle-select') {
      this.isRectangleSelecting = true;
      this.rectangleStart = point;
    }
  }

  private getResizeHandle(point: Point, element: DraggableElement): 'tl' | 'tr' | 'bl' | 'br' | null {
    const handleSize = 8;
    const { x, y, width, height } = element.bounds;

    // Top-left
    if (point.x >= x && point.x <= x + handleSize && point.y >= y && point.y <= y + handleSize) {
      return 'tl';
    }
    // Top-right
    if (point.x >= x + width - handleSize && point.x <= x + width && point.y >= y && point.y <= y + handleSize) {
      return 'tr';
    }
    // Bottom-left
    if (point.x >= x && point.x <= x + handleSize && point.y >= y + height - handleSize && point.y <= y + height) {
      return 'bl';
    }
    // Bottom-right
    if (point.x >= x + width - handleSize && point.x <= x + width && point.y >= y + height - handleSize && point.y <= y + height) {
      return 'br';
    }

    return null;
  }

  private onMouseMove(e: MouseEvent): void {
    const point = this.getCanvasPoint(e);

    if (this.isDraggingEdgeHandle) {
      // Update cursor during edge handle drag
      const lifeline = this.renderer.getLifelineAtPoint(point);
      if (lifeline) {
        this.canvas.style.cursor = 'alias'; // Valid drop target
      } else {
        this.canvas.style.cursor = 'not-allowed'; // Invalid drop target
      }
      return;
    } else if (this.isResizing && this.resizeElement && this.resizeHandle && this.dragStartPoint && this.resizeStartBounds) {
      // Resize control structure
      const dx = point.x - this.dragStartPoint.x;
      const dy = point.y - this.dragStartPoint.y;

      const newBounds = { ...this.resizeStartBounds };

      switch (this.resizeHandle) {
        case 'tl':
          newBounds.x += dx;
          newBounds.y += dy;
          newBounds.width -= dx;
          newBounds.height -= dy;
          break;
        case 'tr':
          newBounds.y += dy;
          newBounds.width += dx;
          newBounds.height -= dy;
          break;
        case 'bl':
          newBounds.x += dx;
          newBounds.width -= dx;
          newBounds.height += dy;
          break;
        case 'br':
          newBounds.width += dx;
          newBounds.height += dy;
          break;
      }

      // Minimum size
      if (newBounds.width >= 100 && newBounds.height >= 60) {
        // Update resizeElement bounds for mouse up
        this.resizeElement.bounds = newBounds;
        // Don't persist during resize to avoid frequent updates
        this.renderer.updateControlStructureBounds(this.resizeElement.data.index, newBounds, true, false);
      }
    } else if (this.isDragging && this.dragElement) {
      if (this.dragElement.type === 'participant') {
        // Drag participant
        this.renderer.updateParticipantPosition(this.dragElement.id, {
          x: point.x - this.dragOffset.x,
          y: point.y - this.dragOffset.y
        });
      } else if (this.dragElement.type === 'message') {
        // Drag message vertically
        const messageData = this.dragElement.data;

        // If message is inside a structure, use object-based update
        if (messageData.parentStructure) {
          this.renderer.updateMessagePositionByObject(messageData.message, point.y);
        } else {
          // Top-level message, use index-based update
          this.renderer.updateMessagePosition(messageData.index, point.y);
        }

        // Update the Y coordinate in dragElement data for containment check on mouse up
        this.dragElement.data.y = point.y;
      } else if (this.dragElement.type === 'controlStructure') {
        // Drag control structure
        const newBounds = {
          x: point.x - this.dragOffset.x,
          y: point.y - this.dragOffset.y,
          width: this.dragElement.bounds.width,
          height: this.dragElement.bounds.height
        };
        // Update dragElement bounds so it's available at mouse up
        this.dragElement.bounds = newBounds;
        // Don't persist to model during drag to avoid frequent updates
        this.renderer.updateControlStructureBounds(this.dragElement.data.index, newBounds, false, false);
      } else if (this.dragElement.type === 'note') {
        // Drag note
        this.renderer.updateNotePosition(this.dragElement.data.index, {
          x: point.x - this.dragOffset.x,
          y: point.y - this.dragOffset.y
        });
      }
    }

    // Update rectangle selection
    if (this.isRectangleSelecting && this.rectangleStart) {
      this.rectangleCurrent = point;
      this.drawSelectionRectangle();
    }

    // Update cursor based on hover
    if (this.mode === 'select' && !this.isDragging && !this.isResizing && !this.isDraggingEdgeHandle) {
      // Check for edge handle hover
      const edgeHandle = this.renderer.getEdgeHandle(point);
      if (edgeHandle) {
        this.canvas.style.cursor = 'grab';
        return;
      }

      const element = this.renderer.getElementAtPoint(point);
      if (element && element.type === 'controlStructure') {
        const handle = this.getResizeHandle(point, element);
        if (handle) {
          // Set cursor for resize handles
          const cursors = {
            'tl': 'nwse-resize',
            'tr': 'nesw-resize',
            'bl': 'nesw-resize',
            'br': 'nwse-resize'
          };
          this.canvas.style.cursor = cursors[handle];
        } else {
          this.canvas.style.cursor = 'move';
        }
      } else {
        this.canvas.style.cursor = element ? 'move' : 'default';
      }
    } else if (this.mode === 'create-edge') {
      const lifeline = this.renderer.getLifelineAtPoint(point);
      this.canvas.style.cursor = lifeline ? 'pointer' : 'crosshair';
    }
  }

  private onMouseUp(e: MouseEvent): void {
    const point = this.getCanvasPoint(e);
    const wasDragging = this.isDragging;
    const wasResizing = this.isResizing;
    const wasDraggingEdgeHandle = this.isDraggingEdgeHandle;

    if (this.isDraggingEdgeHandle && this.edgeHandleMessage && this.edgeHandleType) {
      const lifeline = this.renderer.getLifelineAtPoint(point);

      if (lifeline) {
        // Update the message connection
        const updatedMessage = { ...this.edgeHandleMessage.message };
        if (this.edgeHandleType === 'start') {
          updatedMessage.sender = lifeline;
        } else {
          updatedMessage.receiver = lifeline;
        }

        this.model.updateStatement(this.edgeHandleMessage.index, updatedMessage);

        // Update the selected message in renderer
        this.renderer.setSelectedMessage(updatedMessage, this.edgeHandleMessage.index);
      }

      this.isDraggingEdgeHandle = false;
      this.edgeHandleType = null;
      this.edgeHandleMessage = null;
      this.canvas.style.cursor = 'default';
    }

    if (this.isDragging) {
      // If we were dragging a control structure, finalize containment and persist
      if (this.dragElement?.type === 'controlStructure') {
        this.renderer.updateControlStructureBounds(
          this.dragElement.data.index,
          this.dragElement.bounds,
          true, // Update containment on drag end
          true  // Persist to model
        );
      }
      // If we were dragging a message, check containment
      else if (this.dragElement?.type === 'message') {
        this.renderer.updateMessageContainment({
          message: this.dragElement.data.message,
          y: this.dragElement.data.y,
          parentStructure: this.dragElement.data.parentStructure
        });
      }

      this.isDragging = false;
      this.dragElement = null;
      this.dragStartPoint = null;
    }

    if (this.isResizing) {
      // Finalize resize and persist to model
      if (this.resizeElement) {
        this.renderer.updateControlStructureBounds(
          this.resizeElement.data.index,
          this.resizeElement.bounds,
          true, // Update containment
          true  // Persist to model
        );
      }

      this.isResizing = false;
      this.resizeElement = null;
      this.resizeHandle = null;
      this.resizeStartBounds = null;
      this.dragStartPoint = null;
    }

    if (this.isRectangleSelecting && this.rectangleStart) {
      this.handleRectangleSelection(this.rectangleStart, point);
      this.isRectangleSelecting = false;
      this.rectangleStart = null;
    }

    // If we weren't dragging, resizing, or dragging edge handle, treat as a click for selection
    if (!wasDragging && !wasResizing && !wasDraggingEdgeHandle && this.mode === 'select') {
      const element = this.renderer.getElementAtPoint(point);
      this.handleSelection(element);
    }
  }

  private onClick(e: MouseEvent): void {
    const point = this.getCanvasPoint(e);

    if (this.mode === 'add-participant' && this.pendingParticipantType) {
      this.handleAddParticipant(point, this.pendingParticipantType);
      this.setMode('select');
    } else if (this.mode === 'add-actor' && this.pendingParticipantType) {
      this.handleAddParticipant(point, this.pendingParticipantType);
      this.setMode('select');
    } else if (this.mode === 'create-edge') {
      this.handleEdgeCreation(point);
    } else if (this.mode === 'select') {
      const element = this.renderer.getElementAtPoint(point);
      this.handleSelection(element);
    }
  }

  private handleAddParticipant(point: Point, type: 'participant' | 'actor'): void {
    // Generate auto ID based on type
    const prefix = type === 'actor' ? 'act' : 'part';
    const id = this.model.generateId(prefix);

    const participant = {
      id,
      type,
      label: id, // Use ID as default label
      links: []
    };

    this.renderer.addParticipantAtPosition(participant, {
      x: point.x - 60, // Center on click
      y: point.y - 25
    });

    // Auto-select the newly created participant
    if (this.onSelectCallback) {
      this.onSelectCallback({ type: 'participant', data: participant });
    }
  }

  private handleEdgeCreation(point: Point): void {
    const lifeline = this.renderer.getLifelineAtPoint(point);

    if (!lifeline) return;

    if (!this.edgeCreationStart) {
      // First click: set start
      this.edgeCreationStart = lifeline;
      this.canvas.style.cursor = 'crosshair';
    } else {
      // Second click: create edge
      const sender = this.edgeCreationStart;
      const receiver = lifeline;

      const message: Message = {
        sender,
        receiver,
        arrow: this.pendingEdgeType,
        text: undefined // Will be edited in PropertyPanel
      };

      // Check if the click point is inside a control structure
      const statements = this.model.getStatements();
      let addedToStructure = false;

      statements.forEach((stmt, index) => {
        if (!addedToStructure && 'type' in stmt && stmt.type && (stmt as any).bounds) {
          const bounds = (stmt as any).bounds;
          const isInside =
            point.y >= bounds.y + 25 &&
            point.y <= bounds.y + bounds.height - 10 &&
            point.x >= bounds.x &&
            point.x <= bounds.x + bounds.width;

          if (isInside) {
            // Add message to this structure
            if ('statements' in stmt) {
              (stmt as any).statements.push(message);
            } else if ('branches' in stmt && (stmt as any).branches.length > 0) {
              (stmt as any).branches[0].statements.push(message);
            }
            this.model.updateStatement(index, stmt);
            addedToStructure = true;
          }
        }
      });

      if (!addedToStructure) {
        // Add to top level
        this.model.addStatement(message);
      }

      // Auto-select the newly created message
      if (this.onSelectCallback) {
        const index = this.model.getStatements().length - 1;
        this.onSelectCallback({ type: 'message', data: message, index });
      }

      // Reset
      this.edgeCreationStart = null;
      this.setMode('select');
    }
  }

  private handleSelection(element: DraggableElement | null): void {
    if (!this.onSelectCallback) return;

    if (!element) {
      this.onSelectCallback(null);
      this.renderer.setSelectedMessage(null, null);
      return;
    }

    switch (element.type) {
      case 'participant':
        this.renderer.setSelectedMessage(null, null);
        this.onSelectCallback({
          type: 'participant',
          data: element.data
        });
        break;

      case 'message':
        this.renderer.setSelectedMessage(element.data.message, element.data.index);
        this.onSelectCallback({
          type: 'message',
          data: element.data.message,
          index: element.data.index
        });
        break;

      case 'note':
        this.renderer.setSelectedMessage(null, null);
        this.onSelectCallback({
          type: 'note',
          data: element.data.note,
          index: element.data.index
        });
        break;

      case 'controlStructure':
        this.renderer.setSelectedMessage(null, null);
        this.onSelectCallback({
          type: 'controlStructure',
          data: element.data,
          index: element.data.index
        });
        break;
    }
  }

  private handleRectangleSelection(start: Point, end: Point): void {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    // Find all messages within the rectangle
    const selectedStatementIndices: number[] = [];
    const elements = this.renderer.getElements();

    elements.forEach(element => {
      if (element.type === 'message') {
        const bounds = element.bounds;
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;

        // Check if message center is within rectangle
        if (centerX >= minX && centerX <= maxX && centerY >= minY && centerY <= maxY) {
          selectedStatementIndices.push(element.data.index);
        }
      }
    });

    if (selectedStatementIndices.length === 0) {
      // No messages found, just return without alert
      this.setMode('select');
      return;
    }

    // Create default loop structure (can be changed in PropertyPanel)
    const defaultLabel = 'Loop';
    this.createLoopFromSelection(selectedStatementIndices, defaultLabel, { minX, maxX, minY, maxY });

    this.setMode('select');
  }

  private createLoopFromSelection(
    statementIndices: number[],
    label: string,
    bounds: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    if (statementIndices.length === 0) return;

    const allStatements = this.model.getStatements();

    // Extract selected statements
    const selectedStatements = statementIndices
      .sort((a, b) => a - b)
      .map(index => allStatements[index]);

    // Find the position to insert the loop (at the first selected statement)
    const insertPosition = Math.min(...statementIndices);

    // Add padding to bounds
    const padding = 30;
    const loopBounds = {
      x: bounds.minX - padding,
      y: bounds.minY - padding,
      width: bounds.maxX - bounds.minX + padding * 2,
      height: bounds.maxY - bounds.minY + padding * 2
    };

    // Create loop structure
    const loop = {
      type: 'loop' as const,
      label,
      statements: selectedStatements,
      bounds: loopBounds
    };

    // Remove selected statements from main list (in reverse order to maintain indices)
    statementIndices.sort((a, b) => b - a).forEach(index => {
      this.model.removeStatement(index);
    });

    // Insert loop at the first selected position
    this.model.addStatement(loop, insertPosition);
  }

  private createAltFromSelection(statementIndices: number[], condition: string): void {
    if (statementIndices.length === 0) return;

    const allStatements = this.model.getStatements();
    const selectedStatements = statementIndices
      .sort((a, b) => a - b)
      .map(index => allStatements[index]);

    const insertPosition = Math.min(...statementIndices);

    // Calculate bounds from selected elements
    const elements = this.renderer.getElements();
    let minX = Number.MAX_VALUE, maxX = 0, minY = Number.MAX_VALUE, maxY = 0;

    selectedStatements.forEach((_, idx) => {
      const element = elements.find(e => e.type === 'message' && e.data.index === statementIndices[idx]);
      if (element) {
        minX = Math.min(minX, element.bounds.x);
        maxX = Math.max(maxX, element.bounds.x + element.bounds.width);
        minY = Math.min(minY, element.bounds.y);
        maxY = Math.max(maxY, element.bounds.y + element.bounds.height);
      }
    });

    const padding = 30;
    const altBounds = {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    };

    const alt = {
      type: 'alt' as const,
      branches: [{ condition, statements: selectedStatements }],
      bounds: altBounds
    };

    statementIndices.sort((a, b) => b - a).forEach(index => {
      this.model.removeStatement(index);
    });

    this.model.addStatement(alt, insertPosition);
  }

  private createOptFromSelection(statementIndices: number[], condition: string): void {
    if (statementIndices.length === 0) return;

    const allStatements = this.model.getStatements();
    const selectedStatements = statementIndices
      .sort((a, b) => a - b)
      .map(index => allStatements[index]);

    const insertPosition = Math.min(...statementIndices);

    // Calculate bounds
    const elements = this.renderer.getElements();
    let minX = Number.MAX_VALUE, maxX = 0, minY = Number.MAX_VALUE, maxY = 0;

    selectedStatements.forEach((_, idx) => {
      const element = elements.find(e => e.type === 'message' && e.data.index === statementIndices[idx]);
      if (element) {
        minX = Math.min(minX, element.bounds.x);
        maxX = Math.max(maxX, element.bounds.x + element.bounds.width);
        minY = Math.min(minY, element.bounds.y);
        maxY = Math.max(maxY, element.bounds.y + element.bounds.height);
      }
    });

    const padding = 30;
    const optBounds = {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    };

    const opt = {
      type: 'opt' as const,
      condition,
      statements: selectedStatements,
      bounds: optBounds
    };

    statementIndices.sort((a, b) => b - a).forEach(index => {
      this.model.removeStatement(index);
    });

    this.model.addStatement(opt, insertPosition);
  }

  private drawSelectionRectangle(): void {
    if (!this.rectangleStart || !this.rectangleCurrent) return;

    // Re-render to clear previous rectangle
    this.renderer.render();

    // Draw selection rectangle overlay
    const canvas = this.canvas;
    const ctx = canvas.getContext('2d')!;

    const minX = Math.min(this.rectangleStart.x, this.rectangleCurrent.x);
    const maxX = Math.max(this.rectangleStart.x, this.rectangleCurrent.x);
    const minY = Math.min(this.rectangleStart.y, this.rectangleCurrent.y);
    const maxY = Math.max(this.rectangleStart.y, this.rectangleCurrent.y);

    ctx.save();
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';

    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

    ctx.restore();
  }

  dispose(): void {
    this.canvas.removeEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.removeEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.removeEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.removeEventListener('click', (e) => this.onClick(e));
  }
}
