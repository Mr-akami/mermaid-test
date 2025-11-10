import type {
  SequenceDiagram,
  Participant,
  Message,
  Note,
} from '../models/types';
import { ParticipantType, NotePosition, ArrowType } from '../models/types';

export class MermaidParser {
  public parse(text: string): SequenceDiagram {
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('%%'));

    const diagram: SequenceDiagram = {
      participants: [],
      boxes: [],
      elements: [],
      autoNumber: false,
    };

    let currentLine = 0;

    // Check for sequenceDiagram keyword
    if (!lines[currentLine]?.startsWith('sequenceDiagram')) {
      throw new Error('Invalid Mermaid sequence diagram: must start with "sequenceDiagram"');
    }
    currentLine++;

    // Parse lines
    while (currentLine < lines.length) {
      const line = lines[currentLine];

      if (line.startsWith('autonumber')) {
        diagram.autoNumber = true;
      } else if (line.startsWith('participant ')) {
        diagram.participants.push(this.parseParticipant(line, ParticipantType.PARTICIPANT));
      } else if (line.startsWith('actor ')) {
        diagram.participants.push(this.parseParticipant(line, ParticipantType.ACTOR));
      } else if (this.isMessage(line)) {
        const implicitParticipants = this.extractImplicitParticipants(line);
        for (const id of implicitParticipants) {
          if (!diagram.participants.find(p => p.id === id)) {
            diagram.participants.push({
              id,
              type: ParticipantType.PARTICIPANT,
            });
          }
        }
        diagram.elements.push({
          type: 'message',
          data: this.parseMessage(line),
        });
      } else if (line.startsWith('Note ')) {
        diagram.elements.push({
          type: 'note',
          data: this.parseNote(line),
        });
      }

      currentLine++;
    }

    return diagram;
  }

  private parseParticipant(line: string, type: ParticipantType): Participant {
    const asIndex = line.indexOf(' as ');

    if (asIndex !== -1) {
      const id = line.substring(type === ParticipantType.ACTOR ? 6 : 12, asIndex).trim();
      const label = line.substring(asIndex + 4).trim();
      return { id, type, label };
    } else {
      const id = line.substring(type === ParticipantType.ACTOR ? 6 : 12).trim();
      return { id, type };
    }
  }

  private isMessage(line: string): boolean {
    const arrowTypes = [
      '<<->>',
      '<<-->>',
      '->>',
      '-->>',
      '->',
      '-->',
      '-x',
      '--x',
      '-)',
      '--)',
    ];
    return arrowTypes.some(arrow => line.includes(arrow));
  }

  private extractImplicitParticipants(line: string): string[] {
    const participants: string[] = [];
    const colonIndex = line.indexOf(':');
    const messagePart = colonIndex !== -1 ? line.substring(0, colonIndex) : line;

    const arrowTypes = [
      '<<->>',
      '<<-->>',
      '->>',
      '-->>',
      '->',
      '-->',
      '-x',
      '--x',
      '-)',
      '--)',
    ];

    for (const arrowType of arrowTypes) {
      if (messagePart.includes(arrowType)) {
        const parts = messagePart.split(arrowType);
        if (parts.length === 2) {
          const sender = parts[0].replace(/[+-]/g, '').trim();
          const receiver = parts[1].replace(/[+-]/g, '').trim();
          if (sender) participants.push(sender);
          if (receiver) participants.push(receiver);
        }
        break;
      }
    }

    return participants;
  }

  private parseMessage(line: string): Message {
    const colonIndex = line.indexOf(':');
    const messagePart = colonIndex !== -1 ? line.substring(0, colonIndex) : line;
    const text = colonIndex !== -1 ? line.substring(colonIndex + 1).trim() : undefined;

    let arrowType: ArrowType = ArrowType.SOLID_ARROW;
    let sender = '';
    let receiver = '';
    let activate = false;
    let deactivate = false;

    const arrowMapping: Record<string, ArrowType> = {
      '<<->>': ArrowType.SOLID_BOTH,
      '<<-->>': ArrowType.DASHED_BOTH,
      '->>': ArrowType.SOLID_ARROW,
      '-->>': ArrowType.DASHED_ARROW,
      '->': ArrowType.SOLID,
      '-->': ArrowType.DASHED,
      '-x': ArrowType.SOLID_X,
      '--x': ArrowType.DASHED_X,
      '-)': ArrowType.SOLID_ASYNC,
      '--)': ArrowType.DASHED_ASYNC,
    };

    for (const [arrow, type] of Object.entries(arrowMapping)) {
      if (messagePart.includes(arrow)) {
        arrowType = type;
        const parts = messagePart.split(arrow);
        if (parts.length === 2) {
          sender = parts[0].trim();
          receiver = parts[1].trim();

          if (sender.endsWith('-')) {
            deactivate = true;
            sender = sender.slice(0, -1);
          }
          if (receiver.startsWith('+')) {
            activate = true;
            receiver = receiver.slice(1);
          }
        }
        break;
      }
    }

    return {
      id: `msg-${Date.now()}`,
      sender,
      receiver,
      arrowType,
      text,
      activate,
      deactivate,
    };
  }

  private parseNote(line: string): Note {
    const colonIndex = line.indexOf(':');
    const text = colonIndex !== -1 ? line.substring(colonIndex + 1).trim() : '';

    let position: NotePosition = NotePosition.RIGHT;
    let participants: string[] = [];

    if (line.includes('Note over ')) {
      position = NotePosition.OVER;
      const overPart = line.substring(10, colonIndex).trim();
      participants = overPart.split(',').map(p => p.trim());
    } else if (line.includes('Note left of ')) {
      position = NotePosition.LEFT;
      participants = [line.substring(13, colonIndex).trim()];
    } else if (line.includes('Note right of ')) {
      position = NotePosition.RIGHT;
      participants = [line.substring(14, colonIndex).trim()];
    }

    return {
      id: `note-${Date.now()}`,
      position,
      participants,
      text,
    };
  }
}
