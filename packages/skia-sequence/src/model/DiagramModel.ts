const randomChunk = () => Math.random().toString(36).slice(2, 10)

export const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}-${randomChunk()}`
}

export type ToolMode = 'select' | 'participant' | 'actor' | 'message' | 'note' | 'block'

export type ArrowType =
  | '->'
  | '-->'
  | '->>'
  | '-->>'
  | '<<->>'
  | '<<-->>'
  | '-x'
  | '--x'
  | '-)'
  | '--))'

export type BlockKind = 'loop' | 'alt' | 'opt' | 'par' | 'critical' | 'break' | 'rect'
export type NotePlacement = 'left' | 'right' | 'over'

export interface DiagramSettings {
  width: number
  height: number
  autonumber: boolean
  mirrorActors: boolean
}

export interface ParticipantLink {
  id: string
  label: string
  url: string
}

export interface Participant {
  id: string
  name: string
  label: string
  kind: 'participant' | 'actor'
  x: number
  created: boolean
  destroyed: boolean
  color: string
  links: ParticipantLink[]
}

export interface Message {
  id: string
  fromId: string
  toId: string
  y: number
  text: string
  arrow: ArrowType
  activateTarget: boolean
  deactivateTarget: boolean
  activateSource: boolean
  deactivateSource: boolean
}

export interface Note {
  id: string
  targetIds: string[]
  placement: NotePlacement
  text: string
  y: number
  height: number
}

export interface Block {
  id: string
  kind: BlockKind
  label: string
  color: string
  x: number
  y: number
  width: number
  height: number
}

export interface Selection {
  type: 'participant' | 'message' | 'note' | 'block'
  id: string
}

export interface AppState {
  tool: ToolMode
  settings: DiagramSettings
  participants: Participant[]
  messages: Message[]
  notes: Note[]
  blocks: Block[]
  selection: Selection | null
}

export class DiagramModel {
  private state: AppState
  private listeners: Set<() => void> = new Set()

  constructor(initialState: AppState) {
    this.state = initialState
  }

  getState(): AppState {
    return this.state
  }

  update(mutator: (state: AppState) => void) {
    mutator(this.state)
    this.notify()
  }

  addListener(listener: () => void) {
    this.listeners.add(listener)
  }

  removeListener(listener: () => void) {
    this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((listener) => listener())
  }
}
