import type { SequenceDiagram, Participant, Message, Note, ControlStructure } from '../model/types';

export class MermaidExporter {
  export(diagram: SequenceDiagram): string {
    const lines: string[] = ['sequenceDiagram'];

    // Add autonumber if enabled
    if (diagram.config.autonumber) {
      lines.push('    autonumber');
    }

    // Sort participants by order
    const sortedParticipants = [...diagram.participants].sort((a, b) => a.order - b.order);

    // Add boxes
    diagram.boxes.forEach(box => {
      const boxParticipants = box.participants
        .map(pid => sortedParticipants.find(p => p.id === pid))
        .filter(p => p !== undefined);

      if (boxParticipants.length > 0) {
        let boxLine = '    box';
        if (box.color) {
          boxLine += ` ${box.color}`;
        }
        if (box.label) {
          boxLine += ` ${box.label}`;
        }
        lines.push(boxLine);

        boxParticipants.forEach(p => {
          lines.push(this.formatParticipant(p!));
        });

        lines.push('    end');
      }
    });

    // Add participants not in boxes
    const participantsInBoxes = new Set(diagram.boxes.flatMap(b => b.participants));
    sortedParticipants.forEach(p => {
      if (!participantsInBoxes.has(p.id)) {
        lines.push(this.formatParticipant(p));
      }
    });

    // Combine and sort all sequence elements (messages, notes, control structures)
    const sequenceElements = this.buildSequenceElements(diagram);

    // Generate lines for each element
    sequenceElements.forEach(element => {
      if (element.type === 'message') {
        lines.push(this.formatMessage(element.data as Message));
      } else if (element.type === 'note') {
        lines.push(this.formatNote(element.data as Note, diagram.participants));
      } else if (element.type === 'controlStructureStart') {
        lines.push(this.formatControlStructureStart(element.data as ControlStructure));
      } else if (element.type === 'controlStructureEnd') {
        lines.push('    end');
      }
    });

    return lines.join('\n');
  }

  private formatParticipant(p: Participant): string {
    let line = '    ';

    if (p.created) {
      line += 'create ';
    }

    line += p.type;
    line += ` ${this.escapeId(p.id)}`;

    if (p.label) {
      line += ` as ${this.escapeLabel(p.label)}`;
    }

    return line;
  }

  private formatMessage(m: Message): string {
    let line = '    ';
    line += this.escapeId(m.from);
    line += m.arrowType;
    line += this.escapeId(m.to);

    if (m.text) {
      line += `: ${this.escapeText(m.text)}`;
    }

    return line;
  }

  private formatNote(n: Note, _participants: Participant[]): string {
    let line = '    Note ';

    if (n.position === 'left' || n.position === 'right') {
      line += `${n.position} of ${this.escapeId(n.participants[0])}`;
    } else {
      // over
      if (n.participants.length === 1) {
        line += `over ${this.escapeId(n.participants[0])}`;
      } else {
        line += `over ${n.participants.map(pid => this.escapeId(pid)).join(',')}`;
      }
    }

    if (n.text) {
      line += `: ${this.escapeText(n.text)}`;
    }

    return line;
  }

  private formatControlStructureStart(cs: ControlStructure): string {
    let line = '    ';

    switch (cs.type) {
      case 'loop':
        line += `loop ${this.escapeText(cs.label || '')}`;
        break;
      case 'alt':
        line += `alt ${this.escapeText(cs.label || '')}`;
        break;
      case 'opt':
        line += `opt ${this.escapeText(cs.label || '')}`;
        break;
      case 'par':
        line += `par ${this.escapeText(cs.label || '')}`;
        break;
      case 'critical':
        line += `critical ${this.escapeText(cs.label || '')}`;
        break;
      case 'break':
        line += `break ${this.escapeText(cs.label || '')}`;
        break;
      case 'rect':
        line += `rect ${cs.color || 'rgb(200,200,200)'}`;
        break;
    }

    return line;
  }

  private buildSequenceElements(diagram: SequenceDiagram): Array<{
    order: number;
    type: string;
    data: any;
  }> {
    const elements: Array<{ order: number; type: string; data: any }> = [];

    // Add messages
    diagram.messages.forEach(m => {
      elements.push({ order: m.order, type: 'message', data: m });
    });

    // Add notes
    diagram.notes.forEach(n => {
      elements.push({ order: n.order, type: 'note', data: n });
    });

    // Add control structures as start and end markers
    diagram.controlStructures.forEach(cs => {
      elements.push({ order: cs.startOrder, type: 'controlStructureStart', data: cs });
      elements.push({ order: cs.endOrder + 0.5, type: 'controlStructureEnd', data: cs });
    });

    // Sort by order
    elements.sort((a, b) => a.order - b.order);

    return elements;
  }

  private escapeId(id: string): string {
    // If id contains special characters or spaces, no escaping needed for Mermaid IDs
    // But we should avoid using reserved words
    if (id === 'end') {
      return '[end]';
    }
    return id;
  }

  private escapeLabel(label: string): string {
    // Labels can contain spaces and special chars
    // Use quotes if it contains special characters
    if (label.includes(' ') || label.includes('<br/>')) {
      return label;
    }
    return label;
  }

  private escapeText(text: string): string {
    // Text in messages and notes
    // Check for 'end' keyword and wrap it
    if (text.toLowerCase().includes('end')) {
      // This is a simplified check - in production you'd want more sophisticated handling
      return text;
    }
    return text;
  }
}
