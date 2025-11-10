import type { SequenceDiagram, Participant, Statement, Message, Note, Loop, Alt, Opt } from './types';

/**
 * Simple Mermaid parser for sequence diagrams
 * Parses Mermaid syntax back into DiagramModel
 */
export class MermaidParser {
  parse(mermaidCode: string): SequenceDiagram {
    const lines = mermaidCode.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('%%'));

    const diagram: SequenceDiagram = {
      participants: [],
      boxes: [],
      statements: [],
      autoNumber: false
    };

    let currentIndex = 0;

    // Skip "sequenceDiagram" line
    if (lines[currentIndex]?.startsWith('sequenceDiagram')) {
      currentIndex++;
    }

    // Parse statements
    while (currentIndex < lines.length) {
      const line = lines[currentIndex];

      if (line.startsWith('autonumber')) {
        diagram.autoNumber = true;
        currentIndex++;
      } else if (line.startsWith('participant ') || line.startsWith('actor ')) {
        const participant = this.parseParticipant(line);
        if (participant) {
          diagram.participants.push(participant);
        }
        currentIndex++;
      } else if (line.startsWith('Note ')) {
        const note = this.parseNote(line);
        if (note) {
          diagram.statements.push(note);
        }
        currentIndex++;
      } else if (line.startsWith('loop ')) {
        const { loop, endIndex } = this.parseLoop(lines, currentIndex);
        if (loop) {
          diagram.statements.push(loop);
        }
        currentIndex = endIndex + 1;
      } else if (line.startsWith('alt ')) {
        const { alt, endIndex } = this.parseAlt(lines, currentIndex);
        if (alt) {
          diagram.statements.push(alt);
        }
        currentIndex = endIndex + 1;
      } else if (line.startsWith('opt ')) {
        const { opt, endIndex } = this.parseOpt(lines, currentIndex);
        if (opt) {
          diagram.statements.push(opt);
        }
        currentIndex = endIndex + 1;
      } else if (this.isMessage(line)) {
        const message = this.parseMessage(line);
        if (message) {
          diagram.statements.push(message);
        }
        currentIndex++;
      } else {
        currentIndex++;
      }
    }

    return diagram;
  }

  private parseParticipant(line: string): Participant | null {
    const match = line.match(/^(participant|actor)\s+(\w+)(?:\s+as\s+(.+))?/);
    if (!match) return null;

    const [, type, id, label] = match;
    return {
      id,
      type: type as 'participant' | 'actor',
      label: label?.trim(),
      links: []
    };
  }

  private isMessage(line: string): boolean {
    // Check for arrow patterns
    const arrowPatterns = ['->>',  '-->>',  '<<->>', '<<-->>',  '-x',  '--x', '-)', '--))','->',  '-->'];
    return arrowPatterns.some(arrow => line.includes(arrow));
  }

  private parseMessage(line: string): Message | null {
    // Try all arrow types
    const arrowPatterns = [
      { pattern: '<<-->>', arrow: '<<-->>' as const },
      { pattern: '<<->>', arrow: '<<->>' as const },
      { pattern: '-->>', arrow: '-->>' as const },
      { pattern: '->>', arrow: '->>' as const },
      { pattern: '--x', arrow: '--x' as const },
      { pattern: '-x', arrow: '-x' as const },
      { pattern: '--))','arrow': '--))'as const },
      { pattern: '-)', arrow: '-)'as const },
      { pattern: '-->', arrow: '-->' as const },
      { pattern: '->', arrow: '->' as const }
    ];

    for (const { pattern, arrow } of arrowPatterns) {
      if (line.includes(pattern)) {
        const parts = line.split(pattern);
        if (parts.length === 2) {
          const sender = parts[0].trim();
          const [receiver, ...textParts] = parts[1].split(':');
          const text = textParts.join(':').trim();

          return {
            sender,
            receiver: receiver.trim(),
            arrow,
            text: text || undefined
          };
        }
      }
    }

    return null;
  }

  private parseNote(line: string): Note | null {
    // Note left of A: text
    // Note right of A: text
    // Note over A,B: text
    const overMatch = line.match(/^Note\s+over\s+([\w,]+):\s*(.+)/i);
    if (overMatch) {
      const participants = overMatch[1].split(',').map(p => p.trim());
      return {
        position: 'over',
        participants,
        text: overMatch[2].trim()
      };
    }

    const sideMatch = line.match(/^Note\s+(left|right)\s+of\s+(\w+):\s*(.+)/i);
    if (sideMatch) {
      return {
        position: sideMatch[1] as 'left' | 'right',
        participants: [sideMatch[2].trim()],
        text: sideMatch[3].trim()
      };
    }

    return null;
  }

  private parseLoop(lines: string[], startIndex: number): { loop: Loop | null; endIndex: number } {
    const line = lines[startIndex];
    const match = line.match(/^loop\s+(.+)/);
    if (!match) return { loop: null, endIndex: startIndex };

    const label = match[1].trim();
    const statements: Statement[] = [];

    let currentIndex = startIndex + 1;
    let depth = 1;

    while (currentIndex < lines.length && depth > 0) {
      const currentLine = lines[currentIndex];

      if (currentLine === 'end') {
        depth--;
        if (depth === 0) break;
      } else if (currentLine.startsWith('loop ') || currentLine.startsWith('alt ') || currentLine.startsWith('opt ')) {
        depth++;
      }

      if (depth > 0) {
        if (this.isMessage(currentLine)) {
          const message = this.parseMessage(currentLine);
          if (message) statements.push(message);
        } else if (currentLine.startsWith('Note ')) {
          const note = this.parseNote(currentLine);
          if (note) statements.push(note);
        }
        currentIndex++;
      }
    }

    return {
      loop: { type: 'loop', label, statements },
      endIndex: currentIndex
    };
  }

  private parseAlt(lines: string[], startIndex: number): { alt: Alt | null; endIndex: number } {
    const line = lines[startIndex];
    const match = line.match(/^alt\s+(.+)/);
    if (!match) return { alt: null, endIndex: startIndex };

    const firstCondition = match[1].trim();
    const branches: Array<{ condition: string; statements: Statement[] }> = [];

    let currentBranch: { condition: string; statements: Statement[] } = {
      condition: firstCondition,
      statements: []
    };

    let currentIndex = startIndex + 1;
    let depth = 1;

    while (currentIndex < lines.length && depth > 0) {
      const currentLine = lines[currentIndex];

      if (currentLine === 'end') {
        depth--;
        if (depth === 0) {
          branches.push(currentBranch);
          break;
        }
      } else if (currentLine.startsWith('else ')) {
        branches.push(currentBranch);
        const elseMatch = currentLine.match(/^else\s+(.+)/);
        currentBranch = {
          condition: elseMatch?.[1].trim() || '',
          statements: []
        };
        currentIndex++;
        continue;
      } else if (currentLine.startsWith('alt ') || currentLine.startsWith('opt ') || currentLine.startsWith('loop ')) {
        depth++;
      }

      if (depth > 0) {
        if (this.isMessage(currentLine)) {
          const message = this.parseMessage(currentLine);
          if (message) currentBranch.statements.push(message);
        } else if (currentLine.startsWith('Note ')) {
          const note = this.parseNote(currentLine);
          if (note) currentBranch.statements.push(note);
        }
        currentIndex++;
      }
    }

    return {
      alt: { type: 'alt', branches },
      endIndex: currentIndex
    };
  }

  private parseOpt(lines: string[], startIndex: number): { opt: Opt | null; endIndex: number } {
    const line = lines[startIndex];
    const match = line.match(/^opt\s+(.+)/);
    if (!match) return { opt: null, endIndex: startIndex };

    const condition = match[1].trim();
    const statements: Statement[] = [];

    let currentIndex = startIndex + 1;
    let depth = 1;

    while (currentIndex < lines.length && depth > 0) {
      const currentLine = lines[currentIndex];

      if (currentLine === 'end') {
        depth--;
        if (depth === 0) break;
      } else if (currentLine.startsWith('loop ') || currentLine.startsWith('alt ') || currentLine.startsWith('opt ')) {
        depth++;
      }

      if (depth > 0) {
        if (this.isMessage(currentLine)) {
          const message = this.parseMessage(currentLine);
          if (message) statements.push(message);
        } else if (currentLine.startsWith('Note ')) {
          const note = this.parseNote(currentLine);
          if (note) statements.push(note);
        }
        currentIndex++;
      }
    }

    return {
      opt: { type: 'opt', condition, statements },
      endIndex: currentIndex
    };
  }
}
