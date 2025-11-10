/**
 * Data model for Mermaid sequence diagrams
 * Based on specification in doc/sequence-spec.md
 */

// Arrow types for messages (10 types)
export type ArrowType =
  | '->'      // solid line, no arrowhead
  | '-->'     // dashed line, no arrowhead
  | '->>'     // solid line, arrowhead
  | '-->>'    // dashed line, arrowhead
  | '<<->>'   // solid line, both ends (v11.0.0+)
  | '<<-->>'  // dashed line, both ends (v11.0.0+)
  | '-x'      // solid line, × at end (deletion/error)
  | '--x'     // dashed line, × at end
  | '-)'      // solid line, open arrowhead (async)
  | '--))';   // dashed line, open arrowhead (async)

// Note position
export type NotePosition = 'left of' | 'right of' | 'over';

// Participant type (actor vs participant)
export type ParticipantType = 'participant' | 'actor';

// Participant/Actor definition
export interface Participant {
  id: string;
  type: ParticipantType;
  label?: string; // Display name (alias)
  links: Array<{ label: string; url: string }>;
  explicit: boolean; // true if explicitly defined
  order: number; // display order
}

// Message between participants
export interface Message {
  type: 'message';
  from: string;
  to: string;
  arrow: ArrowType;
  text?: string;
  activateTo?: boolean;   // shorthand: +
  deactivateFrom?: boolean; // shorthand: -
}

// Explicit activation/deactivation
export interface Activation {
  type: 'activation';
  actor: string;
  action: 'activate' | 'deactivate';
}

// Create participant (v10.3.0+)
export interface CreateParticipant {
  type: 'create';
  participantType: ParticipantType;
  id: string;
  label?: string;
}

// Destroy participant
export interface DestroyParticipant {
  type: 'destroy';
  id: string;
}

// Note
export interface Note {
  type: 'note';
  position: NotePosition;
  actors: string[]; // 1 actor for left/right, 2 for over
  text: string;
}

// Loop block
export interface Loop {
  type: 'loop';
  label: string;
  statements: DiagramElement[];
}

// Alt/Opt blocks
export interface Alt {
  type: 'alt';
  branches: Array<{ condition: string; statements: DiagramElement[] }>;
}

export interface Opt {
  type: 'opt';
  condition: string;
  statements: DiagramElement[];
}

// Parallel block
export interface Par {
  type: 'par';
  branches: Array<{ label: string; statements: DiagramElement[] }>;
}

// Critical region
export interface Critical {
  type: 'critical';
  action: string;
  options: Array<{ situation: string; statements: DiagramElement[] }>;
  statements: DiagramElement[]; // main statements
}

// Break block
export interface Break {
  type: 'break';
  description: string;
  statements: DiagramElement[];
}

// Background highlight
export interface Rect {
  type: 'rect';
  color: string; // rgb(r,g,b) or rgba(r,g,b,a)
  statements: DiagramElement[];
}

// Box (grouping)
export interface Box {
  type: 'box';
  color?: string;
  description?: string;
  participants: string[]; // participant IDs in this box
}

// Comment
export interface Comment {
  type: 'comment';
  text: string;
}

// All diagram elements
export type DiagramElement =
  | Message
  | Activation
  | CreateParticipant
  | DestroyParticipant
  | Note
  | Loop
  | Alt
  | Opt
  | Par
  | Critical
  | Break
  | Rect
  | Box
  | Comment;

// Configuration
export interface DiagramConfig {
  autonumber: boolean;
  mirrorActors: boolean;

  // Margins
  diagramMarginX: number;
  diagramMarginY: number;
  boxTextMargin: number;
  noteMargin: number;
  messageMargin: number;

  // Fonts
  actorFontSize: number;
  actorFontFamily: string;
  actorFontWeight: string;

  noteFontSize: number;
  noteFontFamily: string;
  noteFontWeight: string;

  messageFontSize: number;
  messageFontFamily: string;
  messageFontWeight: string;
}

// Default configuration
export const defaultConfig: DiagramConfig = {
  autonumber: false,
  mirrorActors: false,

  diagramMarginX: 50,
  diagramMarginY: 10,
  boxTextMargin: 5,
  noteMargin: 10,
  messageMargin: 35,

  actorFontSize: 14,
  actorFontFamily: 'Arial, sans-serif',
  actorFontWeight: 'normal',

  noteFontSize: 14,
  noteFontFamily: 'Arial, sans-serif',
  noteFontWeight: 'normal',

  messageFontSize: 12,
  messageFontFamily: 'Arial, sans-serif',
  messageFontWeight: 'normal',
};

// Complete sequence diagram
export interface SequenceDiagram {
  participants: Map<string, Participant>;
  elements: DiagramElement[];
  config: DiagramConfig;
}

// Create empty diagram
export function createEmptyDiagram(): SequenceDiagram {
  return {
    participants: new Map(),
    elements: [],
    config: { ...defaultConfig }
  };
}

// Helper: Add participant
export function addParticipant(
  diagram: SequenceDiagram,
  id: string,
  type: ParticipantType = 'participant',
  label?: string,
  explicit: boolean = true
): void {
  if (!diagram.participants.has(id)) {
    diagram.participants.set(id, {
      id,
      type,
      label,
      links: [],
      explicit,
      order: diagram.participants.size
    });
  }
}

// Helper: Get or create participant (for implicit definitions)
export function getOrCreateParticipant(
  diagram: SequenceDiagram,
  id: string
): Participant {
  if (!diagram.participants.has(id)) {
    addParticipant(diagram, id, 'participant', undefined, false);
  }
  return diagram.participants.get(id)!;
}
