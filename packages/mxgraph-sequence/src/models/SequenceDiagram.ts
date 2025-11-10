import { Participant } from './Participant'
import { Box } from './Box'
import { Message } from './Message'
import { Note } from './Note'
import { ControlStructure } from './ControlStructure'

export interface SequenceConfig {
  autonumber: boolean
  mirrorActors: boolean
  diagramMarginX?: number
  diagramMarginY?: number
  actorFontSize?: number
  noteFontSize?: number
  messageFontSize?: number
}

export class SequenceDiagram {
  participants: Map<string, Participant>
  boxes: Map<string, Box>
  messages: Message[]
  notes: Note[]
  structures: ControlStructure[]
  activations: Map<string, number>  // participantId -> activation count
  config: SequenceConfig
  comments: string[]  // Preserve comments

  constructor() {
    this.participants = new Map()
    this.boxes = new Map()
    this.messages = []
    this.notes = []
    this.structures = []
    this.activations = new Map()
    this.config = {
      autonumber: false,
      mirrorActors: false
    }
    this.comments = []
  }

  addParticipant(participant: Participant): void {
    this.participants.set(participant.id, participant)
  }

  getParticipant(id: string): Participant | undefined {
    return this.participants.get(id)
  }

  addBox(box: Box): void {
    this.boxes.set(box.id, box)
  }

  addMessage(message: Message): void {
    this.messages.push(message)

    // Ensure participants exist
    if (!this.participants.has(message.from)) {
      this.addParticipant(new Participant(message.from, message.from, 'participant', false))
    }
    if (!this.participants.has(message.to)) {
      this.addParticipant(new Participant(message.to, message.to, 'participant', false))
    }
  }

  addNote(note: Note): void {
    this.notes.push(note)
  }

  addStructure(structure: ControlStructure): void {
    this.structures.push(structure)
  }

  activate(participantId: string): void {
    const count = this.activations.get(participantId) || 0
    this.activations.set(participantId, count + 1)
  }

  deactivate(participantId: string): void {
    const count = this.activations.get(participantId) || 0
    if (count > 0) {
      this.activations.set(participantId, count - 1)
    }
  }

  getActivationCount(participantId: string): number {
    return this.activations.get(participantId) || 0
  }

  clear(): void {
    this.participants.clear()
    this.boxes.clear()
    this.messages = []
    this.notes = []
    this.structures = []
    this.activations.clear()
    this.comments = []
  }

  clone(): SequenceDiagram {
    const cloned = new SequenceDiagram()

    // Clone participants
    this.participants.forEach(p => cloned.addParticipant(p.clone()))

    // Clone boxes
    this.boxes.forEach(b => cloned.addBox(b.clone()))

    // Clone messages
    this.messages.forEach(m => cloned.messages.push(m.clone()))

    // Clone notes
    this.notes.forEach(n => cloned.notes.push(n.clone()))

    // Clone structures
    this.structures.forEach(s => cloned.structures.push(s.clone()))

    // Clone activations
    this.activations.forEach((count, id) => cloned.activations.set(id, count))

    // Clone config
    cloned.config = { ...this.config }

    // Clone comments
    cloned.comments = [...this.comments]

    return cloned
  }
}
