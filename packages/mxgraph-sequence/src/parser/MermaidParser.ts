import { SequenceDiagram } from '../models/SequenceDiagram'
import { Participant } from '../models/Participant'
import { Box } from '../models/Box'
import { Message } from '../models/Message'
import { Note } from '../models/Note'
import { ControlStructure, ControlStructureChild } from '../models/ControlStructure'
import { ArrowType, NotePosition, ActorType, ControlStructureType } from '../utils/types'

export class MermaidParser {
  private diagram: SequenceDiagram
  private currentBox: Box | null = null
  private nextId = 0

  constructor() {
    this.diagram = new SequenceDiagram()
  }

  parse(text: string): SequenceDiagram {
    this.diagram = new SequenceDiagram()
    this.currentBox = null
    this.nextId = 0

    const lines = text.split('\n').map(line => line.trim())

    // First line should be sequenceDiagram
    if (lines.length === 0 || !lines[0].startsWith('sequenceDiagram')) {
      throw new Error('Invalid sequence diagram: must start with "sequenceDiagram"')
    }

    // Parse the rest of the lines
    this.parseLines(lines.slice(1))

    return this.diagram
  }

  private parseLines(lines: string[], context?: ControlStructureChild): void {
    let i = 0

    while (i < lines.length) {
      const line = lines[i]

      // Skip empty lines
      if (!line) {
        i++
        continue
      }

      // Comments
      if (line.startsWith('%%')) {
        this.diagram.comments.push(line)
        i++
        continue
      }

      // Autonumber
      if (line === 'autonumber') {
        this.diagram.config.autonumber = true
        i++
        continue
      }

      // Box start
      if (line.startsWith('box ')) {
        const boxMatch = line.match(/^box\s+(?:(transparent|rgb\([^)]+\)|rgba\([^)]+\)|[A-Za-z]+)\s+)?(.*)$/)
        if (boxMatch) {
          const color = boxMatch[1]
          const description = boxMatch[2] || undefined
          const box = new Box(this.generateId(), color, description)
          this.diagram.addBox(box)
          this.currentBox = box
        }
        i++
        continue
      }

      // End (closes box or control structure)
      if (line === 'end') {
        if (this.currentBox) {
          this.currentBox = null
        } else {
          // End of control structure - return to caller
          return
        }
        i++
        continue
      }

      // Participant/Actor
      if (line.startsWith('participant ') || line.startsWith('actor ')) {
        this.parseParticipant(line)
        i++
        continue
      }

      // Create participant/actor
      if (line.startsWith('create ')) {
        this.parseCreateParticipant(line)
        i++
        continue
      }

      // Destroy
      if (line.startsWith('destroy ')) {
        this.parseDestroy(line)
        i++
        continue
      }

      // Activate/Deactivate
      if (line.startsWith('activate ') || line.startsWith('deactivate ')) {
        this.parseActivation(line)
        i++
        continue
      }

      // Note
      if (line.startsWith('Note ')) {
        this.parseNote(line, context)
        i++
        continue
      }

      // Links
      if (line.startsWith('link ') || line.startsWith('links ')) {
        this.parseLink(line)
        i++
        continue
      }

      // Control structures
      if (line.startsWith('loop ') || line.startsWith('alt ') || line.startsWith('opt ') ||
          line.startsWith('par ') || line.startsWith('critical ') || line.startsWith('break ') ||
          line.startsWith('rect ')) {
        const structure = this.parseControlStructure(line, lines.slice(i + 1))
        if (context) {
          context.structures.push(structure)
        } else {
          this.diagram.addStructure(structure)
        }
        // Skip lines consumed by the structure
        let depth = 1
        i++
        while (i < lines.length && depth > 0) {
          if (lines[i].match(/^(loop|alt|opt|par|critical|break|rect)\s/)) {
            depth++
          } else if (lines[i] === 'end') {
            depth--
          }
          i++
        }
        continue
      }

      // Message (default case)
      if (this.isMessage(line)) {
        const message = this.parseMessage(line)
        if (context) {
          context.messages.push(message)
        } else {
          this.diagram.addMessage(message)
        }
      }

      i++
    }
  }

  private parseParticipant(line: string): void {
    const match = line.match(/^(participant|actor)\s+(\w+)(?:\s+as\s+(.+))?$/)
    if (match) {
      const type = match[1] as ActorType
      const id = match[2]
      const label = match[3] || id

      const participant = new Participant(id, label, type, true)

      if (this.currentBox) {
        participant.setBox(this.currentBox.id)
        this.currentBox.addParticipant(id)
      }

      this.diagram.addParticipant(participant)
    }
  }

  private parseCreateParticipant(line: string): void {
    const match = line.match(/^create\s+(participant|actor)\s+(\w+)(?:\s+as\s+(.+))?$/)
    if (match) {
      const type = match[1] as ActorType
      const id = match[2]
      const label = match[3] || id

      const participant = new Participant(id, label, type, true)
      participant.created = true

      this.diagram.addParticipant(participant)
    }
  }

  private parseDestroy(line: string): void {
    const match = line.match(/^destroy\s+(\w+)$/)
    if (match) {
      const id = match[1]
      const participant = this.diagram.getParticipant(id)
      if (participant) {
        participant.destroyed = true
      }
    }
  }

  private parseActivation(line: string): void {
    const activateMatch = line.match(/^activate\s+(\w+)$/)
    const deactivateMatch = line.match(/^deactivate\s+(\w+)$/)

    if (activateMatch) {
      this.diagram.activate(activateMatch[1])
    } else if (deactivateMatch) {
      this.diagram.deactivate(deactivateMatch[1])
    }
  }

  private parseNote(line: string, context?: ControlStructureChild): void {
    // Note right of A: text
    // Note left of A: text
    // Note over A,B: text
    const singleMatch = line.match(/^Note\s+(right|left)\s+of\s+(\w+):\s*(.*)$/)
    const overMatch = line.match(/^Note\s+over\s+([\w,]+):\s*(.*)$/)

    if (singleMatch) {
      const position = singleMatch[1] as NotePosition
      const actor = singleMatch[2]
      const text = singleMatch[3]

      const note = new Note(this.generateId(), position, [actor], text)
      if (context) {
        context.notes.push(note)
      } else {
        this.diagram.addNote(note)
      }
    } else if (overMatch) {
      const actors = overMatch[1].split(',').map(a => a.trim())
      const text = overMatch[2]

      const note = new Note(this.generateId(), 'over', actors, text)
      if (context) {
        context.notes.push(note)
      } else {
        this.diagram.addNote(note)
      }
    }
  }

  private parseLink(line: string): void {
    // link A: Label @ url
    const simpleLinkMatch = line.match(/^link\s+(\w+):\s*(.+?)\s*@\s*(.+)$/)
    if (simpleLinkMatch) {
      const participantId = simpleLinkMatch[1]
      const label = simpleLinkMatch[2]
      const url = simpleLinkMatch[3]

      const participant = this.diagram.getParticipant(participantId)
      if (participant) {
        participant.addLink(label, url)
      }
    }

    // links A: {"Label1": "url1", "Label2": "url2"}
    const jsonLinkMatch = line.match(/^links\s+(\w+):\s*(\{.+\})$/)
    if (jsonLinkMatch) {
      const participantId = jsonLinkMatch[1]
      const jsonStr = jsonLinkMatch[2]

      try {
        const links = JSON.parse(jsonStr)
        const participant = this.diagram.getParticipant(participantId)
        if (participant) {
          Object.entries(links).forEach(([label, url]) => {
            participant.addLink(label, url as string)
          })
        }
      } catch (e) {
        console.error('Failed to parse links JSON:', e)
      }
    }
  }

  private isMessage(line: string): boolean {
    const arrowPatterns = [
      '<<-->>',
      '<<->>',
      '-->>',
      '->>',
      '-->',
      '->',
      '--x',
      '-x',
      '--)',
      '-)'
    ]

    return arrowPatterns.some(pattern => line.includes(pattern))
  }

  private parseMessage(line: string): Message {
    // A->>+B: text
    const arrowPatterns: ArrowType[] = [
      '<<-->>',
      '<<->>',
      '-->>',
      '->>',
      '-->',
      '->',
      '--x',
      '-x',
      '--)',
      '-)'
    ]

    let arrowType: ArrowType | null = null
    let parts: string[] = []

    for (const pattern of arrowPatterns) {
      if (line.includes(pattern)) {
        arrowType = pattern
        parts = line.split(pattern)
        break
      }
    }

    if (!arrowType || parts.length !== 2) {
      throw new Error(`Invalid message format: ${line}`)
    }

    let from = parts[0].trim()
    let toAndText = parts[1].trim()

    // Handle activation modifiers (+ and -)
    let activateFrom = false
    let deactivateFrom = false
    let activateTo = false
    let deactivateTo = false

    if (from.endsWith('+')) {
      activateFrom = true
      from = from.slice(0, -1)
    } else if (from.endsWith('-')) {
      deactivateFrom = true
      from = from.slice(0, -1)
    }

    // Split to and text by colon
    const colonIndex = toAndText.indexOf(':')
    let to: string
    let text = ''

    if (colonIndex !== -1) {
      to = toAndText.slice(0, colonIndex).trim()
      text = toAndText.slice(colonIndex + 1).trim()
    } else {
      to = toAndText
    }

    if (to.startsWith('+')) {
      activateTo = true
      to = to.slice(1)
    } else if (to.startsWith('-')) {
      deactivateTo = true
      to = to.slice(1)
    }

    const message = new Message(this.generateId(), from, to, arrowType, text)
    message.activateFrom = activateFrom
    message.activateTo = activateTo
    message.deactivateFrom = deactivateFrom
    message.deactivateTo = deactivateTo

    return message
  }

  private parseControlStructure(line: string, remainingLines: string[]): ControlStructure {
    let type: ControlStructureType
    let label: string | undefined
    let color: string | undefined

    if (line.startsWith('loop ')) {
      type = 'loop'
      label = line.slice(5).trim()
    } else if (line.startsWith('alt ')) {
      type = 'alt'
      label = line.slice(4).trim()
    } else if (line.startsWith('opt ')) {
      type = 'opt'
      label = line.slice(4).trim()
    } else if (line.startsWith('par ')) {
      type = 'par'
      label = line.slice(4).trim()
    } else if (line.startsWith('critical ')) {
      type = 'critical'
      label = line.slice(9).trim()
    } else if (line.startsWith('break ')) {
      type = 'break'
      label = line.slice(6).trim()
    } else if (line.startsWith('rect ')) {
      type = 'rect'
      const match = line.match(/^rect\s+(.+)$/)
      if (match) {
        color = match[1]
      }
    } else {
      throw new Error(`Unknown control structure: ${line}`)
    }

    const structure = new ControlStructure(this.generateId(), type, label, color)

    // Parse the content until 'end'
    const child = structure.addChild(label)
    const contentLines: string[] = []
    let depth = 1
    let i = 0

    while (i < remainingLines.length && depth > 0) {
      const currentLine = remainingLines[i]

      if (currentLine.match(/^(loop|alt|opt|par|critical|break|rect)\s/)) {
        depth++
        contentLines.push(currentLine)
      } else if (currentLine === 'end') {
        depth--
        if (depth > 0) {
          contentLines.push(currentLine)
        }
      } else if ((currentLine.startsWith('else ') || currentLine.startsWith('and ') ||
                  currentLine.startsWith('option ')) && depth === 1) {
        // Parse current child content
        this.parseLines(contentLines, child)

        // Start new child
        const newLabel = currentLine.match(/^(else|and|option)\s+(.*)$/)?.[2] || ''
        const newChild = structure.addChild(newLabel)
        contentLines.length = 0

        // Continue with new child
        Object.assign(child, newChild)
      } else {
        contentLines.push(currentLine)
      }

      i++
    }

    // Parse remaining content
    if (contentLines.length > 0) {
      this.parseLines(contentLines, child)
    }

    return structure
  }

  private generateId(): string {
    return `elem_${this.nextId++}`
  }
}
