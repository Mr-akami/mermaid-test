export class Box {
  id: string
  color?: string
  description?: string
  participantIds: string[]

  constructor(id: string, color?: string, description?: string) {
    this.id = id
    this.color = color
    this.description = description
    this.participantIds = []
  }

  addParticipant(participantId: string): void {
    if (!this.participantIds.includes(participantId)) {
      this.participantIds.push(participantId)
    }
  }

  removeParticipant(participantId: string): void {
    this.participantIds = this.participantIds.filter(id => id !== participantId)
  }

  clone(): Box {
    const cloned = new Box(this.id, this.color, this.description)
    cloned.participantIds = [...this.participantIds]
    return cloned
  }
}
