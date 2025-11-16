/**
 * Observer interface for diagram changes
 * Renderers implement this interface to be notified of model changes
 */
export interface DiagramObserver {
  /**
   * Called when the diagram model has changed
   * The observer should re-render or update its state accordingly
   */
  onDiagramChanged(): void;
}

/**
 * Types of changes that can occur in the diagram
 */
export const DiagramChangeType = {
  PARTICIPANT_ADDED: 'PARTICIPANT_ADDED',
  PARTICIPANT_UPDATED: 'PARTICIPANT_UPDATED',
  PARTICIPANT_REMOVED: 'PARTICIPANT_REMOVED',
  STATEMENT_ADDED: 'STATEMENT_ADDED',
  STATEMENT_UPDATED: 'STATEMENT_UPDATED',
  STATEMENT_REMOVED: 'STATEMENT_REMOVED',
  CONFIG_UPDATED: 'CONFIG_UPDATED',
} as const;

export type DiagramChangeType = typeof DiagramChangeType[keyof typeof DiagramChangeType];

/**
 * Detailed change event with metadata
 */
export interface DiagramChangeEvent {
  type: DiagramChangeType;
  data?: any;
}

/**
 * Extended observer interface that receives detailed change events
 */
export interface DetailedDiagramObserver extends DiagramObserver {
  /**
   * Called with detailed information about what changed
   * @param event The change event with type and optional data
   */
  onDiagramChangedDetailed(event: DiagramChangeEvent): void;
}
