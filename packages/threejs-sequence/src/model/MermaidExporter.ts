import type {
  SequenceDiagram,
  Statement,
  Message,
  Note,
  ControlStructure,
  Loop,
  Alt,
  Opt,
  Par,
  Critical,
  Break,
  Rect,
  Box
} from './types';

/**
 * Exports DiagramModel to Mermaid syntax
 */
export class MermaidExporter {
  export(diagram: SequenceDiagram): string {
    const lines: string[] = ['sequenceDiagram'];

    // Add autonumber if enabled
    if (diagram.autoNumber) {
      lines.push('  autonumber');
    }

    // Add boxes and participants
    this.exportBoxesAndParticipants(diagram, lines);

    // Add statements
    diagram.statements.forEach(statement => {
      this.exportStatement(statement, lines, 1);
    });

    return lines.join('\n');
  }

  private exportBoxesAndParticipants(diagram: SequenceDiagram, lines: string[]): void {
    const processedParticipants = new Set<string>();

    // Export boxes with their participants
    diagram.boxes.forEach(box => {
      this.exportBox(box, diagram, lines, processedParticipants);
    });

    // Export remaining participants not in boxes
    diagram.participants.forEach(participant => {
      if (!processedParticipants.has(participant.id)) {
        const indent = '  ';
        const type = participant.type;
        const alias = participant.label ? ` as ${participant.label}` : '';

        if (participant.createdAt !== undefined) {
          lines.push(`${indent}create ${type} ${participant.id}${alias}`);
        } else {
          lines.push(`${indent}${type} ${participant.id}${alias}`);
        }

        // Add links
        participant.links.forEach(link => {
          lines.push(`${indent}link ${participant.id}: ${link.label} @ ${link.url}`);
        });

        processedParticipants.add(participant.id);
      }
    });
  }

  private exportBox(box: Box, diagram: SequenceDiagram, lines: string[], processedParticipants: Set<string>): void {
    const indent = '  ';
    let boxLine = `${indent}box`;

    if (box.color) {
      boxLine += ` ${box.color}`;
    }
    if (box.label) {
      boxLine += ` ${box.label}`;
    }

    lines.push(boxLine);

    // Export participants in this box
    box.participants.forEach(participantId => {
      const participant = diagram.participants.find(p => p.id === participantId);
      if (participant) {
        const type = participant.type;
        const alias = participant.label ? ` as ${participant.label}` : '';

        if (participant.createdAt !== undefined) {
          lines.push(`${indent}  create ${type} ${participant.id}${alias}`);
        } else {
          lines.push(`${indent}  ${type} ${participant.id}${alias}`);
        }

        processedParticipants.add(participant.id);
      }
    });

    lines.push(`${indent}end`);
  }

  private exportStatement(statement: Statement, lines: string[], indentLevel: number): void {
    const indent = '  '.repeat(indentLevel);

    if ('sender' in statement && 'receiver' in statement) {
      // Message
      const msg = statement as Message;
      let arrow = msg.arrow;

      if (msg.activateReceiver) arrow += '+';
      if (msg.deactivateReceiver) arrow += '-';

      const text = msg.text || '';
      lines.push(`${indent}${msg.sender}${arrow}${msg.receiver}:${text}`);
    } else if ('position' in statement) {
      // Note
      const note = statement as Note;
      let noteLine = `${indent}Note`;

      if (note.position === 'over' && note.participants.length > 0) {
        noteLine += ` over ${note.participants.join(',')}`;
      } else if (note.participants.length > 0) {
        noteLine += ` ${note.position} of ${note.participants[0]}`;
      }

      noteLine += `: ${note.text}`;
      lines.push(noteLine);
    } else if ('type' in statement) {
      // Control structure
      this.exportControlStructure(statement as ControlStructure, lines, indentLevel);
    }
  }

  private exportControlStructure(structure: ControlStructure, lines: string[], indentLevel: number): void {
    const indent = '  '.repeat(indentLevel);

    switch (structure.type) {
      case 'loop':
        {
          const loop = structure as Loop;
          lines.push(`${indent}loop ${loop.label}`);
          loop.statements.forEach(stmt => this.exportStatement(stmt, lines, indentLevel + 1));
          lines.push(`${indent}end`);
        }
        break;

      case 'alt':
        {
          const alt = structure as Alt;
          alt.branches.forEach((branch, index) => {
            if (index === 0) {
              lines.push(`${indent}alt ${branch.condition}`);
            } else {
              lines.push(`${indent}else ${branch.condition}`);
            }
            branch.statements.forEach(stmt => this.exportStatement(stmt, lines, indentLevel + 1));
          });
          lines.push(`${indent}end`);
        }
        break;

      case 'opt':
        {
          const opt = structure as Opt;
          lines.push(`${indent}opt ${opt.condition}`);
          opt.statements.forEach(stmt => this.exportStatement(stmt, lines, indentLevel + 1));
          lines.push(`${indent}end`);
        }
        break;

      case 'par':
        {
          const par = structure as Par;
          par.branches.forEach((branch, index) => {
            if (index === 0) {
              lines.push(`${indent}par ${branch.label}`);
            } else {
              lines.push(`${indent}and ${branch.label}`);
            }
            branch.statements.forEach(stmt => this.exportStatement(stmt, lines, indentLevel + 1));
          });
          lines.push(`${indent}end`);
        }
        break;

      case 'critical':
        {
          const critical = structure as Critical;
          lines.push(`${indent}critical ${critical.action}`);
          critical.statements.forEach(stmt => this.exportStatement(stmt, lines, indentLevel + 1));

          critical.options.forEach(option => {
            lines.push(`${indent}option ${option.situation}`);
            option.statements.forEach(stmt => this.exportStatement(stmt, lines, indentLevel + 1));
          });

          lines.push(`${indent}end`);
        }
        break;

      case 'break':
        {
          const brk = structure as Break;
          lines.push(`${indent}break ${brk.description}`);
          brk.statements.forEach(stmt => this.exportStatement(stmt, lines, indentLevel + 1));
          lines.push(`${indent}end`);
        }
        break;

      case 'rect':
        {
          const rect = structure as Rect;
          lines.push(`${indent}rect ${rect.color}`);
          rect.statements.forEach(stmt => this.exportStatement(stmt, lines, indentLevel + 1));
          lines.push(`${indent}end`);
        }
        break;
    }
  }
}
