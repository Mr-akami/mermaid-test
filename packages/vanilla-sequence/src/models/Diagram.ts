import { Participant } from './Participant';
import { Message } from './Message';
import { Note } from './Note';
import { Activation } from './Activation';
import { Block } from './Block';
import type { SequenceConfig } from '../types';

export class Diagram {
  participants: Map<string, Participant> = new Map();
  messages: Message[] = [];
  notes: Note[] = [];
  activations: Activation[] = [];
  blocks: Block[] = [];

  autoNumber: boolean = false;
  config: SequenceConfig = {};
  comments: string[] = []; // コメント保存用

  private nextOrder: number = 0;

  addParticipant(participant: Participant): void {
    participant.order = this.participants.size;
    this.participants.set(participant.id, participant);
  }

  removeParticipant(id: string): void {
    this.participants.delete(id);
    // 関連するメッセージ、ノート等も削除
    this.messages = this.messages.filter(m => m.from !== id && m.to !== id);
    this.notes = this.notes.filter(n => !n.participants.includes(id));
    this.activations = this.activations.filter(a => a.participantId !== id);
  }

  getParticipant(id: string): Participant | undefined {
    return this.participants.get(id);
  }

  addMessage(message: Message): void {
    message.order = this.nextOrder++;
    this.messages.push(message);
    this.sortMessages();

    // 暗黙的にparticipantを追加
    if (!this.participants.has(message.from)) {
      const p = new Participant(message.from, 'participant', false);
      this.addParticipant(p);
    }
    if (!this.participants.has(message.to)) {
      const p = new Participant(message.to, 'participant', false);
      this.addParticipant(p);
    }
  }

  removeMessage(id: string): void {
    this.messages = this.messages.filter(m => m.id !== id);
    this.reorderMessages();
  }

  addNote(note: Note): void {
    note.order = this.nextOrder++;
    this.notes.push(note);
  }

  removeNote(id: string): void {
    this.notes = this.notes.filter(n => n.id !== id);
  }

  addActivation(activation: Activation): void {
    this.activations.push(activation);
  }

  removeActivation(id: string): void {
    this.activations = this.activations.filter(a => a.id !== id);
  }

  addBlock(block: Block): void {
    this.blocks.push(block);
  }

  removeBlock(id: string): void {
    this.blocks = this.blocks.filter(b => b.id !== id);
  }

  private sortMessages(): void {
    this.messages.sort((a, b) => a.order - b.order);
  }

  private reorderMessages(): void {
    this.messages.forEach((msg, index) => {
      msg.order = index;
    });
    this.nextOrder = this.messages.length;
  }

  getParticipantsInOrder(): Participant[] {
    // 明示的定義を先に、次に暗黙的定義
    const explicit = Array.from(this.participants.values())
      .filter(p => p.isExplicit)
      .sort((a, b) => a.order - b.order);

    const implicit = Array.from(this.participants.values())
      .filter(p => !p.isExplicit)
      .sort((a, b) => {
        // 最初に出現したメッセージの順序でソート
        const aFirstMsg = this.messages.find(m => m.from === a.id || m.to === a.id);
        const bFirstMsg = this.messages.find(m => m.from === b.id || m.to === b.id);
        return (aFirstMsg?.order ?? Infinity) - (bFirstMsg?.order ?? Infinity);
      });

    return [...explicit, ...implicit];
  }

  clear(): void {
    this.participants.clear();
    this.messages = [];
    this.notes = [];
    this.activations = [];
    this.blocks = [];
    this.comments = [];
    this.nextOrder = 0;
  }
}
