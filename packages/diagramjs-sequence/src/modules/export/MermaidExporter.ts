/**
 * MermaidExporter - Exports sequence diagram to Mermaid syntax
 */

import type { Canvas, ElementRegistry } from 'diagram-js';

export default class MermaidExporter {
  static $inject = ['canvas', 'elementRegistry'];

  constructor(
    private canvas: Canvas,
    private elementRegistry: ElementRegistry
  ) {}

  exportToMermaid(): string {
    const lines: string[] = [];

    // Diagram declaration
    lines.push('sequenceDiagram');

    // Get all elements
    const participants = this.getParticipants();
    const messages = this.getMessages();
    const notes = this.getNotes();
    const blocks = this.getBlocks();

    // Export participants (in order)
    participants.forEach(p => {
      const { businessObject } = p;
      const keyword = p.type === 'actor' ? 'actor' : 'participant';
      const id = businessObject?.id || p.id;
      const label = businessObject?.label;

      if (label && label !== id) {
        lines.push(`    ${keyword} ${id} as ${label}`);
      } else {
        lines.push(`    ${keyword} ${id}`);
      }
    });

    // Export messages (in order)
    const sortedMessages = messages.sort((a, b) => {
      const orderA = a.businessObject?.order || 0;
      const orderB = b.businessObject?.order || 0;
      return orderA - orderB;
    });

    sortedMessages.forEach(m => {
      const { businessObject, source, target } = m;
      const sourceId = source?.businessObject?.id || source?.id || 'A';
      const targetId = target?.businessObject?.id || target?.id || 'B';
      const arrow = businessObject?.arrowType || '->>';
      const text = businessObject?.text || '';

      lines.push(`    ${sourceId}${arrow}${targetId}: ${text}`);
    });

    // Export notes
    notes.forEach(n => {
      const { businessObject } = n;
      const position = businessObject?.position || 'right';
      const text = businessObject?.text || '';
      const participants = businessObject?.participants || [];

      if (participants.length > 1) {
        lines.push(`    Note over ${participants.join(',')}: ${text}`);
      } else if (participants.length === 1) {
        lines.push(`    Note ${position} of ${participants[0]}: ${text}`);
      } else {
        // Fallback
        lines.push(`    Note right of A: ${text}`);
      }
    });

    // Export blocks (simplified - nested blocks not fully supported here)
    blocks.forEach(b => {
      const { type, businessObject } = b;
      const label = businessObject?.label || '';

      if (type === 'loop') {
        lines.push(`    loop ${label}`);
        lines.push(`        %% Block content`);
        lines.push(`    end`);
      } else if (type === 'alt') {
        lines.push(`    alt ${label}`);
        lines.push(`        %% Block content`);
        lines.push(`    else ${label}`);
        lines.push(`        %% Block content`);
        lines.push(`    end`);
      } else if (type === 'opt') {
        lines.push(`    opt ${label}`);
        lines.push(`        %% Block content`);
        lines.push(`    end`);
      } else if (type === 'par') {
        lines.push(`    par ${label}`);
        lines.push(`        %% Block content`);
        lines.push(`    and ${label}`);
        lines.push(`        %% Block content`);
        lines.push(`    end`);
      } else if (type === 'critical') {
        lines.push(`    critical ${label}`);
        lines.push(`        %% Block content`);
        lines.push(`    end`);
      } else if (type === 'break') {
        lines.push(`    break ${label}`);
        lines.push(`        %% Block content`);
        lines.push(`    end`);
      } else if (type === 'rect') {
        const color = businessObject?.color || 'rgb(200, 200, 200)';
        lines.push(`    rect ${color}`);
        lines.push(`        %% Block content`);
        lines.push(`    end`);
      } else if (type === 'box') {
        const color = businessObject?.color || '';
        lines.push(`    box ${color} ${label}`);
        lines.push(`        %% Participants`);
        lines.push(`    end`);
      }
    });

    return lines.join('\n');
  }

  private getParticipants(): any[] {
    const participants: any[] = [];

    this.elementRegistry.forEach((element: any) => {
      if (element.type === 'participant' || element.type === 'actor') {
        participants.push(element);
      }
    });

    // Sort by x position (left to right)
    participants.sort((a, b) => (a.x || 0) - (b.x || 0));

    return participants;
  }

  private getMessages(): any[] {
    const messages: any[] = [];

    this.elementRegistry.forEach((element: any) => {
      if (element.type === 'message') {
        messages.push(element);
      }
    });

    return messages;
  }

  private getNotes(): any[] {
    const notes: any[] = [];

    this.elementRegistry.forEach((element: any) => {
      if (element.type === 'note') {
        notes.push(element);
      }
    });

    return notes;
  }

  private getBlocks(): any[] {
    const blocks: any[] = [];

    this.elementRegistry.forEach((element: any) => {
      if (['loop', 'alt', 'opt', 'par', 'critical', 'break', 'rect', 'box'].includes(element.type)) {
        blocks.push(element);
      }
    });

    return blocks;
  }

  downloadMermaid(filename: string = 'sequence-diagram.mmd'): void {
    const mermaidCode = this.exportToMermaid();
    const blob = new Blob([mermaidCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  copyToClipboard(): Promise<void> {
    const mermaidCode = this.exportToMermaid();
    return navigator.clipboard.writeText(mermaidCode);
  }
}

export const MermaidExporterModule = {
  __init__: ['mermaidExporter'],
  mermaidExporter: ['type', MermaidExporter]
};
