import type { Point, Bounds } from '../model/types';
import { GeometryUtils } from './GeometryUtils';

export interface DraggableElement {
  type: 'participant' | 'message' | 'note' | 'controlStructure';
  id: string;
  bounds: Bounds;
  data?: any;
}

/**
 * HitTestUtils provides pure functions for hit testing
 */
export class HitTestUtils {
  /**
   * Find the topmost element at a given point
   * Elements are checked in reverse order (last drawn = topmost)
   */
  static findElementAt(
    point: Point,
    elements: DraggableElement[]
  ): DraggableElement | null {
    // Check in reverse order (top elements first)
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      if (GeometryUtils.isPointInBounds(point, element.bounds)) {
        return element;
      }
    }
    return null;
  }

  /**
   * Find all elements that overlap with a rectangle
   */
  static findElementsInRect(
    rect: Bounds,
    elements: DraggableElement[]
  ): DraggableElement[] {
    return elements.filter(element =>
      GeometryUtils.boundsOverlap(element.bounds, rect)
    );
  }

  /**
   * Find all elements fully contained within a rectangle
   */
  static findElementsFullyInRect(
    rect: Bounds,
    elements: DraggableElement[]
  ): DraggableElement[] {
    return elements.filter(element =>
      GeometryUtils.isBoundsContained(element.bounds, rect)
    );
  }

  /**
   * Find which resize handle (if any) is at the given point
   * Returns handle position: 'tl' (top-left), 'tr', 'bl', 'br', or null
   */
  static findResizeHandle(
    point: Point,
    bounds: Bounds,
    handleSize: number
  ): 'tl' | 'tr' | 'bl' | 'br' | null {
    const { x, y, width, height } = bounds;

    // Top-left
    if (
      point.x >= x &&
      point.x <= x + handleSize &&
      point.y >= y &&
      point.y <= y + handleSize
    ) {
      return 'tl';
    }

    // Top-right
    if (
      point.x >= x + width - handleSize &&
      point.x <= x + width &&
      point.y >= y &&
      point.y <= y + handleSize
    ) {
      return 'tr';
    }

    // Bottom-left
    if (
      point.x >= x &&
      point.x <= x + handleSize &&
      point.y >= y + height - handleSize &&
      point.y <= y + height
    ) {
      return 'bl';
    }

    // Bottom-right
    if (
      point.x >= x + width - handleSize &&
      point.x <= x + width &&
      point.y >= y + height - handleSize &&
      point.y <= y + height
    ) {
      return 'br';
    }

    return null;
  }

  /**
   * Find which edge handle (start or end) is at the given point
   * for a horizontal line (message edge)
   */
  static findEdgeHandle(
    point: Point,
    line: { fromX: number; toX: number; y: number },
    handleRadius: number
  ): 'start' | 'end' | null {
    // Check start handle
    if (GeometryUtils.isPointInCircle(
      point,
      { x: line.fromX, y: line.y },
      handleRadius
    )) {
      return 'start';
    }

    // Check end handle
    if (GeometryUtils.isPointInCircle(
      point,
      { x: line.toX, y: line.y },
      handleRadius
    )) {
      return 'end';
    }

    return null;
  }

  /**
   * Find lifeline at a given point
   * Returns participant ID if found, null otherwise
   */
  static findLifelineAt(
    point: Point,
    participants: Array<{
      id: string;
      pos: Point;
    }>,
    participantWidth: number,
    participantHeight: number,
    threshold: number
  ): string | null {
    for (const participant of participants) {
      const lifelineX = participant.pos.x + participantWidth / 2;
      const lifelineStartY = participant.pos.y + participantHeight;

      // Check if point is near the lifeline (within threshold)
      if (
        Math.abs(point.x - lifelineX) < threshold &&
        point.y >= lifelineStartY
      ) {
        return participant.id;
      }
    }

    return null;
  }

  /**
   * Check if a point is on or near a horizontal line segment
   */
  static isPointOnLine(
    point: Point,
    line: { fromX: number; toX: number; y: number },
    threshold: number
  ): boolean {
    return GeometryUtils.isPointNearLine(point, line, threshold);
  }

  /**
   * Find the closest element to a point among given elements
   */
  static findClosestElement(
    point: Point,
    elements: DraggableElement[]
  ): DraggableElement | null {
    if (elements.length === 0) return null;

    let closest = elements[0];
    let minDistance = this.distanceToElement(point, closest);

    for (let i = 1; i < elements.length; i++) {
      const distance = this.distanceToElement(point, elements[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closest = elements[i];
      }
    }

    return closest;
  }

  /**
   * Calculate distance from a point to an element (bounds)
   * Returns 0 if point is inside bounds
   */
  private static distanceToElement(point: Point, element: DraggableElement): number {
    const { bounds } = element;

    // If point is inside, distance is 0
    if (GeometryUtils.isPointInBounds(point, bounds)) {
      return 0;
    }

    // Calculate distance to closest edge
    const closestX = GeometryUtils.clamp(point.x, bounds.x, bounds.x + bounds.width);
    const closestY = GeometryUtils.clamp(point.y, bounds.y, bounds.y + bounds.height);

    const dx = point.x - closestX;
    const dy = point.y - closestY;

    return Math.sqrt(dx * dx + dy * dy);
  }
}
