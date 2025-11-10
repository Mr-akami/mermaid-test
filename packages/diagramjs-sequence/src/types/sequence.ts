/**
 * Sequence Diagram Type Definitions
 */

export type ElementType =
  | 'participant'
  | 'actor'
  | 'message'
  | 'note'
  | 'activation'
  | 'loop'
  | 'alt'
  | 'opt'
  | 'par'
  | 'critical'
  | 'break'
  | 'rect'
  | 'box'
  | 'lifeline';

export type ArrowType =
  | '->'     // solid line, no arrowhead
  | '-->'    // dashed line, no arrowhead
  | '->>'    // solid line, arrowhead
  | '-->>'   // dashed line, arrowhead
  | '<<->>'  // solid line, both ends
  | '<<-->>' // dashed line, both ends
  | '-x'     // solid line, × at end
  | '--x'    // dashed line, × at end
  | '-)'     // solid line, open arrowhead
  | '--)'    // dashed line, open arrowhead

export type NotePosition = 'left' | 'right' | 'over';

export interface ParticipantData {
  id: string;
  label?: string;
  isActor: boolean;
  order: number;
  multiline?: boolean;
}

export interface MessageData {
  id: string;
  sourceId: string;
  targetId: string;
  arrowType: ArrowType;
  text?: string;
  order: number;
  activationStart?: boolean;
  activationEnd?: boolean;
}

export interface NoteData {
  id: string;
  position: NotePosition;
  participants: string[]; // participant IDs
  text: string;
  order: number;
}

export interface ActivationData {
  id: string;
  participantId: string;
  startOrder: number;
  endOrder: number;
  level: number; // for nested activations
}

export interface BlockData {
  id: string;
  type: 'loop' | 'alt' | 'opt' | 'par' | 'critical' | 'break' | 'rect' | 'box';
  label?: string;
  color?: string;
  startOrder: number;
  endOrder: number;
  children?: BlockData[];
  branches?: BranchData[]; // for alt, par, critical
}

export interface BranchData {
  type: 'else' | 'and' | 'option';
  label?: string;
  order: number;
}

export interface BoxData {
  id: string;
  label?: string;
  color?: string;
  participants: string[];
}

export interface SequenceDiagramConfig {
  autonumber?: boolean;
  mirrorActors?: boolean;
  diagramMarginX?: number;
  diagramMarginY?: number;
  actorMargin?: number;
  noteMargin?: number;
  messageMargin?: number;
}

// Base interface for diagram-js elements
export interface BaseElement {
  id: string;
  type: ElementType;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  parent?: BaseElement;
  children?: BaseElement[];
}

export interface ParticipantElement extends BaseElement {
  type: 'participant' | 'actor';
  businessObject: ParticipantData;
}

export interface MessageElement extends BaseElement {
  type: 'message';
  businessObject: MessageData;
  source: ParticipantElement;
  target: ParticipantElement;
  waypoints?: Array<{x: number, y: number}>;
}

export interface NoteElement extends BaseElement {
  type: 'note';
  businessObject: NoteData;
}

export interface BlockElement extends BaseElement {
  type: 'loop' | 'alt' | 'opt' | 'par' | 'critical' | 'break' | 'rect' | 'box';
  businessObject: BlockData;
}

export interface LifelineElement extends BaseElement {
  type: 'lifeline';
  participant: ParticipantElement;
}

export type SequenceElement =
  | ParticipantElement
  | MessageElement
  | NoteElement
  | BlockElement
  | LifelineElement;
