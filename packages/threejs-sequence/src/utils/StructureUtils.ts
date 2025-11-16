import type { Statement, Message, ControlStructure } from '../model/types';

/**
 * StructureUtils provides pure functions for control structure operations
 */
export class StructureUtils {
  /**
   * Check if two structures are equal based on their type and identifying properties
   */
  static structuresEqual(struct1: any, struct2: any): boolean {
    if (!struct1 || !struct2) return false;

    // Check type match
    if (struct1.type !== struct2.type) return false;

    // For loop structures, compare labels
    if (struct1.type === 'loop' && struct2.type === 'loop') {
      return struct1.label === struct2.label;
    }

    // For alt structures, compare first branch condition
    if (struct1.type === 'alt' && struct2.type === 'alt') {
      const condition1 = struct1.branches?.[0]?.condition;
      const condition2 = struct2.branches?.[0]?.condition;
      return condition1 === condition2;
    }

    // For opt structures, compare condition
    if (struct1.type === 'opt' && struct2.type === 'opt') {
      return struct1.condition === struct2.condition;
    }

    // For par structures, just type is enough (no unique identifier)
    if (struct1.type === 'par' && struct2.type === 'par') {
      return true;
    }

    // Default: type match is enough
    return true;
  }

  /**
   * Get all messages from a structure recursively
   */
  static getMessagesFromStructure(structure: ControlStructure): Message[] {
    const messages: Message[] = [];

    if ('statements' in structure && Array.isArray(structure.statements)) {
      // Loop, Opt, Par structures
      for (const stmt of structure.statements) {
        if (this.isMessage(stmt)) {
          messages.push(stmt);
        } else if (this.isControlStructure(stmt)) {
          messages.push(...this.getMessagesFromStructure(stmt));
        }
      }
    } else if ('branches' in structure && Array.isArray(structure.branches)) {
      // Alt structure
      for (const branch of structure.branches) {
        for (const stmt of branch.statements) {
          if (this.isMessage(stmt)) {
            messages.push(stmt);
          } else if (this.isControlStructure(stmt)) {
            messages.push(...this.getMessagesFromStructure(stmt));
          }
        }
      }
    }

    return messages;
  }

  /**
   * Get all nested control structures from a structure
   */
  static getNestedStructures(structure: ControlStructure): ControlStructure[] {
    const structures: ControlStructure[] = [];

    if ('statements' in structure && Array.isArray(structure.statements)) {
      for (const stmt of structure.statements) {
        if (this.isControlStructure(stmt)) {
          structures.push(stmt);
          structures.push(...this.getNestedStructures(stmt));
        }
      }
    } else if ('branches' in structure && Array.isArray(structure.branches)) {
      for (const branch of structure.branches) {
        for (const stmt of branch.statements) {
          if (this.isControlStructure(stmt)) {
            structures.push(stmt);
            structures.push(...this.getNestedStructures(stmt));
          }
        }
      }
    }

    return structures;
  }

  /**
   * Find a structure in statements that matches a predicate
   */
  static findStructure(
    statements: Statement[],
    predicate: (structure: ControlStructure) => boolean
  ): { structure: ControlStructure; index: number } | null {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (this.isControlStructure(stmt) && predicate(stmt)) {
        return { structure: stmt, index: i };
      }
    }
    return null;
  }

  /**
   * Get the display label for a structure
   */
  static getStructureLabel(structure: ControlStructure): string {
    if ('label' in structure && typeof structure.label === 'string') {
      return structure.label;
    }
    if ('condition' in structure && typeof structure.condition === 'string') {
      return structure.condition;
    }
    if ('branches' in structure && structure.branches.length > 0) {
      const firstBranch = structure.branches[0];
      if ('condition' in firstBranch) {
        return firstBranch.condition || 'alt';
      }
      if ('label' in firstBranch) {
        return firstBranch.label || 'par';
      }
    }
    return structure.type;
  }

  /**
   * Check if a statement is a message
   */
  static isMessage(stmt: Statement): stmt is Message {
    return 'sender' in stmt && 'receiver' in stmt && 'arrow' in stmt;
  }

  /**
   * Check if a statement is a control structure
   */
  static isControlStructure(stmt: Statement): stmt is ControlStructure {
    return 'type' in stmt && (
      stmt.type === 'loop' ||
      stmt.type === 'alt' ||
      stmt.type === 'opt' ||
      stmt.type === 'par'
    );
  }

  /**
   * Check if a statement is a note
   */
  static isNote(stmt: Statement): boolean {
    return 'position' in stmt && 'participants' in stmt && 'text' in stmt;
  }

  /**
   * Remove a message from a structure's statements
   * Returns true if message was found and removed
   */
  static removeMessageFromStructure(structure: ControlStructure, message: Message): boolean {
    if ('statements' in structure && Array.isArray(structure.statements)) {
      const index = structure.statements.findIndex(stmt =>
        this.isMessage(stmt) &&
        stmt.sender === message.sender &&
        stmt.receiver === message.receiver &&
        stmt.text === message.text
      );

      if (index !== -1) {
        structure.statements.splice(index, 1);
        return true;
      }
    } else if ('branches' in structure && Array.isArray(structure.branches)) {
      for (const branch of structure.branches) {
        const index = branch.statements.findIndex(stmt =>
          this.isMessage(stmt) &&
          stmt.sender === message.sender &&
          stmt.receiver === message.receiver &&
          stmt.text === message.text
        );

        if (index !== -1) {
          branch.statements.splice(index, 1);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Insert a message into a structure at a specific index
   */
  static insertMessageIntoStructure(
    structure: ControlStructure,
    message: Message,
    index: number
  ): void {
    if ('statements' in structure && Array.isArray(structure.statements)) {
      structure.statements.splice(index, 0, message);
    } else if ('branches' in structure && Array.isArray(structure.branches)) {
      // For alt structures, insert into first branch by default
      if (structure.branches.length > 0) {
        structure.branches[0].statements.splice(index, 0, message);
      }
    }
  }
}
