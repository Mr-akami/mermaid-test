import type { SequenceDiagram, Participant, Statement, Message, Note } from '../model/types';

export interface LayoutConfig {
  participantWidth: number;
  participantHeight: number;
  participantSpacing: number;
  messageSpacing: number;
  noteWidth: number;
  noteHeight: number;
  activationWidth: number;
  marginX: number;
  marginY: number;
}

export interface ParticipantLayout {
  participant: Participant;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MessageLayout {
  message: Message;
  fromX: number;
  toX: number;
  y: number;
  index: number;
}

export interface NoteLayout {
  note: Note;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiagramLayout {
  participants: ParticipantLayout[];
  messages: MessageLayout[];
  notes: NoteLayout[];
  width: number;
  height: number;
}

/**
 * LayoutEngine calculates positions for all diagram elements
 */
export class LayoutEngine {
  private config: LayoutConfig;

  constructor(config?: Partial<LayoutConfig>) {
    this.config = {
      participantWidth: 120,
      participantHeight: 40,
      participantSpacing: 80,
      messageSpacing: 60,
      noteWidth: 150,
      noteHeight: 60,
      activationWidth: 10,
      marginX: 50,
      marginY: 50,
      ...config
    };
  }

  /**
   * Calculate layout for the entire diagram
   */
  calculateLayout(diagram: SequenceDiagram, orderedParticipants: Participant[]): DiagramLayout {
    const participants = this.layoutParticipants(orderedParticipants);
    const { messages, notes, maxY } = this.layoutStatements(diagram.statements, participants);

    const width = participants.length > 0
      ? participants[participants.length - 1].x + this.config.participantWidth + this.config.marginX
      : this.config.marginX * 2;

    const height = maxY + this.config.participantHeight + this.config.marginY;

    return {
      participants,
      messages,
      notes,
      width,
      height
    };
  }

  /**
   * Layout participants horizontally
   */
  private layoutParticipants(participants: Participant[]): ParticipantLayout[] {
    return participants.map((participant, index) => ({
      participant,
      x: this.config.marginX + index * (this.config.participantWidth + this.config.participantSpacing),
      y: this.config.marginY,
      width: this.config.participantWidth,
      height: this.config.participantHeight
    }));
  }

  /**
   * Layout statements (messages and notes) vertically
   */
  private layoutStatements(
    statements: Statement[],
    participants: ParticipantLayout[]
  ): { messages: MessageLayout[]; notes: NoteLayout[]; maxY: number } {
    const messages: MessageLayout[] = [];
    const notes: NoteLayout[] = [];
    let currentY = this.config.marginY + this.config.participantHeight + this.config.messageSpacing;

    let messageIndex = 0;

    statements.forEach(statement => {
      if ('sender' in statement && 'receiver' in statement) {
        // Message
        const msg = statement as Message;
        const senderLayout = participants.find(p => p.participant.id === msg.sender);
        const receiverLayout = participants.find(p => p.participant.id === msg.receiver);

        if (senderLayout && receiverLayout) {
          const fromX = senderLayout.x + senderLayout.width / 2;
          const toX = receiverLayout.x + receiverLayout.width / 2;

          messages.push({
            message: msg,
            fromX,
            toX,
            y: currentY,
            index: messageIndex
          });

          messageIndex++;
          currentY += this.config.messageSpacing;
        }
      } else if ('position' in statement) {
        // Note
        const note = statement as Note;
        const participantLayouts = note.participants
          .map(id => participants.find(p => p.participant.id === id))
          .filter(p => p !== undefined) as ParticipantLayout[];

        if (participantLayouts.length > 0) {
          let noteX: number;
          let noteY = currentY - this.config.messageSpacing / 2;

          if (note.position === 'over') {
            // Center note over participants
            const minX = Math.min(...participantLayouts.map(p => p.x));
            const maxX = Math.max(...participantLayouts.map(p => p.x + p.width));
            noteX = (minX + maxX) / 2 - this.config.noteWidth / 2;
          } else {
            // Left or right of participant
            const participantLayout = participantLayouts[0];
            if (note.position === 'left') {
              noteX = participantLayout.x - this.config.noteWidth - 20;
            } else {
              noteX = participantLayout.x + participantLayout.width + 20;
            }
          }

          notes.push({
            note,
            x: noteX,
            y: noteY,
            width: this.config.noteWidth,
            height: this.config.noteHeight
          });

          currentY += this.config.noteHeight / 2;
        }
      }
    });

    return { messages, notes, maxY: currentY };
  }

  /**
   * Get participant position by ID
   */
  getParticipantPosition(participantId: string, participants: ParticipantLayout[]): { x: number; y: number } | null {
    const layout = participants.find(p => p.participant.id === participantId);
    if (layout) {
      return {
        x: layout.x + layout.width / 2,
        y: layout.y + layout.height / 2
      };
    }
    return null;
  }
}
