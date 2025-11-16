import type { Message, Bounds } from '../model/types';

/**
 * MessagePositionUtils provides pure functions for message position calculations
 */
export class MessagePositionUtils {
  /**
   * Generate a unique key for a message based on its properties
   * Used for storing message positions in a Map
   */
  static generateMessageKey(message: Message): string {
    return `${message.sender}-${message.receiver}-${message.text || ''}`;
  }

  /**
   * Get the effective Y position of a message
   * Handles both absolute positions (for top-level messages) and relative positions (for messages in structures)
   */
  static getMessageY(
    messageKey: string | number,
    parentStructure: { bounds: Bounds } | null,
    messagePositions: Map<number | string, number>,
    defaultY: number
  ): number {
    const storedPosition = messagePositions.get(messageKey);

    if (storedPosition !== undefined) {
      if (parentStructure && parentStructure.bounds) {
        // Stored position is relative offset, convert to absolute
        return parentStructure.bounds.y + storedPosition;
      } else {
        // Stored position is absolute
        return storedPosition;
      }
    }

    // No stored position, use default
    return defaultY;
  }

  /**
   * Find the insertion index for a message based on its Y position
   * among existing messages
   */
  static findInsertionIndex(
    targetY: number,
    existingMessages: Array<{ y: number }>,
    ascending: boolean = true
  ): number {
    if (existingMessages.length === 0) {
      return 0;
    }

    for (let i = 0; i < existingMessages.length; i++) {
      if (ascending) {
        if (targetY < existingMessages[i].y) {
          return i;
        }
      } else {
        if (targetY > existingMessages[i].y) {
          return i;
        }
      }
    }

    return existingMessages.length;
  }

  /**
   * Calculate the Y position for a message within a structure
   * based on its index
   */
  static calculateStructureMessageY(
    structureBounds: Bounds,
    messageIndexInStructure: number,
    headerHeight: number,
    messageSpacing: number
  ): number {
    return structureBounds.y + headerHeight + messageIndexInStructure * messageSpacing;
  }

  /**
   * Check if a message position should be stored as relative offset
   * (true for messages inside structures, false for top-level messages)
   */
  static shouldUseRelativePosition(parentStructure: any): boolean {
    return parentStructure != null && parentStructure.bounds != null;
  }
}
