import type { Point, Bounds } from '../model/types';

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * GeometryUtils provides pure functions for geometric calculations
 */
export class GeometryUtils {
  /**
   * Check if a point is inside bounds
   */
  static isPointInBounds(point: Point, bounds: Bounds): boolean {
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  /**
   * Check if a horizontal line segment is fully contained within bounds
   * with optional padding
   */
  static isLineInBounds(
    line: { fromX: number; toX: number; y: number },
    bounds: Bounds,
    padding?: Partial<Padding>
  ): boolean {
    const p = padding || {};
    const top = p.top || 0;
    const bottom = p.bottom || 0;
    const left = p.left || 0;
    const right = p.right || 0;

    const minX = Math.min(line.fromX, line.toX);
    const maxX = Math.max(line.fromX, line.toX);

    return (
      line.y >= bounds.y + top &&
      line.y <= bounds.y + bounds.height - bottom &&
      minX >= bounds.x + left &&
      maxX <= bounds.x + bounds.width - right
    );
  }

  /**
   * Check if inner bounds is fully contained within outer bounds
   */
  static isBoundsContained(inner: Bounds, outer: Bounds): boolean {
    return (
      inner.x >= outer.x &&
      inner.y >= outer.y &&
      inner.x + inner.width <= outer.x + outer.width &&
      inner.y + inner.height <= outer.y + outer.height
    );
  }

  /**
   * Check if two bounds overlap
   */
  static boundsOverlap(bounds1: Bounds, bounds2: Bounds): boolean {
    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds2.x + bounds2.width < bounds1.x ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds2.y + bounds2.height < bounds1.y
    );
  }

  /**
   * Check if a point is near a horizontal line segment
   */
  static isPointNearLine(
    point: Point,
    line: { fromX: number; toX: number; y: number },
    threshold: number
  ): boolean {
    const minX = Math.min(line.fromX, line.toX);
    const maxX = Math.max(line.fromX, line.toX);

    // Check if point is within X range
    if (point.x < minX - threshold || point.x > maxX + threshold) {
      return false;
    }

    // Check Y distance
    return Math.abs(point.y - line.y) <= threshold;
  }

  /**
   * Expand bounds by padding
   */
  static expandBounds(bounds: Bounds, padding: number | Partial<Padding>): Bounds {
    let p: Padding;

    if (typeof padding === 'number') {
      p = { top: padding, right: padding, bottom: padding, left: padding };
    } else {
      p = {
        top: padding.top || 0,
        right: padding.right || 0,
        bottom: padding.bottom || 0,
        left: padding.left || 0
      };
    }

    return {
      x: bounds.x - p.left,
      y: bounds.y - p.top,
      width: bounds.width + p.left + p.right,
      height: bounds.height + p.top + p.bottom
    };
  }

  /**
   * Calculate bounding box that contains all given points and bounds
   */
  static calculateBoundingBox(items: Array<Point | Bounds>): Bounds | null {
    if (items.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const item of items) {
      if ('width' in item && 'height' in item) {
        // It's a Bounds
        minX = Math.min(minX, item.x);
        minY = Math.min(minY, item.y);
        maxX = Math.max(maxX, item.x + item.width);
        maxY = Math.max(maxY, item.y + item.height);
      } else {
        // It's a Point
        minX = Math.min(minX, item.x);
        minY = Math.min(minY, item.y);
        maxX = Math.max(maxX, item.x);
        maxY = Math.max(maxY, item.y);
      }
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Check if a point is within a circular area
   */
  static isPointInCircle(point: Point, center: Point, radius: number): boolean {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  /**
   * Constrain a value between min and max
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Constrain a point within bounds
   */
  static clampPoint(point: Point, bounds: Bounds): Point {
    return {
      x: this.clamp(point.x, bounds.x, bounds.x + bounds.width),
      y: this.clamp(point.y, bounds.y, bounds.y + bounds.height)
    };
  }
}
