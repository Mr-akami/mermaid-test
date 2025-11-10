import type { Statement, Loop, Alt, Opt, Message } from '../model/types';

/**
 * Helper for managing containment relationships between control structures and messages
 */
export class ContainmentHelper {
  /**
   * Check if a point is inside bounds
   */
  static isPointInBounds(
    point: { x: number; y: number },
    bounds: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  /**
   * Check if a bounds is fully contained in another bounds
   */
  static isBoundsContained(
    inner: { x: number; y: number; width: number; height: number },
    outer: { x: number; y: number; width: number; height: number }
  ): boolean {
    const innerCenter = {
      x: inner.x + inner.width / 2,
      y: inner.y + inner.height / 2
    };
    return this.isPointInBounds(innerCenter, outer);
  }

  /**
   * Find which control structure contains a message at given position
   */
  static findContainingStructure(
    messageY: number,
    statements: Statement[]
  ): { structure: Loop | Alt | Opt; index: number } | null {
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      if ('type' in statement && statement.type && (statement as any).bounds) {
        const structure = statement as Loop | Alt | Opt;
        const bounds = (structure as any).bounds;

        if (bounds && messageY >= bounds.y && messageY <= bounds.y + bounds.height) {
          return { structure, index: i };
        }
      }
    }

    return null;
  }

  /**
   * Get all messages at a specific statement index
   */
  static getMessagesInStructure(structure: Loop | Alt | Opt): Message[] {
    const messages: Message[] = [];

    if ('statements' in structure) {
      structure.statements.forEach(stmt => {
        if ('sender' in stmt && 'receiver' in stmt) {
          messages.push(stmt as Message);
        }
      });
    } else if ('branches' in structure) {
      structure.branches.forEach(branch => {
        branch.statements.forEach(stmt => {
          if ('sender' in stmt && 'receiver' in stmt) {
            messages.push(stmt as Message);
          }
        });
      });
    }

    return messages;
  }

  /**
   * Update structure to contain/exclude messages based on bounds
   */
  static updateStructureContainment(
    structure: Loop | Alt | Opt,
    allStatements: Statement[],
    messagePositions: Map<number, number>
  ): boolean {
    if (!(structure as any).bounds) return false;

    const bounds = (structure as any).bounds;
    const currentMessages = this.getMessagesInStructure(structure);
    const newMessages: Message[] = [];

    // Check all top-level messages
    allStatements.forEach((statement, index) => {
      if ('sender' in statement && 'receiver' in statement) {
        const messageY = messagePositions.get(index);
        if (messageY !== undefined) {
          // Check if message center is inside structure bounds
          if (messageY >= bounds.y && messageY <= bounds.y + bounds.height) {
            newMessages.push(statement as Message);
          }
        }
      }
    });

    // Check if containment changed
    const changed = newMessages.length !== currentMessages.length ||
      newMessages.some((msg, i) => {
        const current = currentMessages[i];
        return !current || msg.sender !== current.sender ||
               msg.receiver !== current.receiver || msg.text !== current.text;
      });

    if (changed) {
      // Update structure
      if ('statements' in structure) {
        (structure as Loop | Opt).statements = newMessages;
      } else if ('branches' in structure && structure.branches.length > 0) {
        structure.branches[0].statements = newMessages;
      }
    }

    return changed;
  }

  /**
   * Extract messages from structure and place them at top level
   */
  static extractMessagesFromStructure(
    structure: Loop | Alt | Opt,
    insertAtIndex: number
  ): Message[] {
    const messages: Message[] = [];

    if ('statements' in structure) {
      structure.statements.forEach(stmt => {
        if ('sender' in stmt && 'receiver' in stmt) {
          messages.push(stmt as Message);
        }
      });
      // Clear statements
      structure.statements = [];
    } else if ('branches' in structure) {
      structure.branches.forEach(branch => {
        branch.statements.forEach(stmt => {
          if ('sender' in stmt && 'receiver' in stmt) {
            messages.push(stmt as Message);
          }
        });
        branch.statements = [];
      });
    }

    return messages;
  }

  /**
   * Move messages into a structure
   */
  static moveMessagesIntoStructure(
    structure: Loop | Alt | Opt,
    messages: Message[]
  ): void {
    if ('statements' in structure) {
      structure.statements = [...structure.statements, ...messages];
    } else if ('branches' in structure && structure.branches.length > 0) {
      structure.branches[0].statements = [...structure.branches[0].statements, ...messages];
    }
  }
}
