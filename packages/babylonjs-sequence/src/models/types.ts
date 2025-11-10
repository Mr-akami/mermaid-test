// Arrow types for messages
export const ArrowType = {
  SOLID: '->',
  DASHED: '-->',
  SOLID_ARROW: '->>',
  DASHED_ARROW: '-->>',
  SOLID_BOTH: '<<->>',
  DASHED_BOTH: '<<-->>',
  SOLID_X: '-x',
  DASHED_X: '--x',
  SOLID_ASYNC: '-)',
  DASHED_ASYNC: '--)',
} as const;

export type ArrowType = typeof ArrowType[keyof typeof ArrowType];

// Participant type
export const ParticipantType = {
  PARTICIPANT: 'participant',
  ACTOR: 'actor',
} as const;

export type ParticipantType = typeof ParticipantType[keyof typeof ParticipantType];

// Note position
export const NotePosition = {
  LEFT: 'left',
  RIGHT: 'right',
  OVER: 'over',
} as const;

export type NotePosition = typeof NotePosition[keyof typeof NotePosition];

// Control structure types
export const ControlType = {
  LOOP: 'loop',
  ALT: 'alt',
  OPT: 'opt',
  PAR: 'par',
  CRITICAL: 'critical',
  BREAK: 'break',
  RECT: 'rect',
  BOX: 'box',
} as const;

export type ControlType = typeof ControlType[keyof typeof ControlType];

// Participant definition
export interface Participant {
  id: string;
  type: ParticipantType;
  label?: string;
  createdAt?: number; // For creation messages
  destroyedAt?: number; // For destruction
  links?: Array<{ label: string; url: string }>;
}

// Message definition
export interface Message {
  id: string;
  sender: string;
  receiver: string;
  arrowType: ArrowType;
  text?: string;
  activate?: boolean; // +
  deactivate?: boolean; // -
}

// Activation
export interface Activation {
  id: string;
  participantId: string;
  startIndex: number;
  endIndex: number;
}

// Note definition
export interface Note {
  id: string;
  position: NotePosition;
  participants: string[]; // 1 for left/right, 2 for over
  text: string;
}

// Control structure branch
export interface ControlBranch {
  label?: string;
  statements: DiagramElement[];
}

// Control structure definition
export interface ControlStructure {
  id: string;
  type: ControlType;
  label?: string;
  branches: ControlBranch[];
  color?: string; // For rect and box
}

// Box grouping
export interface Box {
  id: string;
  color?: string;
  description?: string;
  participants: string[];
}

// Diagram element (union type)
export type DiagramElement =
  | { type: 'message'; data: Message }
  | { type: 'note'; data: Note }
  | { type: 'activation'; data: Activation }
  | { type: 'control'; data: ControlStructure }
  | { type: 'create'; participantId: string }
  | { type: 'destroy'; participantId: string };

// Diagram model
export interface SequenceDiagram {
  participants: Participant[];
  boxes: Box[];
  elements: DiagramElement[];
  autoNumber: boolean;
  config?: {
    diagramMarginX?: number;
    diagramMarginY?: number;
    boxTextMargin?: number;
    noteMargin?: number;
    messageMargin?: number;
    mirrorActors?: boolean;
  };
}
