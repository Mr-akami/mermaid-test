import { SequenceDiagram } from '../models/SequenceDiagram'
import { Participant } from '../models/Participant'
import { Message } from '../models/Message'
import { Note } from '../models/Note'
import { ControlStructure } from '../models/ControlStructure'
import { EdgeManager } from './EdgeManager'

declare const mxGraph: any
declare const mxRubberband: any
declare const mxConstants: any
declare const mxUtils: any
declare const mxEvent: any

interface RenderContext {
  participantPositions: Map<string, { x: number; y: number; cell: any }>
  lifelinePositions: Map<string, { cell: any; x: number }>
  currentY: number
  participantWidth: number
  participantHeight: number
  messageSpacing: number
  lifelineStartY: number
}

export class MxGraphRenderer {
  private graph: any
  private diagram: SequenceDiagram | null = null
  private context: RenderContext
  private edgeManager: EdgeManager
  private onEdgeCreate?: (from: string, to: string, y: number) => void
  private onEdgeMove?: (edgeId: string, newY: number) => void

  constructor(container: HTMLElement) {
    // Check if browser is supported
    if (typeof mxGraph === 'undefined') {
      throw new Error('mxGraph library not loaded')
    }

    // Create the graph instance
    this.graph = new mxGraph(container)

    // Enable rubberband selection
    new mxRubberband(this.graph)

    // Enable interactive editing
    this.graph.setCellsEditable(true)
    this.graph.setCellsResizable(true)
    this.graph.setCellsMovable(true)
    this.graph.setConnectable(true)

    // Enable drag and drop
    this.graph.setDropEnabled(true)

    // Participants can only move horizontally
    this.graph.graphHandler.setRemoveCellsFromParent(false)

    // Initialize rendering context
    this.context = {
      participantPositions: new Map(),
      lifelinePositions: new Map(),
      currentY: 100,
      participantWidth: 120,
      participantHeight: 60,
      messageSpacing: 80,
      lifelineStartY: 180
    }

    this.setupStyles()

    // Initialize edge manager (will be set up after graph is ready)
    this.edgeManager = new EdgeManager(
      this.graph,
      (from, to, y) => this.handleEdgeCreate(from, to, y),
      (edgeId, newY) => this.handleEdgeMove(edgeId, newY)
    )
  }

  setEdgeCallbacks(
    onEdgeCreate: (from: string, to: string, y: number) => void,
    onEdgeMove: (edgeId: string, newY: number) => void
  ): void {
    this.onEdgeCreate = onEdgeCreate
    this.onEdgeMove = onEdgeMove
  }

  private handleEdgeCreate(from: string, to: string, y: number): void {
    if (this.onEdgeCreate) {
      this.onEdgeCreate(from, to, y)
    }
  }

  private handleEdgeMove(edgeId: string, newY: number): void {
    if (this.onEdgeMove) {
      this.onEdgeMove(edgeId, newY)
    }
  }

  private setupStyles(): void {
    const stylesheet = this.graph.getStylesheet()

    // Participant style
    const participantStyle: any = {}
    participantStyle[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_RECTANGLE
    participantStyle[mxConstants.STYLE_FILLCOLOR] = '#E8F5E9'
    participantStyle[mxConstants.STYLE_STROKECOLOR] = '#4CAF50'
    participantStyle[mxConstants.STYLE_FONTCOLOR] = '#000000'
    participantStyle[mxConstants.STYLE_ALIGN] = mxConstants.ALIGN_CENTER
    participantStyle[mxConstants.STYLE_VERTICAL_ALIGN] = mxConstants.ALIGN_MIDDLE
    participantStyle[mxConstants.STYLE_ROUNDED] = true
    stylesheet.putCellStyle('participant', participantStyle)

    // Actor style (person icon approximation)
    const actorStyle: any = {}
    actorStyle[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_ACTOR
    actorStyle[mxConstants.STYLE_FILLCOLOR] = '#E3F2FD'
    actorStyle[mxConstants.STYLE_STROKECOLOR] = '#2196F3'
    actorStyle[mxConstants.STYLE_FONTCOLOR] = '#000000'
    actorStyle[mxConstants.STYLE_ALIGN] = mxConstants.ALIGN_CENTER
    actorStyle[mxConstants.STYLE_VERTICAL_ALIGN] = mxConstants.ALIGN_MIDDLE
    stylesheet.putCellStyle('actor', actorStyle)

    // Lifeline style
    const lifelineStyle: any = {}
    lifelineStyle[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_CONNECTOR
    lifelineStyle[mxConstants.STYLE_STROKECOLOR] = '#999999'
    lifelineStyle[mxConstants.STYLE_DASHED] = true
    lifelineStyle[mxConstants.STYLE_ENDARROW] = mxConstants.NONE
    stylesheet.putCellStyle('lifeline', lifelineStyle)

    // Message arrow styles
    const messageStyle: any = {}
    messageStyle[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_CONNECTOR
    messageStyle[mxConstants.STYLE_STROKECOLOR] = '#000000'
    messageStyle[mxConstants.STYLE_ENDARROW] = mxConstants.ARROW_CLASSIC
    messageStyle[mxConstants.STYLE_EDGE] = mxConstants.EDGESTYLE_ORTHOGONAL
    stylesheet.putCellStyle('message', messageStyle)

    // Note style
    const noteStyle: any = {}
    noteStyle[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_RECTANGLE
    noteStyle[mxConstants.STYLE_FILLCOLOR] = '#FFF9C4'
    noteStyle[mxConstants.STYLE_STROKECOLOR] = '#F57F17'
    noteStyle[mxConstants.STYLE_FONTCOLOR] = '#000000'
    noteStyle[mxConstants.STYLE_ALIGN] = mxConstants.ALIGN_LEFT
    noteStyle[mxConstants.STYLE_VERTICAL_ALIGN] = mxConstants.ALIGN_TOP
    stylesheet.putCellStyle('note', noteStyle)

    // Activation box style
    const activationStyle: any = {}
    activationStyle[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_RECTANGLE
    activationStyle[mxConstants.STYLE_FILLCOLOR] = '#FFFFFF'
    activationStyle[mxConstants.STYLE_STROKECOLOR] = '#000000'
    stylesheet.putCellStyle('activation', activationStyle)

    // Control structure box style
    const controlStyle: any = {}
    controlStyle[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_RECTANGLE
    controlStyle[mxConstants.STYLE_FILLCOLOR] = '#F5F5F5'
    controlStyle[mxConstants.STYLE_STROKECOLOR] = '#757575'
    controlStyle[mxConstants.STYLE_DASHED] = true
    controlStyle[mxConstants.STYLE_ROUNDED] = true
    stylesheet.putCellStyle('control', controlStyle)
  }

  render(diagram: SequenceDiagram): void {
    this.diagram = diagram
    this.context.participantPositions.clear()
    this.context.lifelinePositions.clear()
    this.context.currentY = this.context.lifelineStartY
    this.edgeManager.clear()

    const model = this.graph.getModel()

    model.beginUpdate()
    try {
      // Clear the graph
      this.graph.removeCells(this.graph.getChildVertices(this.graph.getDefaultParent()))

      const parent = this.graph.getDefaultParent()

      // Render participants
      this.renderParticipants(parent)

      // Render lifelines
      this.renderLifelines(parent)

      // Render messages and notes
      this.renderMessages(parent)
      this.renderNotes(parent)

      // Render control structures
      this.renderStructures(parent)

    } finally {
      model.endUpdate()
    }
  }

  private renderParticipants(parent: any): void {
    if (!this.diagram) return

    const orderedParticipants = this.getOrderedParticipants()
    const startX = 100
    const spacing = this.context.participantWidth + 100

    orderedParticipants.forEach((participant, index) => {
      const x = startX + index * spacing
      const y = this.context.currentY - this.context.participantHeight - 20

      const style = participant.type === 'actor' ? 'actor' : 'participant'

      const cell = this.graph.insertVertex(
        parent,
        participant.id,
        participant.label,
        x,
        y,
        this.context.participantWidth,
        this.context.participantHeight,
        style
      )

      this.context.participantPositions.set(participant.id, { x, y, cell })
    })
  }

  private renderLifelines(parent: any): void {
    if (!this.diagram) return

    const lifelineHeight = 600 // Will be adjusted based on content

    this.context.participantPositions.forEach((pos, participantId) => {
      const startX = pos.x + this.context.participantWidth / 2
      const startY = this.context.lifelineStartY

      // Create lifeline as a vertical edge
      const pt1 = this.graph.insertVertex(parent, null, '', startX, startY, 0, 0)
      const pt2 = this.graph.insertVertex(parent, null, '', startX, startY + lifelineHeight, 0, 0)

      // Create lifeline with participant ID for identification
      const lifelineCell = this.graph.insertEdge(parent, `lifeline_${participantId}`, '', pt1, pt2, 'lifeline')

      // Store lifeline position
      this.context.lifelinePositions.set(participantId, {
        cell: lifelineCell,
        x: startX
      })
    })
  }

  private renderMessages(parent: any): void {
    if (!this.diagram) return

    this.diagram.messages.forEach((message, index) => {
      this.renderMessage(parent, message, index)
    })
  }

  private renderMessage(parent: any, message: Message, index: number): void {
    const fromLifeline = this.context.lifelinePositions.get(message.from)
    const toLifeline = this.context.lifelinePositions.get(message.to)

    if (!fromLifeline || !toLifeline) return

    const y = this.context.currentY + index * this.context.messageSpacing

    // Use the exact X position from lifelines
    const fromX = fromLifeline.x
    const toX = toLifeline.x

    // Create source and target points on the lifelines
    const source = this.graph.insertVertex(parent, null, '', fromX, y, 0, 0)
    const target = this.graph.insertVertex(parent, null, '', toX, y, 0, 0)

    // Determine arrow style based on message type
    const style = this.getMessageStyle(message)

    // Insert edge
    const edgeCell = this.graph.insertEdge(parent, message.id, message.text, source, target, style)

    // Register edge with EdgeManager
    this.edgeManager.registerEdge(message, edgeCell, message.from, message.to, y)
  }

  private getMessageStyle(message: Message): string {
    let style = 'message;'

    // Handle different arrow types
    switch (message.arrowType) {
      case '->':
        style += `${mxConstants.STYLE_ENDARROW}=${mxConstants.NONE};`
        break
      case '-->':
        style += `${mxConstants.STYLE_DASHED}=1;${mxConstants.STYLE_ENDARROW}=${mxConstants.NONE};`
        break
      case '->>':
        style += `${mxConstants.STYLE_ENDARROW}=${mxConstants.ARROW_CLASSIC};`
        break
      case '-->>':
        style += `${mxConstants.STYLE_DASHED}=1;${mxConstants.STYLE_ENDARROW}=${mxConstants.ARROW_CLASSIC};`
        break
      case '-x':
        style += `${mxConstants.STYLE_ENDARROW}=${mxConstants.ARROW_BLOCK};`
        break
      case '--x':
        style += `${mxConstants.STYLE_DASHED}=1;${mxConstants.STYLE_ENDARROW}=${mxConstants.ARROW_BLOCK};`
        break
      case '-)':
        style += `${mxConstants.STYLE_ENDARROW}=${mxConstants.ARROW_OPEN};`
        break
      case '--)':
        style += `${mxConstants.STYLE_DASHED}=1;${mxConstants.STYLE_ENDARROW}=${mxConstants.ARROW_OPEN};`
        break
      case '<<->>':
        style += `${mxConstants.STYLE_STARTARROW}=${mxConstants.ARROW_CLASSIC};${mxConstants.STYLE_ENDARROW}=${mxConstants.ARROW_CLASSIC};`
        break
      case '<<-->>':
        style += `${mxConstants.STYLE_DASHED}=1;${mxConstants.STYLE_STARTARROW}=${mxConstants.ARROW_CLASSIC};${mxConstants.STYLE_ENDARROW}=${mxConstants.ARROW_CLASSIC};`
        break
    }

    return style
  }

  private renderNotes(parent: any): void {
    if (!this.diagram) return

    this.diagram.notes.forEach((note, index) => {
      this.renderNote(parent, note, index)
    })
  }

  private renderNote(parent: any, note: Note, index: number): void {
    const noteWidth = 150
    const noteHeight = 80

    if (note.actors.length === 0) return

    const firstActorPos = this.context.participantPositions.get(note.actors[0])
    if (!firstActorPos) return

    let x = firstActorPos.x
    let y = this.context.currentY + index * 60

    if (note.position === 'left') {
      x = firstActorPos.x - noteWidth - 20
    } else if (note.position === 'right') {
      x = firstActorPos.x + this.context.participantWidth + 20
    } else if (note.position === 'over') {
      // Center over the actors
      if (note.actors.length > 1) {
        const lastActorPos = this.context.participantPositions.get(note.actors[note.actors.length - 1])
        if (lastActorPos) {
          x = (firstActorPos.x + lastActorPos.x + this.context.participantWidth) / 2 - noteWidth / 2
        }
      } else {
        x = firstActorPos.x + this.context.participantWidth / 2 - noteWidth / 2
      }
    }

    this.graph.insertVertex(parent, null, note.text, x, y, noteWidth, noteHeight, 'note')
  }

  private renderStructures(parent: any): void {
    if (!this.diagram) return

    // Placeholder for control structure rendering
    // This would require more complex layout logic
  }

  private getOrderedParticipants(): Participant[] {
    if (!this.diagram) return []

    const explicit: Participant[] = []
    const implicit: Participant[] = []

    this.diagram.participants.forEach(p => {
      if (p.isExplicit) {
        explicit.push(p)
      } else {
        implicit.push(p)
      }
    })

    return [...explicit, ...implicit]
  }

  getGraph(): any {
    return this.graph
  }

  getEdgeManager(): EdgeManager {
    return this.edgeManager
  }

  destroy(): void {
    if (this.graph) {
      this.graph.destroy()
    }
  }
}
