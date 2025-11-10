import { Diagram } from '../models/Diagram';
import { Participant } from '../models/Participant';
import { Message } from '../models/Message';
import { Note } from '../models/Note';
import { Block } from '../models/Block';
import { Activation } from '../models/Activation';
import { SVGRenderer } from '../renderer/SVGRenderer';
import { FloatingPropertyPanel } from '../ui/FloatingPropertyPanel';
import type { ToolType } from '../ui/Toolbar';
import type { ArrowType, ParticipantType, NotePosition, BlockType } from '../types';

export class InteractionManager {
  private diagram: Diagram;
  private renderer: SVGRenderer;
  private propertyPanel: FloatingPropertyPanel;
  private currentTool: ToolType = 'select';

  // 状態管理
  private isCreatingMessage: boolean = false;
  private messageStartParticipant: Participant | null = null;
  private selectionStart: { x: number; y: number } | null = null;
  private selectedMessages: Message[] = [];

  // ドラッグ状態
  private isDragging: boolean = false;
  private draggedParticipant: Participant | null = null;
  private draggedMessage: Message | null = null;
  private dragStartPos: { x: number; y: number } | null = null;

  constructor(
    diagram: Diagram,
    renderer: SVGRenderer,
    propertyPanel: FloatingPropertyPanel
  ) {
    this.diagram = diagram;
    this.renderer = renderer;
    this.propertyPanel = propertyPanel;
    this.setupEventListeners();
  }

  setTool(tool: ToolType): void {
    this.currentTool = tool;
    this.isCreatingMessage = false;
    this.messageStartParticipant = null;
    this.selectionStart = null;
    this.selectedMessages = [];

    // Export以外のツールに切り替えたらプロパティパネルを閉じる
    if (tool !== 'export') {
      this.propertyPanel.hide();
    }
  }

  private setupEventListeners(): void {
    const svg = this.renderer.getSVGElement();

    svg.addEventListener('click', (e) => this.handleClick(e));
    svg.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    svg.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    svg.addEventListener('mouseup', (e) => this.handleMouseUp(e));
  }

  private getSVGCoordinates(e: MouseEvent): { x: number; y: number } {
    const svg = this.renderer.getSVGElement();
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  }

  private handleClick(e: MouseEvent): void {
    const coords = this.getSVGCoordinates(e);

    switch (this.currentTool) {
      case 'select':
        this.handleSelect(coords);
        break;
      case 'participant':
      case 'actor':
        this.handleAddParticipant(coords);
        break;
      case 'message':
        this.handleMessageClick(coords);
        break;
      case 'note':
        this.handleAddNote(coords);
        break;
      case 'activate':
        this.handleAddActivation(coords);
        break;
      case 'loop':
      case 'alt':
      case 'opt':
      case 'par':
      case 'critical':
      case 'break':
      case 'rect':
      case 'box':
        // ブロック作成は範囲選択で行う
        break;
      case 'export':
        this.handleExport();
        break;
    }
  }

  private handleSelect(coords: { x: number; y: number }): void {
    // Participant選択
    const participant = this.renderer.getParticipantAt(coords.x, coords.y);
    if (participant) {
      this.propertyPanel.show(participant);
      this.renderer.render();
      return;
    }

    // Message選択
    const message = this.renderer.getMessageAt(coords.x, coords.y);
    if (message) {
      this.propertyPanel.show(message);
      this.renderer.render();
      return;
    }

    // どれにも当たらなければ選択解除
    this.propertyPanel.hide();
    this.renderer.render();
  }

  private handleAddParticipant(coords: { x: number; y: number }): void {
    const id = prompt('Participant ID:');
    if (!id) return;

    const type: ParticipantType = this.currentTool === 'actor' ? 'actor' : 'participant';
    const participant = new Participant(id, type, true);
    participant.setPosition(coords.x, coords.y);

    this.diagram.addParticipant(participant);
    this.renderer.render();
  }

  private handleMessageClick(coords: { x: number; y: number }): void {
    if (!this.isCreatingMessage) {
      // 最初のクリック: 開始participant選択
      const participant = this.renderer.getParticipantAt(coords.x, coords.y);
      if (participant) {
        this.messageStartParticipant = participant;
        this.isCreatingMessage = true;
      } else {
        alert('Please click on a participant lifeline to start the message.');
      }
    } else {
      // 2回目のクリック: 終了participant選択
      const participant = this.renderer.getParticipantAt(coords.x, coords.y);
      if (participant && this.messageStartParticipant) {
        const text = prompt('Message text (optional):') || '';
        const arrowType: ArrowType = '->>';
        const message = new Message(
          this.messageStartParticipant.id,
          participant.id,
          arrowType,
          text
        );
        this.diagram.addMessage(message);
        this.renderer.render();

        // リセット
        this.isCreatingMessage = false;
        this.messageStartParticipant = null;
      }
    }
  }

  private handleAddNote(coords: { x: number; y: number }): void {
    const participant = this.renderer.getParticipantAt(coords.x, coords.y);
    if (!participant) {
      alert('Please click on a participant to attach the note.');
      return;
    }

    const text = prompt('Note text:');
    if (!text) return;

    const position: NotePosition = 'right of';
    const note = new Note(position, [participant.id], text);
    this.diagram.addNote(note);
    this.renderer.render();
  }

  private handleAddActivation(_coords: { x: number; y: number }): void {
    const participantId = prompt('Enter participant ID for activation:');
    if (!participantId) return;

    const participant = this.diagram.getParticipant(participantId);
    if (!participant) {
      alert(`Participant "${participantId}" not found.`);
      return;
    }

    const startOrderStr = prompt('Start order (message number):');
    const endOrderStr = prompt('End order (message number):');

    if (!startOrderStr || !endOrderStr) return;

    const startOrder = parseInt(startOrderStr);
    const endOrder = parseInt(endOrderStr);

    if (isNaN(startOrder) || isNaN(endOrder)) {
      alert('Invalid order numbers.');
      return;
    }

    // ネストレベルを計算（同じparticipantの既存activationと重複があれば）
    const existingActivations = this.diagram.activations.filter(a => a.participantId === participantId);
    let nestLevel = 0;

    for (const act of existingActivations) {
      if (startOrder >= act.startOrder && startOrder <= act.endOrder) {
        nestLevel = Math.max(nestLevel, act.nestLevel + 1);
      }
    }

    const activation = new Activation(participantId, startOrder, endOrder, nestLevel);
    this.diagram.addActivation(activation);
    this.renderer.render();
  }

  private handleMouseDown(e: MouseEvent): void {
    const coords = this.getSVGCoordinates(e);

    // 選択ツールの場合、ドラッグ開始
    if (this.currentTool === 'select') {
      const participant = this.renderer.getParticipantAt(coords.x, coords.y);
      if (participant) {
        this.isDragging = true;
        this.draggedParticipant = participant;
        this.dragStartPos = coords;
        return;
      }

      const message = this.renderer.getMessageAt(coords.x, coords.y);
      if (message) {
        this.isDragging = true;
        this.draggedMessage = message;
        this.dragStartPos = coords;
        return;
      }
    }

    // ブロックツールが選択されている場合、範囲選択開始
    if (['loop', 'alt', 'opt', 'par', 'critical', 'break', 'rect', 'box'].includes(this.currentTool)) {
      this.selectionStart = coords;
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.dragStartPos) return;

    const coords = this.getSVGCoordinates(e);

    if (this.draggedParticipant) {
      // Participantのドラッグ（順序変更）
      const deltaX = coords.x - this.dragStartPos.x;

      // 順序変更のしきい値
      if (Math.abs(deltaX) > 60) {
        // 参加者のリストを取得
        const participants = this.diagram.getParticipantsInOrder();
        const currentIndex = participants.findIndex(p => p.id === this.draggedParticipant!.id);
        const newIndex = deltaX > 0 ? currentIndex + 1 : currentIndex - 1;

        if (newIndex >= 0 && newIndex < participants.length) {
          // 順序を入れ替え
          const temp = participants[currentIndex].order;
          participants[currentIndex].order = participants[newIndex].order;
          participants[newIndex].order = temp;

          this.renderer.render();
          this.dragStartPos = coords;
        }
      }
    } else if (this.draggedMessage) {
      // メッセージのドラッグ（順序変更）
      const deltaY = coords.y - this.dragStartPos.y;

      // 順序変更のしきい値
      if (Math.abs(deltaY) > 40) {
        const currentOrder = this.draggedMessage.order;
        const direction = deltaY > 0 ? 1 : -1;
        const newOrder = currentOrder + direction;

        // 他のメッセージと入れ替え
        const otherMessage = this.diagram.messages.find(m => m.order === newOrder);
        if (otherMessage) {
          otherMessage.order = currentOrder;
          this.draggedMessage.order = newOrder;

          this.renderer.render();
          this.dragStartPos = coords;
        }
      }
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    // ドラッグ終了
    if (this.isDragging) {
      this.isDragging = false;
      this.draggedParticipant = null;
      this.draggedMessage = null;
      this.dragStartPos = null;
      return;
    }

    if (!this.selectionStart) return;

    const coords = this.getSVGCoordinates(e);
    const startY = Math.min(this.selectionStart.y, coords.y);
    const endY = Math.max(this.selectionStart.y, coords.y);

    // Y座標から該当するメッセージを選択
    this.selectedMessages = this.diagram.messages.filter(msg => {
      return msg.position.y >= startY && msg.position.y <= endY;
    });

    if (this.selectedMessages.length === 0) {
      alert('No messages selected. Please select messages to create a block around them.');
      this.selectionStart = null;
      return;
    }

    // ブロック作成
    const label = prompt(`Enter label for ${this.currentTool}:`) || '';
    const startOrder = Math.min(...this.selectedMessages.map(m => m.order));
    const endOrder = Math.max(...this.selectedMessages.map(m => m.order));

    const block = new Block(this.currentTool as BlockType, label, startOrder, endOrder);
    this.diagram.addBlock(block);
    this.renderer.render();

    this.selectionStart = null;
    this.selectedMessages = [];
  }

  private handleExport(): void {
    // Mermaidテキストをエクスポート
    alert('Export functionality will be implemented with MermaidGenerator.');
  }
}
