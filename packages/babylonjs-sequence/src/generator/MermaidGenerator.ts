import type {
  SequenceDiagram,
  Participant,
  Message,
  Note,
  ControlStructure,
  DiagramElement,
} from '../models/types';
import { ParticipantType, NotePosition, ControlType } from '../models/types';

export class MermaidGenerator {
  public generate(diagram: SequenceDiagram): string {
    const lines: string[] = ['sequenceDiagram'];

    // Auto number
    if (diagram.autoNumber) {
      lines.push('    autonumber');
    }

    // Boxes
    for (const box of diagram.boxes) {
      lines.push(`    box ${box.color || ''} ${box.description || ''}`);
      for (const participantId of box.participants) {
        const participant = diagram.participants.find(p => p.id === participantId);
        if (participant) {
          lines.push(`        ${this.generateParticipant(participant)}`);
        }
      }
      lines.push('    end');
    }

    // Participants not in boxes
    const participantsInBoxes = new Set(diagram.boxes.flatMap(b => b.participants));
    for (const participant of diagram.participants) {
      if (!participantsInBoxes.has(participant.id)) {
        lines.push(`    ${this.generateParticipant(participant)}`);
      }
    }

    // Elements
    for (const element of diagram.elements) {
      lines.push(...this.generateElement(element, '    '));
    }

    return lines.join('\n');
  }

  private generateParticipant(participant: Participant): string {
    const type = participant.type === ParticipantType.ACTOR ? 'actor' : 'participant';
    if (participant.label && participant.label !== participant.id) {
      return `${type} ${participant.id} as ${participant.label}`;
    }
    return `${type} ${participant.id}`;
  }

  private generateElement(element: DiagramElement, indent: string): string[] {
    switch (element.type) {
      case 'message':
        return [indent + this.generateMessage(element.data)];

      case 'note':
        return [indent + this.generateNote(element.data)];

      case 'control':
        return this.generateControl(element.data, indent);

      case 'create':
        return [indent + `create participant ${element.participantId}`];

      case 'destroy':
        return [indent + `destroy ${element.participantId}`];

      default:
        return [];
    }
  }

  private generateMessage(message: Message): string {
    const activation = message.activate ? '+' : message.deactivate ? '-' : '';
    return `${message.sender}${message.arrowType}${activation}${message.receiver}: ${message.text || ''}`;
  }

  private generateNote(note: Note): string {
    if (note.position === NotePosition.OVER && note.participants.length === 2) {
      return `Note over ${note.participants[0]},${note.participants[1]}: ${note.text}`;
    } else {
      return `Note ${note.position} of ${note.participants[0]}: ${note.text}`;
    }
  }

  private generateControl(control: ControlStructure, indent: string): string[] {
    const lines: string[] = [];

    if (control.type === ControlType.RECT) {
      lines.push(indent + `rect ${control.color || ''}`);
    } else {
      lines.push(indent + `${control.type} ${control.label || ''}`);
    }

    for (let i = 0; i < control.branches.length; i++) {
      const branch = control.branches[i];

      if (i > 0) {
        if (control.type === ControlType.ALT) {
          lines.push(indent + `else ${branch.label || ''}`);
        } else if (control.type === ControlType.PAR) {
          lines.push(indent + `and ${branch.label || ''}`);
        } else if (control.type === ControlType.CRITICAL) {
          lines.push(indent + `option ${branch.label || ''}`);
        }
      }

      for (const statement of branch.statements) {
        lines.push(...this.generateElement(statement, indent + '    '));
      }
    }

    lines.push(indent + 'end');

    return lines;
  }
}
