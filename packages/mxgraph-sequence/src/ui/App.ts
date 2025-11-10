import { SequenceDiagram } from '../models/SequenceDiagram'
import { MermaidParser } from '../parser/MermaidParser'
import { MermaidGenerator } from '../generator/MermaidGenerator'
import { MxGraphRenderer } from '../renderer/MxGraphRenderer'
import { Participant } from '../models/Participant'
import { Message } from '../models/Message'
import { Toolbar } from './Toolbar'
import { PropertiesPanel } from './PropertiesPanel'

declare const mxEvent: any

export class App {
  private diagram: SequenceDiagram
  private parser: MermaidParser
  private generator: MermaidGenerator
  private renderer: MxGraphRenderer
  private toolbar: Toolbar
  private propertiesPanel: PropertiesPanel
  private textEditor: HTMLTextAreaElement
  private graphContainer: HTMLElement
  private isUpdatingFromText = false
  private isUpdatingFromGraph = false

  constructor(
    graphContainer: HTMLElement,
    textEditor: HTMLTextAreaElement,
    toolbarContainer: HTMLElement,
    propertiesContainer: HTMLElement
  ) {
    this.diagram = new SequenceDiagram()
    this.parser = new MermaidParser()
    this.generator = new MermaidGenerator()
    this.renderer = new MxGraphRenderer(graphContainer)
    this.textEditor = textEditor
    this.graphContainer = graphContainer

    // Initialize toolbar
    this.toolbar = new Toolbar(toolbarContainer, this.renderer, (type, data) => {
      this.handleElementAdd(type, data)
    })

    // Initialize properties panel
    this.propertiesPanel = new PropertiesPanel(propertiesContainer, (element, key, value) => {
      this.handlePropertyChange(element, key, value)
    })

    // Set up edge callbacks
    this.renderer.setEdgeCallbacks(
      (from, to, y) => this.handleEdgeCreated(from, to, y),
      (edgeId, newY) => this.handleEdgeMoved(edgeId, newY)
    )

    this.setupEventListeners()
    this.setupDragAndDrop()
    this.loadInitialDiagram()
  }

  private setupEventListeners(): void {
    // Text editor change event
    this.textEditor.addEventListener('input', () => {
      this.handleTextChange()
    })
  }

  private loadInitialDiagram(): void {
    const initialText = `sequenceDiagram
  participant Alice
  participant Bob
  Alice->>Bob: Hello Bob, how are you?
  Bob-->>Alice: Great!
  Alice-)Bob: See you later!`

    this.textEditor.value = initialText
    this.handleTextChange()
  }

  private handleTextChange(): void {
    if (this.isUpdatingFromGraph) return

    this.isUpdatingFromText = true

    try {
      const text = this.textEditor.value
      this.diagram = this.parser.parse(text)
      this.renderer.render(this.diagram)
    } catch (error) {
      console.error('Parse error:', error)
      // Show error in UI
      this.showError(error instanceof Error ? error.message : String(error))
    } finally {
      this.isUpdatingFromText = false
    }
  }

  private handleGraphChange(): void {
    if (this.isUpdatingFromText) return

    this.isUpdatingFromGraph = true

    try {
      const text = this.generator.generate(this.diagram)
      this.textEditor.value = text
    } catch (error) {
      console.error('Generation error:', error)
    } finally {
      this.isUpdatingFromGraph = false
    }
  }

  addParticipant(id: string, label: string, type: 'participant' | 'actor' = 'participant'): void {
    const participant = new Participant(id, label, type, true)
    this.diagram.addParticipant(participant)
    this.updateViews()
  }

  addMessage(from: string, to: string, text: string, arrowType: any = '->>'): void {
    const message = new Message(`msg_${Date.now()}`, from, to, arrowType, text)
    this.diagram.addMessage(message)
    this.updateViews()
  }

  private updateViews(): void {
    this.renderer.render(this.diagram)
    this.handleGraphChange()
  }

  private showError(message: string): void {
    // Simple error display - could be enhanced with a proper UI component
    console.error('Error:', message)
  }

  private setupDragAndDrop(): void {
    const graph = this.renderer.getGraph()

    // Enable drag and drop from toolbar
    this.graphContainer.addEventListener('dragover', (evt) => {
      evt.preventDefault()
    })

    this.graphContainer.addEventListener('drop', (evt) => {
      evt.preventDefault()

      const data = evt.dataTransfer?.getData('application/json')
      if (!data) return

      const dropData = JSON.parse(data)
      const rect = this.graphContainer.getBoundingClientRect()
      const x = evt.clientX - rect.left
      const y = evt.clientY - rect.top

      this.handleDrop(dropData.type, x, y)
    })

    // Setup graph selection listener
    graph.getSelectionModel().addListener(mxEvent.CHANGE, () => {
      const selectedCells = graph.getSelectionCells()
      if (selectedCells.length === 1) {
        this.handleSelectionChange(selectedCells[0])
      } else {
        this.propertiesPanel.showEmptyState()
      }
    })
  }

  private handleDrop(type: string, x: number, y: number): void {
    const graph = this.renderer.getGraph()
    const parent = graph.getDefaultParent()

    graph.getModel().beginUpdate()
    try {
      let cell = null

      if (type === 'participant' || type === 'actor') {
        const id = `${type}_${Date.now()}`
        const style = type === 'actor' ? 'actor' : 'participant'

        cell = graph.insertVertex(parent, id, id, x, y, 120, 60, style)

        // Add participant to diagram
        const participant = new Participant(id, id, type, true)
        this.diagram.addParticipant(participant)
      } else if (type === 'note') {
        cell = graph.insertVertex(parent, null, 'Note text', x, y, 150, 80, 'note')
      }

      if (cell) {
        graph.setSelectionCell(cell)
      }

      this.updateViews()
    } finally {
      graph.getModel().endUpdate()
    }
  }

  private handleElementAdd(type: string, data: any): void {
    console.log('Element add:', type, data)
  }

  private handleSelectionChange(cell: any): void {
    if (!cell) {
      this.propertiesPanel.showEmptyState()
      return
    }

    const graph = this.renderer.getGraph()
    const model = graph.getModel()

    // Check if it's a message (edge)
    if (model.isEdge(cell)) {
      const message = this.diagram.messages.find(m => m.id === cell.id)
      if (message) {
        this.propertiesPanel.showProperties(cell, [
          {
            label: 'From',
            key: 'from',
            type: 'text',
            value: message.from
          },
          {
            label: 'To',
            key: 'to',
            type: 'text',
            value: message.to
          },
          {
            label: 'Text',
            key: 'text',
            type: 'text',
            value: message.text
          },
          {
            label: 'Arrow Type',
            key: 'arrowType',
            type: 'select',
            value: message.arrowType,
            options: [
              { value: '->>', label: 'Solid Arrow' },
              { value: '-->>', label: 'Dashed Arrow' },
              { value: '->', label: 'Solid Line' },
              { value: '-->', label: 'Dashed Line' },
              { value: '-x', label: 'Solid X' },
              { value: '--x', label: 'Dashed X' },
              { value: '-)', label: 'Solid Open' },
              { value: '--)', label: 'Dashed Open' },
              { value: '<<->>', label: 'Solid Both' },
              { value: '<<-->>', label: 'Dashed Both' }
            ]
          }
        ])
        return
      }
    }

    // Check if it's a participant
    if (cell.id) {
      const participant = this.diagram.getParticipant(cell.id)
      if (participant) {
        this.propertiesPanel.showProperties(cell, [
          {
            label: 'ID',
            key: 'id',
            type: 'text',
            value: participant.id
          },
          {
            label: 'Label',
            key: 'label',
            type: 'text',
            value: participant.label
          },
          {
            label: 'Type',
            key: 'type',
            type: 'select',
            value: participant.type,
            options: [
              { value: 'participant', label: 'Participant' },
              { value: 'actor', label: 'Actor' }
            ]
          }
        ])
        return
      }
    }

    this.propertiesPanel.showEmptyState()
  }

  private handlePropertyChange(element: any, key: string, value: any): void {
    if (!element) return

    const graph = this.renderer.getGraph()
    const model = graph.getModel()

    // Check if it's a message (edge)
    if (model.isEdge(element)) {
      const message = this.diagram.messages.find(m => m.id === element.id)
      if (message) {
        if (key === 'text') {
          message.text = value
          model.setValue(element, value)
        } else if (key === 'arrowType') {
          message.arrowType = value as any
          // Update style would require re-rendering
          this.updateViews()
          return
        }
        this.handleGraphChange()
        return
      }
    }

    // Check if it's a participant
    const participant = this.diagram.getParticipant(element.id)
    if (participant) {
      if (key === 'label') {
        participant.label = value
        model.setValue(element, value)
      } else if (key === 'type') {
        participant.type = value as 'participant' | 'actor'
        const style = value === 'actor' ? 'actor' : 'participant'
        model.setStyle(element, style)
      }

      this.updateViews()
    }
  }

  private handleEdgeCreated(from: string, to: string, y: number): void {
    console.log('Edge created:', from, '->', to, 'at y:', y)

    // Create a new message
    const message = new Message(`msg_${Date.now()}`, from, to, '->>', '')
    this.diagram.addMessage(message)

    // Update views
    this.updateViews()
  }

  private handleEdgeMoved(edgeId: string, newY: number): void {
    console.log('Edge moved:', edgeId, 'to y:', newY)

    // Find the message
    const message = this.diagram.messages.find(m => m.id === edgeId)
    if (message) {
      // Update edge position in EdgeManager
      const edgeManager = this.renderer.getEdgeManager()
      edgeManager.updateEdgePosition(edgeId, newY)

      // Get reordered messages
      const orderedEdges = edgeManager.getEdgesByOrder()

      // Rebuild messages array in new order
      this.diagram.messages = orderedEdges.map(edge => edge.message)

      // Update Mermaid text
      this.handleGraphChange()
    }
  }

  getDiagram(): SequenceDiagram {
    return this.diagram
  }

  getRenderer(): MxGraphRenderer {
    return this.renderer
  }

  destroy(): void {
    this.renderer.destroy()
  }
}
