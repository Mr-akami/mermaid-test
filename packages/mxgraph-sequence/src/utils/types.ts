// Type definitions for Mermaid Sequence Diagram

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
  | '--)'     // dashed line, open arrowhead (async)

export type NotePosition = 'left' | 'right' | 'over'

export type ActorType = 'participant' | 'actor'

export type ControlStructureType =
  | 'loop'
  | 'alt'
  | 'opt'
  | 'par'
  | 'critical'
  | 'break'
  | 'rect'

export interface Link {
  label: string
  url: string
}

export interface ActivationRange {
  messageIndex: number  // Index in the messages array
  isStart: boolean      // true for activate, false for deactivate
}
