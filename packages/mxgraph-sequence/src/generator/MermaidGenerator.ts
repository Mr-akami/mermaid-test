import { SequenceDiagram } from '../models/SequenceDiagram'
import { Participant } from '../models/Participant'
import { Message } from '../models/Message'
import { Note } from '../models/Note'
import { ControlStructure, ControlStructureChild } from '../models/ControlStructure'

export class MermaidGenerator {
  generate(diagram: SequenceDiagram): string {
    const lines: string[] = ['sequenceDiagram']

    // Add autonumber if enabled
    if (diagram.config.autonumber) {
      lines.push('  autonumber')
    }

    // Get ordered participants (explicit first, then implicit by first appearance)
    const orderedParticipants = this.getOrderedParticipants(diagram)

    // Group participants by box
    const boxedParticipants = new Map<string | undefined, Participant[]>()
    orderedParticipants.forEach(p => {
      const boxId = p.boxId
      if (!boxedParticipants.has(boxId)) {
        boxedParticipants.set(boxId, [])
      }
      boxedParticipants.get(boxId)!.push(p)
    })

    // Generate boxes and participants
    boxedParticipants.forEach((participants, boxId) => {
      if (boxId) {
        const box = diagram.boxes.get(boxId)
        if (box) {
          let boxLine = '  box'
          if (box.color) {
            boxLine += ` ${box.color}`
          }
          if (box.description) {
            boxLine += ` ${box.description}`
          }
          lines.push(boxLine)

          participants.forEach(p => {
            if (p.isExplicit) {
              lines.push('    ' + this.generateParticipant(p))
            }
          })

          lines.push('  end')
        }
      } else {
        // Participants not in a box
        participants.forEach(p => {
          if (p.isExplicit) {
            lines.push('  ' + this.generateParticipant(p))
          }
        })
      }
    })

    // Generate messages, notes, and structures
    this.generateContent(diagram.messages, diagram.notes, diagram.structures, lines, '  ')

    // Generate links
    orderedParticipants.forEach(p => {
      if (p.links.length > 0) {
        p.links.forEach(link => {
          lines.push(`  link ${p.id}: ${link.label} @ ${link.url}`)
        })
      }
    })

    return lines.join('\n')
  }

  private getOrderedParticipants(diagram: SequenceDiagram): Participant[] {
    const explicit: Participant[] = []
    const implicit: Participant[] = []

    diagram.participants.forEach(p => {
      if (p.isExplicit) {
        explicit.push(p)
      } else {
        implicit.push(p)
      }
    })

    // Sort implicit by first appearance in messages
    const firstAppearance = new Map<string, number>()
    diagram.messages.forEach((msg, index) => {
      if (!firstAppearance.has(msg.from)) {
        firstAppearance.set(msg.from, index)
      }
      if (!firstAppearance.has(msg.to)) {
        firstAppearance.set(msg.to, index)
      }
    })

    implicit.sort((a, b) => {
      const aIndex = firstAppearance.get(a.id) ?? Infinity
      const bIndex = firstAppearance.get(b.id) ?? Infinity
      return aIndex - bIndex
    })

    return [...explicit, ...implicit]
  }

  private generateParticipant(p: Participant): string {
    const prefix = p.created ? 'create ' : ''
    const type = p.type
    const label = p.label !== p.id ? ` as ${p.label}` : ''
    return `${prefix}${type} ${p.id}${label}`
  }

  private generateContent(
    messages: Message[],
    notes: Note[],
    structures: ControlStructure[],
    lines: string[],
    indent: string
  ): void {
    // Interleave messages, notes, and structures in their original order
    // For simplicity, we'll process them in order: messages, then notes, then structures
    // A more sophisticated implementation would maintain the exact order

    messages.forEach(msg => {
      lines.push(indent + this.generateMessage(msg))

      // Check for activation/deactivation
      if (msg.activateTo) {
        // Activation is already part of the message syntax
      }
      if (msg.deactivateTo) {
        // Deactivation is already part of the message syntax
      }
    })

    notes.forEach(note => {
      lines.push(indent + this.generateNote(note))
    })

    structures.forEach(structure => {
      this.generateStructure(structure, lines, indent)
    })
  }

  private generateMessage(msg: Message): string {
    let from = msg.from
    let to = msg.to

    // Add activation modifiers
    if (msg.activateFrom) {
      from += '+'
    } else if (msg.deactivateFrom) {
      from += '-'
    }

    if (msg.activateTo) {
      to = '+' + to
    } else if (msg.deactivateTo) {
      to = '-' + to
    }

    const text = msg.text ? `: ${msg.text}` : ''
    return `${from}${msg.arrowType}${to}${text}`
  }

  private generateNote(note: Note): string {
    if (note.position === 'over') {
      const actors = note.actors.join(',')
      return `Note over ${actors}: ${note.text}`
    } else {
      return `Note ${note.position} of ${note.actors[0]}: ${note.text}`
    }
  }

  private generateStructure(structure: ControlStructure, lines: string[], indent: string): void {
    // Opening line
    let openLine = `${indent}${structure.type}`
    if (structure.label) {
      openLine += ` ${structure.label}`
    } else if (structure.color) {
      openLine += ` ${structure.color}`
    }
    lines.push(openLine)

    // Children
    structure.children.forEach((child, index) => {
      // Add separator for subsequent children
      if (index > 0) {
        if (structure.type === 'alt') {
          lines.push(`${indent}else ${child.label || ''}`)
        } else if (structure.type === 'par') {
          lines.push(`${indent}and ${child.label || ''}`)
        } else if (structure.type === 'critical') {
          lines.push(`${indent}option ${child.label || ''}`)
        }
      }

      // Content
      this.generateContent(
        child.messages,
        child.notes,
        child.structures,
        lines,
        indent + '  '
      )
    })

    // Closing line
    lines.push(`${indent}end`)
  }
}
