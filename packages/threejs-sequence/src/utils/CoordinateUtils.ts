import type { Point, Bounds } from '../model/types';

/**
 * CoordinateUtils provides pure functions for coordinate calculations
 */
export class CoordinateUtils {
  /**
   * Calculate the X coordinate of a participant's lifeline center
   */
  static getLifelineX(participantPos: Point, participantWidth: number): number {
    return participantPos.x + participantWidth / 2;
  }

  /**
   * Calculate message endpoint coordinates
   * Returns both from/to X coordinates and min/max for bounds calculation
   */
  static getMessageEndpoints(
    senderPos: Point,
    receiverPos: Point,
    participantWidth: number
  ): { fromX: number; toX: number; minX: number; maxX: number } {
    const fromX = senderPos.x + participantWidth / 2;
    const toX = receiverPos.x + participantWidth / 2;
    const minX = Math.min(fromX, toX);
    const maxX = Math.max(fromX, toX);

    return { fromX, toX, minX, maxX };
  }

  /**
   * Convert canvas coordinates to logical coordinates (accounting for device pixel ratio)
   */
  static canvasToLogical(canvasPoint: Point, dpr: number): Point {
    return {
      x: canvasPoint.x / dpr,
      y: canvasPoint.y / dpr
    };
  }

  /**
   * Convert logical coordinates to canvas coordinates (accounting for device pixel ratio)
   */
  static logicalToCanvas(logicalPoint: Point, dpr: number): Point {
    return {
      x: logicalPoint.x * dpr,
      y: logicalPoint.y * dpr
    };
  }

  /**
   * Calculate the center point of bounds
   */
  static getBoundsCenter(bounds: Bounds): Point {
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };
  }

  /**
   * Calculate default participant position based on index
   */
  static calculateDefaultParticipantPosition(
    index: number,
    margin: Point,
    participantWidth: number,
    spacing: number
  ): Point {
    return {
      x: margin.x + index * (participantWidth + spacing),
      y: margin.y
    };
  }

  /**
   * Calculate default message Y position
   */
  static calculateDefaultMessageY(
    messageIndex: number,
    baseY: number,
    spacing: number
  ): number {
    return baseY + messageIndex * spacing;
  }

  /**
   * Convert absolute Y coordinate to relative offset within structure
   */
  static toRelativeOffset(absoluteY: number, structureBounds: Bounds): number {
    return absoluteY - structureBounds.y;
  }

  /**
   * Convert relative offset to absolute Y coordinate
   */
  static toAbsoluteY(relativeOffset: number, structureBounds: Bounds): number {
    return structureBounds.y + relativeOffset;
  }

  /**
   * Calculate distance between two points
   */
  static distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
