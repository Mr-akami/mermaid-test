import type { ControlStructureType } from '../model/types';
import { SequenceDiagramModel } from '../model/DiagramModel';

export class MermaidExporter {
  private model: SequenceDiagramModel;

  constructor(model: SequenceDiagramModel) {
    this.model = model;
  }

  public export(): string {
    const lines: string[] = [];

    // Start with sequenceDiagram keyword
    lines.push('sequenceDiagram');

    // Add autonumber if enabled
    if (this.model.getAutoNumber()) {
      lines.push('    autonumber');
    }

    // Export boxes
    this.exportBoxes(lines);

    // Export participants
    this.exportParticipants(lines);

    // Export messages, notes, and control structures in order
    this.exportTimeline(lines);

    return lines.join('\n');
  }

  private exportBoxes(lines: string[]): void {
    const boxes = this.model.getAllBoxes();
    boxes.forEach(box => {
      const color = box.color || '';
      const desc = box.description || '';
      lines.push(`    box ${color} ${desc}`);

      // Export participants in this box
      box.participantIds.forEach(pid => {
        const participant = this.model.getParticipant(pid);
        if (participant) {
          const keyword = participant.type;
          const label = participant.label !== participant.id ? ` as ${participant.label}` : '';
          lines.push(`        ${keyword} ${participant.id}${label}`);
        }
      });

      lines.push('    end');
    });
  }

  private exportParticipants(lines: string[]): void {
    const participants = this.model.getAllParticipants();

    participants.forEach(participant => {
      // Skip participants that are in boxes (they're already exported)
      if (participant.boxId) return;

      const keyword = participant.type;
      const label = participant.label !== participant.id ? ` as ${participant.label}` : '';

      if (participant.created) {
        lines.push(`    create ${keyword} ${participant.id}${label}`);
      } else {
        lines.push(`    ${keyword} ${participant.id}${label}`);
      }
    });
  }

  private exportTimeline(lines: string[]): void {
    // Combine messages, notes, and control structures
    const messages = this.model.getAllMessages();
    const notes = this.model.getAllNotes();
    const controlStructures = this.model.getAllControlStructures();

    // Create timeline items
    interface TimelineItem {
      order: number;
      type: 'message' | 'note' | 'control-start' | 'control-end';
      data: any;
    }

    const timeline: TimelineItem[] = [];

    // Add messages
    messages.forEach(msg => {
      timeline.push({ order: msg.order, type: 'message', data: msg });
    });

    // Add notes
    notes.forEach(note => {
      timeline.push({ order: note.order, type: 'note', data: note });
    });

    // Add control structures
    controlStructures.forEach(ctrl => {
      timeline.push({ order: ctrl.startOrder, type: 'control-start', data: ctrl });
      timeline.push({ order: ctrl.endOrder, type: 'control-end', data: ctrl });
    });

    // Sort by order
    timeline.sort((a, b) => a.order - b.order);

    // Track control structure depth for indentation
    let indent = 1;
    const activeControls: ControlStructureType[] = [];

    timeline.forEach(item => {
      const spaces = '    '.repeat(indent);

      switch (item.type) {
        case 'message':
          this.exportMessage(lines, item.data, spaces);
          break;

        case 'note':
          this.exportNote(lines, item.data, spaces);
          break;

        case 'control-start':
          this.exportControlStart(lines, item.data, spaces);
          activeControls.push(item.data.type);
          indent++;
          break;

        case 'control-end':
          indent--;
          const spaces2 = '    '.repeat(indent);
          lines.push(`${spaces2}end`);
          activeControls.pop();
          break;
      }
    });
  }

  private exportMessage(lines: string[], message: any, indent: string): void {
    const { fromId, toId, arrowType, text, activateStart, activateEnd } = message;

    let arrow = arrowType;
    if (activateStart) arrow += '+';
    if (activateEnd) arrow += '-';

    const escapedText = this.escapeText(text);
    lines.push(`${indent}${fromId}${arrow}${toId}: ${escapedText}`);

    // Check for destruction
    if (arrowType === '-x' || arrowType === '--x') {
      const toParticipant = this.model.getParticipant(toId);
      if (toParticipant?.destroyed) {
        lines.push(`${indent}destroy ${toId}`);
      }
    }
  }

  private exportNote(lines: string[], note: any, indent: string): void {
    const { position, participantIds, text } = note;

    const escapedText = this.escapeText(text);

    if (position === 'over' && participantIds.length > 1) {
      const participants = participantIds.join(',');
      lines.push(`${indent}Note over ${participants}: ${escapedText}`);
    } else {
      const side = position === 'left' ? 'left of' : 'right of';
      const participant = participantIds[0];
      lines.push(`${indent}Note ${side} ${participant}: ${escapedText}`);
    }
  }

  private exportControlStart(lines: string[], control: any, indent: string): void {
    const { type, label, branches, color } = control;

    switch (type) {
      case 'loop':
        lines.push(`${indent}loop ${label}`);
        break;

      case 'alt':
        lines.push(`${indent}alt ${label}`);
        // Handle branches
        if (branches && branches.length > 1) {
          branches.slice(1).forEach((branch: any) => {
            lines.push(`${indent}else ${branch.label}`);
          });
        }
        break;

      case 'opt':
        lines.push(`${indent}opt ${label}`);
        break;

      case 'par':
        lines.push(`${indent}par ${label}`);
        // Handle branches
        if (branches && branches.length > 1) {
          branches.slice(1).forEach((branch: any) => {
            lines.push(`${indent}and ${branch.label}`);
          });
        }
        break;

      case 'critical':
        lines.push(`${indent}critical ${label}`);
        // Handle options
        if (branches && branches.length > 0) {
          branches.forEach((branch: any) => {
            lines.push(`${indent}option ${branch.label}`);
          });
        }
        break;

      case 'break':
        lines.push(`${indent}break ${label}`);
        break;

      case 'rect':
        const rectColor = color || 'rgb(200,200,200)';
        lines.push(`${indent}rect ${rectColor}`);
        break;
    }
  }

  private escapeText(text: string): string {
    // Escape special characters
    // Check if 'end' appears as a standalone word
    if (/\bend\b/i.test(text)) {
      text = text.replace(/\bend\b/gi, '"end"');
    }
    return text;
  }

  public exportToFile(): void {
    const mermaidCode = this.export();
    const blob = new Blob([mermaidCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'sequence-diagram.mmd';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public exportToClipboard(): void {
    const mermaidCode = this.export();
    navigator.clipboard.writeText(mermaidCode).then(() => {
      alert('Mermaid code copied to clipboard!');
    });
  }
}
