// 型定義

export type ParticipantType = 'participant' | 'actor';

export type ArrowType =
  | '->'      // solid line, no arrowhead
  | '-->'     // dashed line, no arrowhead
  | '->>'     // solid line, arrowhead
  | '-->>'    // dashed line, arrowhead
  | '<<-->>' // solid line, both ends
  | '<<-->>>' // dashed line, both ends
  | '-x'      // solid line, × at end
  | '--x'     // dashed line, × at end
  | '-)'      // solid line, open arrowhead
  | '--))';   // dashed line, open arrowhead

export type NotePosition = 'left of' | 'right of' | 'over';

export type BlockType = 'loop' | 'alt' | 'opt' | 'par' | 'critical' | 'break' | 'rect' | 'box';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface Link {
  label: string;
  url: string;
}

export interface SequenceConfig {
  diagramMarginX?: number;
  diagramMarginY?: number;
  boxTextMargin?: number;
  noteMargin?: number;
  messageMargin?: number;
  mirrorActors?: boolean;
  actorFontSize?: number;
  actorFontFamily?: string;
  actorFontWeight?: string;
  noteFontSize?: number;
  noteFontFamily?: string;
  noteFontWeight?: string;
  messageFontSize?: number;
  messageFontFamily?: string;
  messageFontWeight?: string;
}
