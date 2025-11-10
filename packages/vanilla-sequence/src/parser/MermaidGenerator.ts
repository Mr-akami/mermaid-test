import { Diagram } from '../models/Diagram';
import { Participant } from '../models/Participant';
import { Message } from '../models/Message';
import { Note } from '../models/Note';
import { Block } from '../models/Block';
import type { BlockSection } from '../models/Block';

export class MermaidGenerator {
  generate(diagram: Diagram): string {
    const lines: string[] = [];

    // ダイアグラム宣言
    lines.push('sequenceDiagram');

    // autonumber
    if (diagram.autoNumber) {
      lines.push('  autonumber');
    }

    // Participants（明示的定義のみ）
    const explicitParticipants = diagram.getParticipantsInOrder().filter(p => p.isExplicit);
    explicitParticipants.forEach(p => {
      lines.push(this.generateParticipant(p));
    });

    // Box（participantのグルーピング）
    // TODO: box実装

    // Messages, Notes, Blocks を order でソート
    const items = this.getSortedItems(diagram);

    items.forEach(item => {
      if (item.type === 'message') {
        lines.push(this.generateMessage(item.data as Message));
      } else if (item.type === 'note') {
        lines.push(this.generateNote(item.data as Note));
      } else if (item.type === 'block-start') {
        lines.push(this.generateBlockStart(item.data as Block));
      } else if (item.type === 'block-section') {
        lines.push(this.generateBlockSection(item.data as { block: Block; section: BlockSection }));
      } else if (item.type === 'block-end') {
        lines.push('  end');
      } else if (item.type === 'activation-start') {
        const participantId = (item.data as any).participantId;
        lines.push(`  activate ${participantId}`);
      } else if (item.type === 'activation-end') {
        const participantId = (item.data as any).participantId;
        lines.push(`  deactivate ${participantId}`);
      }
    });

    // Links
    diagram.getParticipantsInOrder().forEach(p => {
      p.links.forEach(link => {
        lines.push(`  link ${p.id}: ${link.label} @ ${link.url}`);
      });
    });

    return lines.join('\n');
  }

  private generateParticipant(p: Participant): string {
    const keyword = p.isCreated ? 'create ' : '';
    const type = p.type === 'actor' ? 'actor' : 'participant';
    const alias = p.label ? ` as ${p.label}` : '';
    return `  ${keyword}${type} ${p.id}${alias}`;
  }

  private generateMessage(m: Message): string {
    let arrow = m.arrowType;

    // activation shorthand
    if (m.activateFrom) arrow = arrow.replace('-', '-+') as any;
    if (m.activateTo) arrow = arrow.replace('>>', '>>+') as any;
    if (m.deactivateFrom) arrow = arrow.replace('-', '--') as any;
    if (m.deactivateTo) arrow = arrow.replace('>>', '>>-') as any;

    return `  ${m.from}${arrow}${m.to}: ${m.text}`;
  }

  private generateNote(n: Note): string {
    if (n.participants.length === 1) {
      return `  Note ${n.position} ${n.participants[0]}: ${n.text}`;
    } else if (n.participants.length > 1) {
      return `  Note over ${n.participants.join(',')}: ${n.text}`;
    }
    return '';
  }

  private generateBlockStart(b: Block): string {
    switch (b.type) {
      case 'loop':
        return `  loop ${b.label}`;
      case 'alt':
        return `  alt ${b.label}`;
      case 'opt':
        return `  opt ${b.label}`;
      case 'par':
        return `  par ${b.label}`;
      case 'critical':
        return `  critical ${b.label}`;
      case 'break':
        return `  break ${b.label}`;
      case 'rect':
        const colorStr = b.color ? this.colorToString(b.color) : '';
        return `  rect ${colorStr}`;
      case 'box':
        const boxColor = b.color ? this.colorToString(b.color) : '';
        const desc = b.description || '';
        return `  box ${boxColor} ${desc}`;
      default:
        return `  ${b.type} ${b.label}`;
    }
  }

  private generateBlockSection(data: { block: Block; section: BlockSection }): string {
    const { block, section } = data;
    if (block.type === 'alt') {
      return `  else ${section.label}`;
    } else if (block.type === 'par') {
      return `  and ${section.label}`;
    } else if (block.type === 'critical') {
      return `  option ${section.label}`;
    }
    return '';
  }

  private getSortedItems(diagram: Diagram): Array<{ type: string; order: number; data: any }> {
    const items: Array<{ type: string; order: number; data: any }> = [];

    // Messages
    diagram.messages.forEach(m => {
      items.push({ type: 'message', order: m.order, data: m });
    });

    // Notes
    diagram.notes.forEach(n => {
      items.push({ type: 'note', order: n.order, data: n });
    });

    // Blocks
    diagram.blocks.forEach(b => {
      items.push({ type: 'block-start', order: b.startOrder, data: b });
      items.push({ type: 'block-end', order: b.endOrder + 0.9, data: b });

      b.sections.forEach(section => {
        items.push({
          type: 'block-section',
          order: section.startOrder,
          data: { block: b, section },
        });
      });
    });

    // Activations
    diagram.activations.forEach(a => {
      items.push({
        type: 'activation-start',
        order: a.startOrder,
        data: { participantId: a.participantId },
      });
      items.push({
        type: 'activation-end',
        order: a.endOrder + 0.8,
        data: { participantId: a.participantId },
      });
    });

    items.sort((a, b) => a.order - b.order);
    return items;
  }

  private colorToString(color: { r: number; g: number; b: number; a?: number }): string {
    if (color.a !== undefined) {
      return `rgba(${color.r},${color.g},${color.b},${color.a})`;
    }
    return `rgb(${color.r},${color.g},${color.b})`;
  }
}
