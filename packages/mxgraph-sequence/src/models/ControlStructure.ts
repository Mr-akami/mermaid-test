import { ControlStructureType } from '../utils/types'
import { Message } from './Message'
import { Note } from './Note'

export interface ControlStructureChild {
  label?: string  // For alt/else, par/and, critical/option
  messages: Message[]
  notes: Note[]
  structures: ControlStructure[]
}

export class ControlStructure {
  id: string
  type: ControlStructureType
  label?: string  // For loop, break, rect
  color?: string  // For rect
  children: ControlStructureChild[]

  constructor(
    id: string,
    type: ControlStructureType,
    label?: string,
    color?: string
  ) {
    this.id = id
    this.type = type
    this.label = label
    this.color = color
    this.children = []
  }

  addChild(label?: string): ControlStructureChild {
    const child: ControlStructureChild = {
      label,
      messages: [],
      notes: [],
      structures: []
    }
    this.children.push(child)
    return child
  }

  clone(): ControlStructure {
    const cloned = new ControlStructure(this.id, this.type, this.label, this.color)
    cloned.children = this.children.map(child => ({
      label: child.label,
      messages: child.messages.map(m => m.clone()),
      notes: child.notes.map(n => n.clone()),
      structures: child.structures.map(s => s.clone())
    }))
    return cloned
  }
}
