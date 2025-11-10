/**
 * Mermaid text format parser and exporter
 * Converts between SequenceDiagram model and Mermaid text syntax
 */

import type {
  SequenceDiagram,
  DiagramElement,
  Message,
  Activation,
  CreateParticipant,
  DestroyParticipant,
  Note,
  Loop,
  Alt,
  Opt,
  Par,
  Critical,
  Break,
  Rect,
  Box,
  Comment,
  Participant,
  ParticipantType
} from './model';
import { createEmptyDiagram, addParticipant, getOrCreateParticipant } from './model';

/**
 * Export diagram to Mermaid text format
 */
export function exportToMermaid(diagram: SequenceDiagram): string {
  const lines: string[] = ['sequenceDiagram'];

  // Add autonumber if enabled
  if (diagram.config.autonumber) {
    lines.push('  autonumber');
  }

  // Sort participants by order (explicit first, then implicit)
  const participants = Array.from(diagram.participants.values())
    .sort((a, b) => {
      if (a.explicit !== b.explicit) {
        return a.explicit ? -1 : 1;
      }
      return a.order - b.order;
    });

  // Export explicit participants
  for (const p of participants) {
    if (p.explicit) {
      let line = `  ${p.type} ${p.id}`;
      if (p.label) {
        line += ` as ${p.label}`;
      }
      lines.push(line);

      // Add links
      for (const link of p.links) {
        lines.push(`  link ${p.id}: ${link.label} @ ${link.url}`);
      }
    }
  }

  // Export elements
  for (const element of diagram.elements) {
    exportElement(element, lines, '  ');
  }

  return lines.join('\n');
}

/**
 * Export a single diagram element
 */
function exportElement(element: DiagramElement, lines: string[], indent: string): void {
  switch (element.type) {
    case 'message': {
      const msg = element as Message;
      let arrow = msg.arrow;

      // Add activation/deactivation modifiers
      if (msg.activateTo) {
        arrow = arrow.replace(/>$/, '+>') as any;
      }
      if (msg.deactivateFrom) {
        arrow = '-' + arrow.slice(1) as any;
      }

      const text = msg.text || '';
      lines.push(`${indent}${msg.from}${arrow}${msg.to}:${text}`);
      break;
    }

    case 'activation': {
      const act = element as Activation;
      lines.push(`${indent}${act.action} ${act.actor}`);
      break;
    }

    case 'create': {
      const create = element as CreateParticipant;
      let line = `${indent}create ${create.participantType} ${create.id}`;
      if (create.label) {
        line += ` as ${create.label}`;
      }
      lines.push(line);
      break;
    }

    case 'destroy': {
      const destroy = element as DestroyParticipant;
      lines.push(`${indent}destroy ${destroy.id}`);
      break;
    }

    case 'note': {
      const note = element as Note;
      if (note.actors.length === 1) {
        lines.push(`${indent}Note ${note.position} ${note.actors[0]}: ${note.text}`);
      } else if (note.actors.length === 2 && note.position === 'over') {
        lines.push(`${indent}Note over ${note.actors.join(',')}: ${note.text}`);
      }
      break;
    }

    case 'loop': {
      const loop = element as Loop;
      lines.push(`${indent}loop ${loop.label}`);
      for (const stmt of loop.statements) {
        exportElement(stmt, lines, indent + '  ');
      }
      lines.push(`${indent}end`);
      break;
    }

    case 'alt': {
      const alt = element as Alt;
      for (let i = 0; i < alt.branches.length; i++) {
        const branch = alt.branches[i];
        if (i === 0) {
          lines.push(`${indent}alt ${branch.condition}`);
        } else {
          lines.push(`${indent}else ${branch.condition}`);
        }
        for (const stmt of branch.statements) {
          exportElement(stmt, lines, indent + '  ');
        }
      }
      lines.push(`${indent}end`);
      break;
    }

    case 'opt': {
      const opt = element as Opt;
      lines.push(`${indent}opt ${opt.condition}`);
      for (const stmt of opt.statements) {
        exportElement(stmt, lines, indent + '  ');
      }
      lines.push(`${indent}end`);
      break;
    }

    case 'par': {
      const par = element as Par;
      for (let i = 0; i < par.branches.length; i++) {
        const branch = par.branches[i];
        if (i === 0) {
          lines.push(`${indent}par ${branch.label}`);
        } else {
          lines.push(`${indent}and ${branch.label}`);
        }
        for (const stmt of branch.statements) {
          exportElement(stmt, lines, indent + '  ');
        }
      }
      lines.push(`${indent}end`);
      break;
    }

    case 'critical': {
      const crit = element as Critical;
      lines.push(`${indent}critical ${crit.action}`);
      for (const stmt of crit.statements) {
        exportElement(stmt, lines, indent + '  ');
      }
      for (const option of crit.options) {
        lines.push(`${indent}option ${option.situation}`);
        for (const stmt of option.statements) {
          exportElement(stmt, lines, indent + '  ');
        }
      }
      lines.push(`${indent}end`);
      break;
    }

    case 'break': {
      const brk = element as Break;
      lines.push(`${indent}break ${brk.description}`);
      for (const stmt of brk.statements) {
        exportElement(stmt, lines, indent + '  ');
      }
      lines.push(`${indent}end`);
      break;
    }

    case 'rect': {
      const rect = element as Rect;
      lines.push(`${indent}rect ${rect.color}`);
      for (const stmt of rect.statements) {
        exportElement(stmt, lines, indent + '  ');
      }
      lines.push(`${indent}end`);
      break;
    }

    case 'box': {
      const box = element as Box;
      let line = `${indent}box`;
      if (box.color) {
        line += ` ${box.color}`;
      }
      if (box.description) {
        line += ` ${box.description}`;
      }
      lines.push(line);
      // Box participants are handled separately in main export
      lines.push(`${indent}end`);
      break;
    }

    case 'comment': {
      const comment = element as Comment;
      lines.push(`${indent}%% ${comment.text}`);
      break;
    }
  }
}

/**
 * Parse Mermaid text format to diagram model
 * This is a simplified parser - a full implementation would use a proper parser generator
 */
export function parseFromMermaid(text: string): SequenceDiagram {
  const diagram = createEmptyDiagram();
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));

  let currentIndex = 0;

  // Check for sequenceDiagram keyword
  if (lines[currentIndex]?.startsWith('sequenceDiagram')) {
    currentIndex++;
  }

  // Parse elements
  while (currentIndex < lines.length) {
    currentIndex = parseLine(lines, currentIndex, diagram, diagram.elements);
  }

  return diagram;
}

/**
 * Parse a single line or block
 */
function parseLine(
  lines: string[],
  index: number,
  diagram: SequenceDiagram,
  elements: DiagramElement[]
): number {
  const line = lines[index];

  // Autonumber
  if (line === 'autonumber') {
    diagram.config.autonumber = true;
    return index + 1;
  }

  // Participant
  const participantMatch = line.match(/^(participant|actor)\s+(\w+)(?:\s+as\s+(.+))?$/);
  if (participantMatch) {
    const [, type, id, label] = participantMatch;
    addParticipant(diagram, id, type as ParticipantType, label, true);
    return index + 1;
  }

  // Create participant
  const createMatch = line.match(/^create\s+(participant|actor)\s+(\w+)(?:\s+as\s+(.+))?$/);
  if (createMatch) {
    const [, type, id, label] = createMatch;
    elements.push({
      type: 'create',
      participantType: type as ParticipantType,
      id,
      label
    });
    return index + 1;
  }

  // Destroy
  const destroyMatch = line.match(/^destroy\s+(\w+)$/);
  if (destroyMatch) {
    elements.push({ type: 'destroy', id: destroyMatch[1] });
    return index + 1;
  }

  // Message
  const arrowPattern = '(<<-?-?>>|<<-?>>|-[x)]|-{1,2}>>?|-{1,2}[x)])';
  const messageMatch = line.match(new RegExp(`^(\\w+)(${arrowPattern})([+])?([\\w]+)([-])?:(.*)$`));
  if (messageMatch) {
    const [, from, arrow, , to, , text] = messageMatch;
    const activateTo = line.includes('+');
    const deactivateFrom = arrow.startsWith('-') && line.includes('-');

    getOrCreateParticipant(diagram, from);
    getOrCreateParticipant(diagram, to);

    elements.push({
      type: 'message',
      from,
      to,
      arrow: arrow as any,
      text: text.trim(),
      activateTo,
      deactivateFrom
    });
    return index + 1;
  }

  // Activation
  const activationMatch = line.match(/^(activate|deactivate)\s+(\w+)$/);
  if (activationMatch) {
    const [, action, actor] = activationMatch;
    elements.push({
      type: 'activation',
      actor,
      action: action as 'activate' | 'deactivate'
    });
    return index + 1;
  }

  // Note
  const noteMatch = line.match(/^Note\s+(left of|right of|over)\s+([\w,]+):(.*)$/);
  if (noteMatch) {
    const [, position, actors, text] = noteMatch;
    elements.push({
      type: 'note',
      position: position as any,
      actors: actors.split(',').map(a => a.trim()),
      text: text.trim()
    });
    return index + 1;
  }

  // Loop
  if (line.startsWith('loop ')) {
    const label = line.substring(5);
    const loopStatements: DiagramElement[] = [];
    let i = index + 1;
    while (i < lines.length && lines[i] !== 'end') {
      i = parseLine(lines, i, diagram, loopStatements);
    }
    elements.push({ type: 'loop', label, statements: loopStatements });
    return i + 1; // skip 'end'
  }

  // Alt
  if (line.startsWith('alt ')) {
    const condition = line.substring(4);
    const branches: Array<{ condition: string; statements: DiagramElement[] }> = [];
    let currentBranch: DiagramElement[] = [];
    let i = index + 1;

    branches.push({ condition, statements: currentBranch });

    while (i < lines.length && lines[i] !== 'end') {
      if (lines[i].startsWith('else ')) {
        const elseCondition = lines[i].substring(5);
        currentBranch = [];
        branches.push({ condition: elseCondition, statements: currentBranch });
        i++;
      } else {
        i = parseLine(lines, i, diagram, currentBranch);
      }
    }
    elements.push({ type: 'alt', branches });
    return i + 1;
  }

  // Opt
  if (line.startsWith('opt ')) {
    const condition = line.substring(4);
    const optStatements: DiagramElement[] = [];
    let i = index + 1;
    while (i < lines.length && lines[i] !== 'end') {
      i = parseLine(lines, i, diagram, optStatements);
    }
    elements.push({ type: 'opt', condition, statements: optStatements });
    return i + 1;
  }

  // Par
  if (line.startsWith('par ')) {
    const label = line.substring(4);
    const branches: Array<{ label: string; statements: DiagramElement[] }> = [];
    let currentBranch: DiagramElement[] = [];
    let i = index + 1;

    branches.push({ label, statements: currentBranch });

    while (i < lines.length && lines[i] !== 'end') {
      if (lines[i].startsWith('and ')) {
        const andLabel = lines[i].substring(4);
        currentBranch = [];
        branches.push({ label: andLabel, statements: currentBranch });
        i++;
      } else {
        i = parseLine(lines, i, diagram, currentBranch);
      }
    }
    elements.push({ type: 'par', branches });
    return i + 1;
  }

  // Rect
  if (line.startsWith('rect ')) {
    const color = line.substring(5);
    const rectStatements: DiagramElement[] = [];
    let i = index + 1;
    while (i < lines.length && lines[i] !== 'end') {
      i = parseLine(lines, i, diagram, rectStatements);
    }
    elements.push({ type: 'rect', color, statements: rectStatements });
    return i + 1;
  }

  // Skip unknown lines
  return index + 1;
}
