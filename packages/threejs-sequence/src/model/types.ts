/**
 * Core data model types for Mermaid Sequence Diagram
 */

export type ParticipantType = 'participant' | 'actor';

export interface Participant {
  id: string;
  type: ParticipantType;
  label?: string; // Display label (alias)
  createdAt?: number; // Message index where created (v10.3.0+)
  destroyedAt?: number; // Message index where destroyed
  links: ActorLink[];
  boxId?: string; // Reference to containing box
}

export interface ActorLink {
  label: string;
  url: string;
}

export type ArrowType =
  | '->'   // solid line, no arrowhead
  | '-->'  // dashed line, no arrowhead
  | '->>' // solid line, arrowhead
  | '-->>' // dashed line, arrowhead
  | '<<->>' // solid line, both ends (v11.0.0+)
  | '<<-->>' // dashed line, both ends (v11.0.0+)
  | '-x'   // solid line, × at end (deletion/error)
  | '--x'  // dashed line, × at end
  | '-)'   // solid line, open arrowhead (async)
  | '--))'; // dashed line, open arrowhead (async)

export interface Message {
  sender: string; // participant id
  receiver: string; // participant id
  arrow: ArrowType;
  text?: string;
  activateSender?: boolean; // + suffix
  deactivateSender?: boolean; // - suffix
  activateReceiver?: boolean;
  deactivateReceiver?: boolean;
}

export interface Activation {
  participantId: string;
  startIndex: number; // Message index
  endIndex: number; // Message index
  level: number; // Nesting level (for stacking)
}

export type NotePosition = 'left' | 'right' | 'over';

export interface Note {
  position: NotePosition;
  participants: string[]; // 1 or 2 participant ids
  text: string;
}

export interface Loop {
  type: 'loop';
  label: string;
  statements: Statement[];
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Alt {
  type: 'alt';
  branches: Array<{
    condition: string;
    statements: Statement[];
  }>;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Opt {
  type: 'opt';
  condition: string;
  statements: Statement[];
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Par {
  type: 'par';
  branches: Array<{
    label: string;
    statements: Statement[];
  }>;
}

export interface Critical {
  type: 'critical';
  action: string;
  statements: Statement[];
  options: Array<{
    situation: string;
    statements: Statement[];
  }>;
}

export interface Break {
  type: 'break';
  description: string;
  statements: Statement[];
}

export interface Rect {
  type: 'rect';
  color: string; // rgb() or rgba()
  statements: Statement[];
}

export type ControlStructure = Loop | Alt | Opt | Par | Critical | Break | Rect;

export interface Box {
  id: string;
  label?: string;
  color?: string; // Color name, rgb(), rgba(), or 'transparent'
  participants: string[]; // participant ids
}

export type Statement = Message | Note | Activation | ControlStructure;

export interface SequenceDiagram {
  participants: Participant[];
  boxes: Box[];
  statements: Statement[];
  autoNumber: boolean;
  config?: SequenceConfig;
}

export interface SequenceConfig {
  // Margins
  diagramMarginX?: number;
  diagramMarginY?: number;
  boxTextMargin?: number;
  noteMargin?: number;
  messageMargin?: number;

  // Display
  mirrorActors?: boolean;

  // Fonts
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
