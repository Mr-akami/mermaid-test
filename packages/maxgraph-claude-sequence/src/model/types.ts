// Sequence Diagram Model Types

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
  | '-)'      // solid line, open arrowhead
  | '--))';   // dashed line, open arrowhead

export type NotePosition = 'left' | 'right' | 'over';

export interface Participant {
  id: string;
  type: ParticipantType;
  label: string;
  x: number;
  y: number;
  created?: boolean;
  createdAt?: number; // message index
  destroyed?: boolean;
  destroyedAt?: number; // message index
  links?: Array<{ label: string; url: string }>;
  boxId?: string; // group box ID
}

export interface Message {
  id: string;
  fromId: string;
  toId: string;
  arrowType: ArrowType;
  text: string;
  order: number;
  y: number;
  activateStart?: boolean;
  activateEnd?: boolean;
}

export interface Note {
  id: string;
  position: NotePosition;
  participantIds: string[];
  text: string;
  order: number;
  y: number;
}

export interface Box {
  id: string;
  color: string;
  description: string;
  participantIds: string[];
}

export type ControlStructureType = 'loop' | 'alt' | 'opt' | 'par' | 'critical' | 'break' | 'rect';

export interface ControlStructure {
  id: string;
  type: ControlStructureType;
  label: string;
  startOrder: number;
  endOrder: number;
  y: number;
  height: number;
  branches?: Array<{
    label: string;
    startOrder: number;
    endOrder: number;
  }>;
  color?: string; // for rect type
}

export interface DiagramModel {
  participants: Map<string, Participant>;
  messages: Message[];
  notes: Note[];
  boxes: Map<string, Box>;
  controlStructures: ControlStructure[];
  autoNumber: boolean;
  config?: {
    mirrorActors?: boolean;
    diagramMarginX?: number;
    diagramMarginY?: number;
  };
}

export interface SelectionState {
  selectedId: string | null;
  selectedType: 'participant' | 'message' | 'note' | 'box' | 'control' | null;
}
