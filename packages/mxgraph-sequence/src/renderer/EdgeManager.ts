import { Message } from '../models/Message'
import { ArrowType } from '../utils/types'

declare const mxEvent: any
declare const mxUtils: any
declare const mxPoint: any

export interface EdgeInfo {
  cell: any
  message: Message
  fromParticipantId: string
  toParticipantId: string
  yPosition: number
  order: number
}

export class EdgeManager {
  private graph: any
  private edges: Map<string, EdgeInfo> = new Map()
  private isCreatingEdge = false
  private edgeStartLifeline: string | null = null
  private onEdgeCreate?: (from: string, to: string, y: number) => void
  private onEdgeMove?: (edgeId: string, newY: number) => void

  constructor(
    graph: any,
    onEdgeCreate?: (from: string, to: string, y: number) => void,
    onEdgeMove?: (edgeId: string, newY: number) => void
  ) {
    this.graph = graph
    this.onEdgeCreate = onEdgeCreate
    this.onEdgeMove = onEdgeMove

    this.setupEdgeCreation()
    this.setupEdgeDrag()
  }

  private setupEdgeCreation(): void {
    // Override graph click to handle lifeline clicks
    const originalClick = this.graph.click
    this.graph.click = (me: any) => {
      const cell = me.getCell()

      // Check if clicked on a lifeline
      if (cell && this.isLifeline(cell)) {
        this.handleLifelineClick(cell, me)
        return
      }

      // Call original click handler
      if (originalClick) {
        originalClick.call(this.graph, me)
      }
    }
  }

  private setupEdgeDrag(): void {
    // Allow edges to move only vertically
    // Listen to CELLS_MOVED event on the graph
    this.graph.addListener('cellsMoved', (sender: any, evt: any) => {
      const cells = evt.getProperty('cells')
      const dx = evt.getProperty('dx')
      const dy = evt.getProperty('dy')

      if (!cells || !dx || !dy) return

      cells.forEach((cell: any) => {
        if (this.graph.getModel().isEdge(cell)) {
          // Only allow vertical movement
          const geo = this.graph.getModel().getGeometry(cell)
          if (geo) {
            // Reset horizontal movement
            geo.x -= dx

            // Track new Y position
            const edgeInfo = this.findEdgeByCell(cell)
            if (edgeInfo) {
              edgeInfo.yPosition += dy
              this.reorderEdges()

              if (this.onEdgeMove) {
                this.onEdgeMove(edgeInfo.message.id, edgeInfo.yPosition)
              }
            }
          }
        }
      })
    })
  }

  private isLifeline(cell: any): boolean {
    const style = this.graph.getModel().getStyle(cell)
    return style && style.includes('lifeline')
  }

  private handleLifelineClick(cell: any, me: any): void {
    const participantId = this.getParticipantFromLifeline(cell)
    if (!participantId) return

    if (!this.isCreatingEdge) {
      // Start creating edge
      this.isCreatingEdge = true
      this.edgeStartLifeline = participantId

      // Visual feedback
      this.graph.setCellStyles(mxUtils.STYLE_STROKECOLOR, '#3498db', [cell])
      this.graph.setCellStyles(mxUtils.STYLE_STROKEWIDTH, '3', [cell])

      console.log('Edge creation started from:', participantId)
    } else {
      // Complete edge creation
      const endLifeline = participantId

      if (this.edgeStartLifeline && this.edgeStartLifeline !== endLifeline) {
        const y = me.getGraphY()

        if (this.onEdgeCreate) {
          this.onEdgeCreate(this.edgeStartLifeline, endLifeline, y)
        }

        console.log('Edge created:', this.edgeStartLifeline, '->', endLifeline)
      }

      // Reset
      this.isCreatingEdge = false
      this.edgeStartLifeline = null

      // Reset visual feedback for all lifelines
      const allCells = this.graph.getChildCells(this.graph.getDefaultParent())
      allCells.forEach((c: any) => {
        if (this.isLifeline(c)) {
          this.graph.setCellStyles(mxUtils.STYLE_STROKECOLOR, '#999999', [c])
          this.graph.setCellStyles(mxUtils.STYLE_STROKEWIDTH, '1', [c])
        }
      })
    }
  }

  private getParticipantFromLifeline(lifelineCell: any): string | null {
    // Lifelines are edges, get their source vertex (participant)
    const model = this.graph.getModel()
    const source = model.getTerminal(lifelineCell, true)

    if (source && source.id) {
      return source.id
    }

    return null
  }

  registerEdge(message: Message, cell: any, fromId: string, toId: string, y: number): void {
    const order = this.edges.size

    const edgeInfo: EdgeInfo = {
      cell,
      message,
      fromParticipantId: fromId,
      toParticipantId: toId,
      yPosition: y,
      order
    }

    this.edges.set(message.id, edgeInfo)
    this.reorderEdges()
  }

  updateEdgePosition(messageId: string, newY: number): void {
    const edgeInfo = this.edges.get(messageId)
    if (edgeInfo) {
      edgeInfo.yPosition = newY
      this.reorderEdges()
    }
  }

  private reorderEdges(): void {
    // Sort edges by Y position
    const sortedEdges = Array.from(this.edges.values()).sort((a, b) => a.yPosition - b.yPosition)

    // Update order numbers
    sortedEdges.forEach((edge, index) => {
      edge.order = index
    })
  }

  getEdgesByOrder(): EdgeInfo[] {
    return Array.from(this.edges.values()).sort((a, b) => a.order - b.order)
  }

  private findEdgeByCell(cell: any): EdgeInfo | undefined {
    for (const edge of this.edges.values()) {
      if (edge.cell === cell) {
        return edge
      }
    }
    return undefined
  }

  removeEdge(messageId: string): void {
    this.edges.delete(messageId)
    this.reorderEdges()
  }

  clear(): void {
    this.edges.clear()
    this.isCreatingEdge = false
    this.edgeStartLifeline = null
  }

  getEdgeInfo(messageId: string): EdgeInfo | undefined {
    return this.edges.get(messageId)
  }

  getAllEdges(): EdgeInfo[] {
    return Array.from(this.edges.values())
  }
}
