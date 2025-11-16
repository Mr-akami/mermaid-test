/**
 * IdGenerator provides pure functions for generating unique IDs
 */
export class IdGenerator {
  /**
   * Generate a unique ID with the given prefix and a zero-padded numeric suffix
   * @param prefix The prefix for the ID (e.g., 'act', 'part')
   * @param existingIds Array of existing IDs to check against
   * @returns A unique ID in the format "prefix-NN" (e.g., "act-01", "part-02")
   */
  static generateId(prefix: string, existingIds: string[]): string {
    const pattern = new RegExp(`^${prefix}-(\\d+)$`);
    let maxNumber = 0;

    existingIds.forEach(id => {
      const match = id.match(pattern);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    return `${prefix}-${String(maxNumber + 1).padStart(2, '0')}`;
  }

  /**
   * Check if an ID follows the expected format for a prefix
   * @param id The ID to check
   * @param prefix The expected prefix
   * @returns True if the ID matches the format "prefix-NN"
   */
  static isValidFormat(id: string, prefix: string): boolean {
    const pattern = new RegExp(`^${prefix}-\\d{2,}$`);
    return pattern.test(id);
  }

  /**
   * Extract the numeric part from an ID
   * @param id The ID to parse
   * @param prefix The prefix to match against
   * @returns The numeric value, or null if the ID doesn't match the format
   */
  static extractNumber(id: string, prefix: string): number | null {
    const pattern = new RegExp(`^${prefix}-(\\d+)$`);
    const match = id.match(pattern);
    return match ? parseInt(match[1], 10) : null;
  }
}
