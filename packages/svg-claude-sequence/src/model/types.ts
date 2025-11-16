// Sequence Diagram Data Model

export type ParticipantType = 'participant' | 'actor';

export type ArrowType =
  | '->'      // solid line, no arrowhead
  | '-->'     // dashed line, no arrowhead
  | '->>'     // solid line, arrowhead
  | '-->>'    // dashed line, arrowhead
  | '<<->>'   // solid line, both ends
  | '<<-->>'  // dashed line, both ends
  | '-x'      // solid line, × at end
  | '--x'     // dashed line, × at end
  | '-)'      // solid line, open arrowhead (async)
  | '--))';   // dashed line, open arrowhead (async)

export type NotePosition = 'left' | 'right' | 'over';

export type ControlStructureType = 'loop' | 'alt' | 'opt' | 'par' | 'critical' | 'break' | 'rect';

export interface Participant {
  id: string;
  type: ParticipantType;
  label?: string;
  x: number;
  y: number;
  order: number;
  created?: boolean; // for create participant syntax
  destroyed?: boolean; // for destroy syntax
  links?: Array<{ label: string; url: string }>;
}

export interface Message {
  id: string;
  from: string; // participant id
  to: string; // participant id
  arrowType: ArrowType;
  text: string;
  y: number; // vertical position
  order: number; // sequence order
  activateFrom?: boolean; // +
  activateTo?: boolean; // +
  deactivateFrom?: boolean; // -
  deactivateTo?: boolean; // -
}

export interface Note {
  id: string;
  position: NotePosition;
  participants: string[]; // participant ids (1 or 2)
  text: string;
  y: number;
  order: number;
}

export interface Activation {
  id: string;
  participant: string;
  startOrder: number;
  endOrder: number;
  level: number; // nesting level
}

export interface ControlStructure {
  id: string;
  type: ControlStructureType;
  label: string;
  startOrder: number;
  endOrder: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string; // for rect
  branches?: Array<{ // for alt, par, critical
    type: 'else' | 'and' | 'option';
    label: string;
    startOrder: number;
  }>;
}

export interface Box {
  id: string;
  label?: string;
  color?: string;
  participants: string[]; // participant ids
}

export interface DiagramConfig {
  autonumber: boolean;
  mirrorActors: boolean;
  diagramMarginX: number;
  diagramMarginY: number;
  boxTextMargin: number;
  noteMargin: number;
  messageMargin: number;
  actorFontSize: number;
  noteFontSize: number;
  messageFontSize: number;
}

export interface SequenceDiagram {
  participants: Participant[];
  messages: Message[];
  notes: Note[];
  activations: Activation[];
  controlStructures: ControlStructure[];
  boxes: Box[];
  config: DiagramConfig;
}

export interface ToolbarItem {
  type: 'participant' | 'actor' | 'message' | 'note' | 'loop' | 'alt' | 'opt' | 'par' | 'critical' | 'break' | 'rect';
  icon: string;
  label: string;
}
