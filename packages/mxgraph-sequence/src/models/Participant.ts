import { ActorType, Link } from '../utils/types'

export class Participant {
  id: string
  label: string
  type: ActorType
  isExplicit: boolean  // Explicitly defined or implicit from messages
  boxId?: string       // ID of the box this participant belongs to
  links: Link[]
  created: boolean     // For v10.3.0+ creation syntax
  destroyed: boolean   // For destruction syntax

  constructor(
    id: string,
    label?: string,
    type: ActorType = 'participant',
    isExplicit: boolean = false
  ) {
    this.id = id
    this.label = label || id
    this.type = type
    this.isExplicit = isExplicit
    this.links = []
    this.created = false
    this.destroyed = false
  }

  addLink(label: string, url: string): void {
    this.links.push({ label, url })
  }

  setBox(boxId: string): void {
    this.boxId = boxId
  }

  clone(): Participant {
    const cloned = new Participant(this.id, this.label, this.type, this.isExplicit)
    cloned.boxId = this.boxId
    cloned.links = [...this.links]
    cloned.created = this.created
    cloned.destroyed = this.destroyed
    return cloned
  }
}
