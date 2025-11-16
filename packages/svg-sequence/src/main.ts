import './style.css'

type ToolMode = 'select' | 'participant' | 'actor' | 'message' | 'note' | 'block'

type ArrowType =
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

type BlockKind = 'loop' | 'alt' | 'opt' | 'par' | 'critical' | 'break' | 'rect'

type NotePlacement = 'left' | 'right' | 'over'

interface DiagramSettings {
  width: number
  height: number
  autonumber: boolean
  mirrorActors: boolean
}

interface ParticipantLink {
  id: string
  label: string
  url: string
}

interface Participant {
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

interface Message {
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

interface Note {
  id: string
  targetIds: string[]
  placement: NotePlacement
  text: string
  y: number
  height: number
}

interface Block {
  id: string
  kind: BlockKind
  label: string
  color: string
  x: number
  y: number
  width: number
  height: number
}

interface Selection {
  type: 'participant' | 'message' | 'note' | 'block'
  id: string
}

interface AppState {
  tool: ToolMode
  settings: DiagramSettings
  participants: Participant[]
  messages: Message[]
  notes: Note[]
  blocks: Block[]
  selection: Selection | null
}

type DragState =
  | { type: 'participant'; id: string; offsetX: number }
  | { type: 'message'; id: string; offsetY: number }
  | { type: 'note'; id: string; offsetY: number }
  | { type: 'block'; id: string; offsetX: number; offsetY: number }
  | { type: 'block-handle'; id: string; handle: 'n' | 's' | 'e' | 'w'; startX: number; startY: number; original: Block }
  | { type: 'block-draft'; id: string; startX: number; startY: number }

type MessageAnchor = { participantId: string; y: number }

const TOOL_LABELS: Record<ToolMode, string> = {
  select: 'Select / Move',
  participant: 'Participant',
  actor: 'Actor',
  message: 'Message',
  note: 'Note',
  block: 'Block'
}

const ARROW_OPTIONS: Array<{ id: ArrowType; label: string; dashed: boolean; start: boolean; end: boolean; variant: 'plain' | 'arrow' | 'cross' | 'open' }> = [
  { id: '->', label: 'Solid line', dashed: false, start: false, end: false, variant: 'plain' },
  { id: '-->', label: 'Dashed line', dashed: true, start: false, end: false, variant: 'plain' },
  { id: '->>', label: 'Sync call', dashed: false, start: false, end: true, variant: 'arrow' },
  { id: '-->>', label: 'Async call', dashed: true, start: false, end: true, variant: 'arrow' },
  { id: '<<->>', label: 'Bidirectional', dashed: false, start: true, end: true, variant: 'arrow' },
  { id: '<<-->>', label: 'Bidirectional dashed', dashed: true, start: true, end: true, variant: 'arrow' },
  { id: '-x', label: 'Destroy (solid)', dashed: false, start: false, end: true, variant: 'cross' },
  { id: '--x', label: 'Destroy (dashed)', dashed: true, start: false, end: true, variant: 'cross' },
  { id: '-)', label: 'Open arrow', dashed: false, start: false, end: true, variant: 'open' },
  { id: '--))', label: 'Open arrow dashed', dashed: true, start: false, end: true, variant: 'open' }
]

const BLOCK_TYPES: Array<{ id: BlockKind; label: string }> = [
  { id: 'loop', label: 'loop' },
  { id: 'alt', label: 'alt' },
  { id: 'opt', label: 'opt' },
  { id: 'par', label: 'par' },
  { id: 'critical', label: 'critical' },
  { id: 'break', label: 'break' },
  { id: 'rect', label: 'rect (highlight)' }
]

const NOTE_PLACEMENTS: Array<{ id: NotePlacement; label: string }> = [
  { id: 'right', label: 'Right of target' },
  { id: 'left', label: 'Left of target' },
  { id: 'over', label: 'Over participants' }
]

const METRICS = {
  headerHeight: 120,
  footerPadding: 60,
  participantWidth: 120,
  noteWidth: 210,
  timelineMargin: 36
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const randomChunk = () => Math.random().toString(36).slice(2, 10)

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}-${randomChunk()}`
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const escapeAttr = (value: string) => escapeHtml(value).replace(/"/g, '&quot;')

const splitAlias = (value: string) => value.split(/<br\s*\/?>/gi)

class SequenceEditor {
  private root: HTMLElement
  private svg: SVGSVGElement
  private propertyPane: HTMLElement
  private mermaidOutput: HTMLElement
  private copyButton: HTMLButtonElement
  private toolbarButtons: NodeListOf<HTMLButtonElement>
  private deleteButton: HTMLButtonElement

  private state: AppState
  private dragState: DragState | null = null
  private pendingAnchor: MessageAnchor | null = null

  constructor(root: HTMLElement) {
    this.root = root
    this.root.innerHTML = this.createLayout()

    this.svg = this.root.querySelector('#diagramCanvas') as SVGSVGElement
    this.propertyPane = this.root.querySelector('[data-properties]') as HTMLElement
    this.mermaidOutput = this.root.querySelector('[data-mermaid-output]') as HTMLElement
    this.copyButton = this.root.querySelector('[data-copy-mermaid]') as HTMLButtonElement
    this.toolbarButtons = this.root.querySelectorAll('[data-tool]') as NodeListOf<HTMLButtonElement>
    this.deleteButton = this.root.querySelector('[data-delete-selection]') as HTMLButtonElement

    this.state = this.createInitialState()

    this.bindEvents()
    this.render()
  }

  private createLayout() {
    const buttons = (Object.keys(TOOL_LABELS) as ToolMode[])
      .map((tool) => `<button type="button" class="tool-btn" data-tool="${tool}">${TOOL_LABELS[tool]}</button>`)
      .join('')

    return `
      <div class="app-shell">
        <aside class="toolbar">
          <header>
            <h1>Mermaid Sequence Editor</h1>
            <p>Draw participants, edges, notes, and blocks directly on the SVG canvas.</p>
          </header>
          <div class="tool-grid">${buttons}</div>
          <p class="hint">Pick a tool, click on the canvas to create shapes, drag to move, use the property panel to refine.</p>
          <button type="button" class="danger-btn" data-delete-selection>Delete Selected</button>
        </aside>
        <section class="canvas-panel">
          <svg id="diagramCanvas" class="diagram-canvas"></svg>
        </section>
        <aside class="properties">
          <div class="properties__title">Properties</div>
          <div class="properties__content" data-properties></div>
        </aside>
      </div>
      <section class="mermaid-panel">
        <div class="mermaid-panel__header">
          <span>Mermaid Preview</span>
          <button type="button" data-copy-mermaid>Copy</button>
        </div>
        <pre data-mermaid-output></pre>
      </section>
    `
  }

  private createInitialState(): AppState {
    const actorId = createId('actor')
    const systemId = createId('participant')

    const participants: Participant[] = [
      {
        id: actorId,
        name: 'User',
        label: 'User',
        kind: 'actor',
        x: 200,
        created: false,
        destroyed: false,
        color: '#fde68a',
        links: []
      },
      {
        id: systemId,
        name: 'System',
        label: 'System',
        kind: 'participant',
        x: 460,
        created: false,
        destroyed: false,
        color: '#bfdbfe',
        links: []
      }
    ]

    const messages: Message[] = [
      {
        id: createId('msg'),
        fromId: actorId,
        toId: systemId,
        y: METRICS.headerHeight + 140,
        text: 'Request',
        arrow: '->>',
        activateTarget: true,
        deactivateTarget: false,
        activateSource: false,
        deactivateSource: false
      }
    ]

    const notes: Note[] = [
      {
        id: createId('note'),
        targetIds: [systemId],
        placement: 'right',
        text: 'Note text',
        y: METRICS.headerHeight + 200,
        height: 90
      }
    ]

    const blocks: Block[] = []

    return {
      tool: 'select',
      settings: {
        width: 1400,
        height: 900,
        autonumber: true,
        mirrorActors: false
      },
      participants,
      messages,
      notes,
      blocks,
      selection: null
    }
  }

  private bindEvents() {
    this.toolbarButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const tool = button.dataset.tool as ToolMode
        this.setTool(tool)
      })
    })

    this.deleteButton.addEventListener('click', () => this.deleteSelection())
    this.copyButton.addEventListener('click', () => this.copyMermaid())

    this.svg.addEventListener('pointerdown', (event) => this.onPointerDown(event))
    window.addEventListener('pointermove', (event) => this.onPointerMove(event))
    window.addEventListener('pointerup', () => this.onPointerUp())
    window.addEventListener('keydown', (event) => this.onKeyDown(event))
  }

  private setTool(tool: ToolMode) {
    this.state.tool = tool
    if (tool !== 'message') {
      this.pendingAnchor = null
    }
    this.renderToolbar()
  }

  private setSelection(selection: Selection | null) {
    this.state.selection = selection
    this.renderProperties()
  }

  private onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.pendingAnchor = null
      this.setTool('select')
      this.render()
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && this.state.selection) {
      this.deleteSelection()
    }
  }

  private onPointerDown(event: PointerEvent) {
    if (!(event.target instanceof Element)) return
    const point = this.getSvgPoint(event)

    const blockHandle = event.target.closest('[data-block-handle]') as SVGRectElement | null
    if (blockHandle) {
      const blockId = blockHandle.dataset.blockId!
      const handle = blockHandle.dataset.blockHandle as 'n' | 's' | 'e' | 'w'
      const block = this.findBlock(blockId)
      if (!block) return
      this.setSelection({ type: 'block', id: blockId })
      this.dragState = { type: 'block-handle', id: blockId, handle, startX: point.x, startY: point.y, original: { ...block } }
      event.preventDefault()
      return
    }

    const participantEl = event.target.closest('[data-participant-id]') as SVGGElement | null
    if (participantEl) {
      const participantId = participantEl.dataset.participantId!
      const participant = this.findParticipant(participantId)
      if (!participant) return

      if (this.state.tool === 'message') {
        this.handleMessageAnchor(participantId, point.y)
        event.preventDefault()
        return
      }

      if (this.state.tool === 'note') {
        this.createNoteFromClick(participant, point)
        event.preventDefault()
        return
      }

      this.setSelection({ type: 'participant', id: participantId })
      this.dragState = { type: 'participant', id: participantId, offsetX: point.x - participant.x }
      event.preventDefault()
      return
    }

    const messageEl = event.target.closest('[data-message-id]') as SVGGElement | null
    if (messageEl) {
      const messageId = messageEl.dataset.messageId!
      const message = this.findMessage(messageId)
      if (!message) return
      this.setSelection({ type: 'message', id: messageId })
      this.dragState = { type: 'message', id: messageId, offsetY: point.y - message.y }
      event.preventDefault()
      return
    }

    const noteEl = event.target.closest('[data-note-id]') as SVGGElement | null
    if (noteEl) {
      const noteId = noteEl.dataset.noteId!
      const note = this.findNote(noteId)
      if (!note) return
      this.setSelection({ type: 'note', id: noteId })
      this.dragState = { type: 'note', id: noteId, offsetY: point.y - note.y }
      event.preventDefault()
      return
    }

    const blockEl = event.target.closest('[data-block-id]') as SVGGElement | null
    if (blockEl) {
      const blockId = blockEl.dataset.blockId!
      const block = this.findBlock(blockId)
      if (!block) return
      this.setSelection({ type: 'block', id: blockId })
      this.dragState = { type: 'block', id: blockId, offsetX: point.x - block.x, offsetY: point.y - block.y }
      event.preventDefault()
      return
    }

    if (this.state.tool === 'block') {
      this.startBlockDraft(point)
      event.preventDefault()
      return
    }

    if (this.state.tool === 'participant' || this.state.tool === 'actor') {
      this.spawnParticipant(this.state.tool, point.x)
      event.preventDefault()
      return
    }

    if (this.state.tool === 'note') {
      const first = this.state.participants[0]
      if (first) {
        this.createNoteFromClick(first, point)
      }
      return
    }

    if (this.state.tool === 'message' && this.pendingAnchor) {
      this.pendingAnchor = null
      this.render()
      return
    }

    this.setSelection(null)
  }

  private onPointerMove(event: PointerEvent) {
    if (!this.dragState) return
    const point = this.getSvgPoint(event)
    event.preventDefault()

    switch (this.dragState.type) {
      case 'participant':
        this.moveParticipant(this.dragState.id, point.x - this.dragState.offsetX)
        break
      case 'message':
        this.moveMessage(this.dragState.id, point.y - this.dragState.offsetY)
        break
      case 'note':
        this.moveNote(this.dragState.id, point.y - this.dragState.offsetY)
        break
      case 'block':
        this.moveBlock(this.dragState.id, point.x - this.dragState.offsetX, point.y - this.dragState.offsetY)
        break
      case 'block-handle':
        this.resizeBlock(point)
        break
      case 'block-draft':
        this.updateBlockDraft(point)
        break
    }

    this.render()
  }

  private onPointerUp() {
    if (this.dragState?.type === 'block-draft') {
      this.finishBlockDraft()
    }
    this.dragState = null
  }

  private spawnParticipant(kind: 'participant' | 'actor', rawX: number) {
    const index = this.state.participants.length + 1
    const x = this.clampParticipantX(rawX)
    const name = kind === 'actor' ? `Actor${index}` : `P${index}`
    const participant: Participant = {
      id: createId('participant'),
      name,
      label: name,
      kind,
      x,
      created: false,
      destroyed: false,
      color: kind === 'actor' ? '#fde68a' : '#bfdbfe',
      links: []
    }
    this.state.participants.push(participant)
    this.setSelection({ type: 'participant', id: participant.id })
    this.render()
  }

  private handleMessageAnchor(participantId: string, rawY: number) {
    const y = this.clampTimelineY(rawY)
    if (!this.pendingAnchor) {
      this.pendingAnchor = { participantId, y }
      this.render()
      return
    }

    if (this.pendingAnchor.participantId === participantId) {
      this.pendingAnchor = null
      this.render()
      return
    }

    const message: Message = {
      id: createId('msg'),
      fromId: this.pendingAnchor.participantId,
      toId: participantId,
      y,
      text: 'message',
      arrow: '->>',
      activateTarget: false,
      deactivateTarget: false,
      activateSource: false,
      deactivateSource: false
    }
    this.state.messages.push(message)
    this.pendingAnchor = null
    this.setSelection({ type: 'message', id: message.id })
    this.render()
  }

  private createNoteFromClick(participant: Participant, point: { x: number; y: number }) {
    const placement: NotePlacement = point.x < participant.x ? 'left' : 'right'
    const note: Note = {
      id: createId('note'),
      targetIds: [participant.id],
      placement,
      text: 'note',
      y: this.clampTimelineY(point.y),
      height: 80
    }
    this.state.notes.push(note)
    this.setSelection({ type: 'note', id: note.id })
    this.render()
  }

  private startBlockDraft(point: { x: number; y: number }) {
    const block: Block = {
      id: createId('block'),
      kind: 'loop',
      label: 'Loop block',
      color: '#bfdbfe',
      x: point.x,
      y: point.y,
      width: 0,
      height: 0
    }
    this.state.blocks.push(block)
    this.setSelection({ type: 'block', id: block.id })
    this.dragState = { type: 'block-draft', id: block.id, startX: point.x, startY: point.y }
  }

  private updateBlockDraft(point: { x: number; y: number }) {
    if (!this.dragState || this.dragState.type !== 'block-draft') return
    const block = this.findBlock(this.dragState.id)
    if (!block) return
    block.x = Math.min(point.x, this.dragState.startX)
    block.y = Math.min(point.y, this.dragState.startY)
    block.width = Math.abs(point.x - this.dragState.startX)
    block.height = Math.abs(point.y - this.dragState.startY)
  }

  private finishBlockDraft() {
    if (!this.dragState || this.dragState.type !== 'block-draft') return
    const block = this.findBlock(this.dragState.id)
    if (!block) return
    if (block.width < 20 || block.height < 20) {
      this.state.blocks = this.state.blocks.filter((entry) => entry.id !== block.id)
    }
    this.dragState = null
  }

  private moveParticipant(id: string, rawX: number) {
    const participant = this.findParticipant(id)
    if (!participant) return
    participant.x = this.clampParticipantX(rawX)
  }

  private moveMessage(id: string, rawY: number) {
    const message = this.findMessage(id)
    if (!message) return
    message.y = this.clampTimelineY(rawY)
  }

  private moveNote(id: string, rawY: number) {
    const note = this.findNote(id)
    if (!note) return
    note.y = this.clampTimelineY(rawY)
  }

  private moveBlock(id: string, rawX: number, rawY: number) {
    const block = this.findBlock(id)
    if (!block) return
    block.x = clamp(rawX, 0, this.state.settings.width - block.width)
    block.y = clamp(rawY, METRICS.headerHeight, METRICS.headerHeight + this.state.settings.height - block.height)
  }

  private resizeBlock(point: { x: number; y: number }) {
    if (!this.dragState || this.dragState.type !== 'block-handle') return
    const block = this.findBlock(this.dragState.id)
    if (!block) return
    const { original, handle, startX, startY } = this.dragState
    const dx = point.x - startX
    const dy = point.y - startY

    if (handle === 'e') {
      block.width = Math.max(40, original.width + dx)
    }
    if (handle === 'w') {
      const newWidth = Math.max(40, original.width - dx)
      block.x = original.x + (original.width - newWidth)
      block.width = newWidth
    }
    if (handle === 's') {
      block.height = Math.max(40, original.height + dy)
    }
    if (handle === 'n') {
      const newHeight = Math.max(40, original.height - dy)
      block.y = original.y + (original.height - newHeight)
      block.height = newHeight
    }
  }

  private clampParticipantX(rawX: number) {
    const minX = METRICS.participantWidth / 2 + 24
    const maxX = this.state.settings.width - METRICS.participantWidth / 2 - 24
    return clamp(rawX, minX, maxX)
  }

  private clampTimelineY(rawY: number) {
    const minY = METRICS.headerHeight + METRICS.timelineMargin
    const maxY = METRICS.headerHeight + this.state.settings.height - METRICS.timelineMargin
    return clamp(rawY, minY, maxY)
  }

  private deleteSelection() {
    const selection = this.state.selection
    if (!selection) return

    if (selection.type === 'participant') {
      this.state.participants = this.state.participants.filter((p) => p.id !== selection.id)
      this.state.messages = this.state.messages.filter((m) => m.fromId !== selection.id && m.toId !== selection.id)
      this.state.notes = this.state.notes.filter((note) => !note.targetIds.includes(selection.id))
    }

    if (selection.type === 'message') {
      this.state.messages = this.state.messages.filter((m) => m.id !== selection.id)
    }

    if (selection.type === 'note') {
      this.state.notes = this.state.notes.filter((n) => n.id !== selection.id)
    }

    if (selection.type === 'block') {
      this.state.blocks = this.state.blocks.filter((b) => b.id !== selection.id)
    }

    this.state.selection = null
    this.render()
  }

  private render() {
    this.renderToolbar()
    this.renderSvg()
    this.renderProperties()
    this.renderMermaid()
  }

  private renderToolbar() {
    this.toolbarButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.tool === this.state.tool)
    })
    this.deleteButton.disabled = !this.state.selection
  }

  private renderSvg() {
    const width = this.state.settings.width
    const height = METRICS.headerHeight + this.state.settings.height + METRICS.footerPadding
    this.svg.setAttribute('width', String(width))
    this.svg.setAttribute('height', String(height))
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
    this.svg.dataset.tool = this.state.tool

    const defs = `
      <defs>
        <marker id="arrowhead" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L10,4 L0,8 z" fill="#1f2937"></path>
        </marker>
        <marker id="arrowhead-accent" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L10,4 L0,8 z" fill="#2563eb"></path>
        </marker>
        <marker id="openArrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L10,6 L0,12" fill="none" stroke="#1f2937" stroke-width="1.5"></path>
        </marker>
        <marker id="openArrow-accent" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L10,6 L0,12" fill="none" stroke="#2563eb" stroke-width="1.5"></path>
        </marker>
        <marker id="crossHead" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto" markerUnits="strokeWidth">
          <path d="M1,1 L9,9 M9,1 L1,9" stroke="#1f2937" stroke-width="1.4" stroke-linecap="round"></path>
        </marker>
        <marker id="crossHead-accent" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto" markerUnits="strokeWidth">
          <path d="M1,1 L9,9 M9,1 L1,9" stroke="#2563eb" stroke-width="1.4" stroke-linecap="round"></path>
        </marker>
      </defs>
    `

    const background = `
      <rect width="${width}" height="${height}" class="canvas-bg"></rect>
      <line x1="0" y1="${METRICS.headerHeight}" x2="${width}" y2="${METRICS.headerHeight}" class="timeline-divider"></line>
    `

    const blocks = this.state.blocks.map((block) => this.renderBlock(block)).join('')
    const participants = this.state.participants.map((participant) => this.renderParticipant(participant)).join('')
    const messages = this.state.messages.map((message) => this.renderMessage(message)).join('')
    const notes = this.state.notes.map((note) => this.renderNote(note)).join('')

    this.svg.innerHTML = `${defs}${background}${blocks}${participants}${messages}${notes}`
  }

  private renderParticipant(participant: Participant) {
    const selected = this.state.selection?.type === 'participant' && this.state.selection.id === participant.id
    const pending = this.pendingAnchor?.participantId === participant.id
    const lifelineBottom = METRICS.headerHeight + this.state.settings.height - METRICS.footerPadding / 2
    const labelLines = splitAlias(participant.label).map((line, index) => {
      const dy = index === 0 ? '0' : '1.2em'
      return `<tspan x="${participant.x}" dy="${dy}">${escapeHtml(line || ' ')}</tspan>`
    })

    const headerShape = participant.kind === 'participant'
      ? `<rect x="${participant.x - METRICS.participantWidth / 2}" y="50" width="${METRICS.participantWidth}" height="60" rx="8" fill="${participant.color}" class="participant-card"></rect>`
      : `
        <g class="actor" fill="${participant.color}" stroke="var(--actor-stroke)">
          <circle cx="${participant.x}" cy="60" r="18"></circle>
          <line x1="${participant.x}" y1="78" x2="${participant.x}" y2="108"></line>
          <line x1="${participant.x - 20}" y1="88" x2="${participant.x + 20}" y2="88"></line>
          <line x1="${participant.x}" y1="108" x2="${participant.x - 18}" y2="136"></line>
          <line x1="${participant.x}" y1="108" x2="${participant.x + 18}" y2="136"></line>
        </g>
      `

    return `
      <g class="participant ${selected ? 'is-selected' : ''} ${pending ? 'is-pending' : ''}" data-participant-id="${participant.id}">
        <line x1="${participant.x}" y1="${METRICS.headerHeight}" x2="${participant.x}" y2="${lifelineBottom}" class="lifeline"></line>
        ${headerShape}
        <text x="${participant.x}" y="130" text-anchor="middle" class="participant-label">${labelLines.join('')}</text>
      </g>
    `
  }

  private renderMessage(message: Message) {
    const from = this.findParticipant(message.fromId)
    const to = this.findParticipant(message.toId)
    if (!from || !to) return ''
    const y = message.y
    const selected = this.state.selection?.type === 'message' && this.state.selection.id === message.id
    const arrow = ARROW_OPTIONS.find((entry) => entry.id === message.arrow)
    const dash = arrow?.dashed ? '6 6' : '0'
    const color = selected ? '#2563eb' : '#1f2937'
    const markerStart = this.resolveMarker(arrow, selected, 'start')
    const markerEnd = this.resolveMarker(arrow, selected, 'end')
    const labelX = from.x + (to.x - from.x) / 2

    return `
      <g class="message ${selected ? 'is-selected' : ''}" data-message-id="${message.id}">
        <line x1="${from.x}" y1="${y}" x2="${to.x}" y2="${y}" stroke="${color}" stroke-dasharray="${dash}" marker-start="${markerStart}" marker-end="${markerEnd}" class="message-line"></line>
        <text x="${labelX}" y="${y - 10}" text-anchor="middle" class="message-label">${escapeHtml(message.text)}</text>
      </g>
    `
  }

  private resolveMarker(arrow: (typeof ARROW_OPTIONS)[number] | undefined, selected: boolean, position: 'start' | 'end') {
    if (!arrow) return 'none'
    const include = position === 'start' ? arrow.start : arrow.end
    if (!include) return 'none'
    const base = arrow.variant === 'arrow' ? 'arrowhead' : arrow.variant === 'cross' ? 'crossHead' : 'openArrow'
    return `url(#${base}${selected ? '-accent' : ''})`
  }

  private renderNote(note: Note) {
    const targets = note.targetIds.map((id) => this.findParticipant(id)).filter(Boolean) as Participant[]
    if (!targets.length) return ''
    const baseX = this.noteX(note, targets)
    const selected = this.state.selection?.type === 'note' && this.state.selection.id === note.id
    const lines = splitAlias(note.text).map((line, index) => {
      const dy = index === 0 ? '0' : '1.2em'
      return `<tspan x="${METRICS.noteWidth / 2}" dy="${dy}">${escapeHtml(line || ' ')}</tspan>`
    })

    return `
      <g class="note ${selected ? 'is-selected' : ''}" data-note-id="${note.id}" transform="translate(${baseX}, ${note.y - note.height / 2})">
        <rect width="${METRICS.noteWidth}" height="${note.height}" rx="6"></rect>
        <text x="${METRICS.noteWidth / 2}" y="${note.height / 2 - 8}" text-anchor="middle">${lines.join('')}</text>
      </g>
    `
  }

  private noteX(note: Note, targets: Participant[]) {
    if (note.placement === 'over' && targets.length >= 2) {
      const min = Math.min(...targets.map((p) => p.x))
      const max = Math.max(...targets.map((p) => p.x))
      return min + (max - min) / 2 - METRICS.noteWidth / 2
    }
    const target = targets[0]
    return note.placement === 'left' ? target.x - METRICS.noteWidth - 24 : target.x + 24
  }

  private renderBlock(block: Block) {
    const selected = this.state.selection?.type === 'block' && this.state.selection.id === block.id
    const handles = selected
      ? (['n', 's', 'e', 'w'] as const)
          .map((handle) => {
            const [hx, hy] = this.blockHandle(block, handle)
            return `<rect class="block-handle" width="12" height="12" x="${hx - 6}" y="${hy - 6}" data-block-id="${block.id}" data-block-handle="${handle}"></rect>`
          })
          .join('')
      : ''

    return `
      <g class="block ${selected ? 'is-selected' : ''}" data-block-id="${block.id}">
        <rect x="${block.x}" y="${block.y}" width="${block.width}" height="${block.height}" rx="8" fill="${block.color}" fill-opacity="0.3" stroke="${block.color}" stroke-dasharray="4 6"></rect>
        <text x="${block.x + 12}" y="${block.y + 24}" class="block-label">${escapeHtml(block.kind.toUpperCase())}: ${escapeHtml(block.label)}</text>
        ${handles}
      </g>
    `
  }

  private blockHandle(block: Block, handle: 'n' | 's' | 'e' | 'w'): [number, number] {
    switch (handle) {
      case 'n':
        return [block.x + block.width / 2, block.y]
      case 's':
        return [block.x + block.width / 2, block.y + block.height]
      case 'e':
        return [block.x + block.width, block.y + block.height / 2]
      case 'w':
        return [block.x, block.y + block.height / 2]
    }
  }

  private renderProperties() {
    if (!this.state.selection) {
      this.propertyPane.innerHTML = this.renderDiagramSettings()
      this.bindDiagramSettings()
      return
    }

    if (this.state.selection.type === 'participant') {
      const participant = this.findParticipant(this.state.selection.id)
      if (!participant) return
      this.propertyPane.innerHTML = this.renderParticipantForm(participant)
      this.bindParticipantForm(participant)
      return
    }

    if (this.state.selection.type === 'message') {
      const message = this.findMessage(this.state.selection.id)
      if (!message) return
      this.propertyPane.innerHTML = this.renderMessageForm(message)
      this.bindMessageForm(message)
      return
    }

    if (this.state.selection.type === 'note') {
      const note = this.findNote(this.state.selection.id)
      if (!note) return
      this.propertyPane.innerHTML = this.renderNoteForm(note)
      this.bindNoteForm(note)
      return
    }

    if (this.state.selection.type === 'block') {
      const block = this.findBlock(this.state.selection.id)
      if (!block) return
      this.propertyPane.innerHTML = this.renderBlockForm(block)
      this.bindBlockForm(block)
      return
    }
  }

  private renderDiagramSettings() {
    const { width, height, autonumber, mirrorActors } = this.state.settings
    return `
      <section>
        <h2>Diagram Settings</h2>
        <label>Width <input type="number" data-setting="width" min="600" max="3200" value="${width}" /></label>
        <label>Height <input type="number" data-setting="height" min="400" max="2400" value="${height}" /></label>
        <label class="checkbox"><input type="checkbox" data-setting="autonumber" ${autonumber ? 'checked' : ''}/> Autonumber messages</label>
        <label class="checkbox"><input type="checkbox" data-setting="mirrorActors" ${mirrorActors ? 'checked' : ''}/> Mirror actors</label>
        <p class="hint">Select any shape to edit advanced properties.</p>
      </section>
    `
  }

  private bindDiagramSettings() {
    this.propertyPane.querySelectorAll<HTMLInputElement>('[data-setting]').forEach((input) => {
      const field = input.dataset.setting as keyof DiagramSettings
      const handler = () => {
        if (input.type === 'checkbox') {
          // @ts-expect-error dynamic
          this.state.settings[field] = input.checked
        } else {
          const value = Number(input.value)
          if (!Number.isNaN(value)) {
            // @ts-expect-error dynamic
            this.state.settings[field] = value
            if (field === 'width') {
              this.state.participants.forEach((participant) => {
                participant.x = this.clampParticipantX(participant.x)
              })
            }
          }
        }
        this.render()
      }
      input.addEventListener('input', handler)
      input.addEventListener('change', handler)
    })
  }

  private renderParticipantForm(participant: Participant) {
    const links = participant.links
      .map(
        (link) => `
          <div class="link-row" data-link-id="${link.id}">
            <input type="text" data-link-field="label" value="${escapeAttr(link.label)}" placeholder="Label" />
            <input type="text" data-link-field="url" value="${escapeAttr(link.url)}" placeholder="https://" />
            <button type="button" data-action="remove-link">×</button>
          </div>
        `
      )
      .join('')

    return `
      <section>
        <h2>Participant</h2>
        <label>Identifier <input type="text" data-field="name" value="${escapeAttr(participant.name)}" /></label>
        <label>Label / Alias <textarea data-field="label">${escapeHtml(participant.label)}</textarea></label>
        <label>Kind
          <select data-field="kind">
            <option value="participant" ${participant.kind === 'participant' ? 'selected' : ''}>participant</option>
            <option value="actor" ${participant.kind === 'actor' ? 'selected' : ''}>actor</option>
          </select>
        </label>
        <label>Color <input type="color" data-field="color" value="${this.toColorValue(participant.color)}" /></label>
        <label class="checkbox"><input type="checkbox" data-field="created" ${participant.created ? 'checked' : ''}/> Created via create</label>
        <label class="checkbox"><input type="checkbox" data-field="destroyed" ${participant.destroyed ? 'checked' : ''}/> Destroyed</label>
        <div class="links">
          <div class="links__header">
            <span>Links</span>
            <button type="button" data-action="add-link">+ Add</button>
          </div>
          ${links || '<p class="hint">Add Mermaid links metadata.</p>'}
        </div>
      </section>
    `
  }

  private bindParticipantForm(participant: Participant) {
    this.propertyPane.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-field]').forEach((input) => {
      const field = input.dataset.field as keyof Participant
      const handler = () => {
        if (input instanceof HTMLInputElement && input.type === 'checkbox') {
          // @ts-expect-error dynamic
          participant[field] = input.checked
        } else if (input instanceof HTMLSelectElement && field === 'kind') {
          participant.kind = input.value as Participant['kind']
        } else if (input instanceof HTMLInputElement && input.type === 'color') {
          participant.color = input.value
        } else {
          // @ts-expect-error dynamic
          participant[field] = input.value
        }
        this.render()
      }
      input.addEventListener('input', handler)
      input.addEventListener('change', handler)
    })

    this.propertyPane.querySelector('[data-action="add-link"]')?.addEventListener('click', () => {
      participant.links.push({ id: createId('link'), label: 'Docs', url: 'https://example.com' })
      this.render()
    })

    this.propertyPane.querySelectorAll('.link-row').forEach((row) => {
      const linkId = row.getAttribute('data-link-id')!
      const link = participant.links.find((entry) => entry.id === linkId)
      if (!link) return
      row.querySelectorAll<HTMLInputElement>('[data-link-field]').forEach((input) => {
        const field = input.dataset.linkField as keyof ParticipantLink
        input.addEventListener('input', () => {
          link[field] = input.value
          this.renderMermaid()
        })
      })
      row.querySelector('[data-action="remove-link"]')?.addEventListener('click', () => {
        participant.links = participant.links.filter((entry) => entry.id !== linkId)
        this.render()
      })
    })
  }

  private renderMessageForm(message: Message) {
    const participantOptions = (selectedId: string) =>
      this.state.participants
        .map(
          (participant) => `
            <option value="${participant.id}" ${participant.id === selectedId ? 'selected' : ''}>${escapeHtml(participant.name)}</option>
          `
        )
        .join('')

    const arrowOptions = ARROW_OPTIONS.map(
      (arrow) => `<option value="${arrow.id}" ${arrow.id === message.arrow ? 'selected' : ''}>${arrow.id} – ${arrow.label}</option>`
    ).join('')

    const minY = METRICS.headerHeight
    const maxY = METRICS.headerHeight + this.state.settings.height

    return `
      <section>
        <h2>Message</h2>
        <label>From
          <select data-field="fromId">${participantOptions(message.fromId)}</select>
        </label>
        <label>To
          <select data-field="toId">${participantOptions(message.toId)}</select>
        </label>
        <label>Arrow type
          <select data-field="arrow">${arrowOptions}</select>
        </label>
        <label>Text
          <textarea data-field="text">${escapeHtml(message.text)}</textarea>
        </label>
        <label>Vertical position
          <input type="range" data-field="y" min="${minY}" max="${maxY}" value="${message.y}" />
        </label>
        <div class="grid-two">
          <label class="checkbox"><input type="checkbox" data-field="activateSource" ${message.activateSource ? 'checked' : ''}/> Activate source (+)</label>
          <label class="checkbox"><input type="checkbox" data-field="deactivateSource" ${message.deactivateSource ? 'checked' : ''}/> Deactivate source (-)</label>
          <label class="checkbox"><input type="checkbox" data-field="activateTarget" ${message.activateTarget ? 'checked' : ''}/> Activate target (+)</label>
          <label class="checkbox"><input type="checkbox" data-field="deactivateTarget" ${message.deactivateTarget ? 'checked' : ''}/> Deactivate target (-)</label>
        </div>
      </section>
    `
  }

  private bindMessageForm(message: Message) {
    this.propertyPane.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[data-field]').forEach((input) => {
      const field = input.dataset.field as keyof Message
      const handler = () => {
        if (input instanceof HTMLInputElement && input.type === 'checkbox') {
          // @ts-expect-error dynamic
          message[field] = input.checked
        } else if (input instanceof HTMLInputElement && input.type === 'range') {
          message.y = Number(input.value)
        } else if (field === 'fromId' || field === 'toId' || field === 'arrow') {
          // @ts-expect-error dynamic
          message[field] = input.value
        } else {
          // @ts-expect-error dynamic
          message[field] = input.value
        }
        this.render()
      }
      input.addEventListener('input', handler)
      input.addEventListener('change', handler)
    })
  }

  private renderNoteForm(note: Note) {
    const targetOptions = this.state.participants
      .map(
        (participant) => `
          <option value="${participant.id}" ${note.targetIds.includes(participant.id) ? 'selected' : ''}>${escapeHtml(participant.name)}</option>
        `
      )
      .join('')

    const placementOptions = NOTE_PLACEMENTS.map(
      (placement) => `<option value="${placement.id}" ${placement.id === note.placement ? 'selected' : ''}>${placement.label}</option>`
    ).join('')

    const selectSize = Math.max(1, Math.min(4, this.state.participants.length || 1))

    return `
      <section>
        <h2>Note</h2>
        <label>Targets (Ctrl/Cmd+click for multiple)
          <select multiple size="${selectSize}" data-field="targetIds">${targetOptions}</select>
        </label>
        <label>Placement
          <select data-field="placement">${placementOptions}</select>
        </label>
        <label>Text
          <textarea data-field="text">${escapeHtml(note.text)}</textarea>
        </label>
        <label>Height (px)
          <input type="number" min="50" max="200" data-field="height" value="${note.height}" />
        </label>
      </section>
    `
  }

  private bindNoteForm(note: Note) {
    this.propertyPane.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[data-field]').forEach((input) => {
      const field = input.dataset.field as keyof Note
      const handler = () => {
        if (field === 'targetIds' && input instanceof HTMLSelectElement && input.multiple) {
          note.targetIds = Array.from(input.selectedOptions).map((option) => option.value)
        } else if (input instanceof HTMLInputElement && input.type === 'number') {
          note.height = Number(input.value)
        } else {
          // @ts-expect-error dynamic
          note[field] = input.value
        }
        this.render()
      }
      input.addEventListener('input', handler)
      input.addEventListener('change', handler)
    })
  }

  private renderBlockForm(block: Block) {
    const blockOptions = BLOCK_TYPES.map(
      (definition) => `<option value="${definition.id}" ${definition.id === block.kind ? 'selected' : ''}>${definition.label}</option>`
    ).join('')

    return `
      <section>
        <h2>Block / Region</h2>
        <label>Kind
          <select data-field="kind">${blockOptions}</select>
        </label>
        <label>Label
          <input type="text" data-field="label" value="${escapeAttr(block.label)}" />
        </label>
        <label>Color
          <input type="color" data-field="color" value="${this.toColorValue(block.color)}" />
        </label>
        <label>Width
          <input type="number" data-field="width" min="40" max="${this.state.settings.width}" value="${Math.round(block.width)}" />
        </label>
        <label>Height
          <input type="number" data-field="height" min="40" max="${this.state.settings.height}" value="${Math.round(block.height)}" />
        </label>
      </section>
    `
  }

  private bindBlockForm(block: Block) {
    this.propertyPane.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-field]').forEach((input) => {
      const field = input.dataset.field as keyof Block
      const handler = () => {
        if (field === 'kind') {
          block.kind = input.value as BlockKind
        } else if (field === 'color') {
          block.color = input.value
        } else if (input instanceof HTMLInputElement && input.type === 'number') {
          block[field] = Number(input.value) as never
        } else {
          // @ts-expect-error dynamic
          block[field] = input.value
        }
        this.render()
      }
      input.addEventListener('input', handler)
      input.addEventListener('change', handler)
    })
  }

  private toColorValue(color: string) {
    if (color.startsWith('#')) {
      return color
    }
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
    if (match) {
      const [r, g, b] = match.slice(1, 4).map((value) => Number(value).toString(16).padStart(2, '0'))
      return `#${r}${g}${b}`
    }
    return '#bfdbfe'
  }

  private renderMermaid() {
    const lines: string[] = ['sequenceDiagram']
    if (this.state.settings.autonumber) {
      lines.push('autonumber')
    }
    if (this.state.settings.mirrorActors) {
      lines.push('mirrorActors')
    }

    this.state.participants
      .slice()
      .sort((a, b) => a.x - b.x)
      .forEach((participant) => {
        const alias = participant.label !== participant.name ? ` as ${participant.label}` : ''
        lines.push(`${participant.kind} ${participant.name}${alias}`)
        if (participant.created) {
          lines.push(`create ${participant.kind} ${participant.name}`)
        }
        if (participant.destroyed) {
          lines.push(`destroy ${participant.name}`)
        }
        participant.links.forEach((link) => {
          lines.push(`link ${participant.name}: ${link.label} @ ${link.url}`)
        })
      })

    type TimelineEvent =
      | { type: 'message'; y: number; payload: Message }
      | { type: 'note'; y: number; payload: Note }
      | { type: 'block-start'; y: number; payload: Block }
      | { type: 'block-end'; y: number; payload: Block }

    const events: TimelineEvent[] = []
    this.state.messages.forEach((message) => events.push({ type: 'message', y: message.y, payload: message }))
    this.state.notes.forEach((note) => events.push({ type: 'note', y: note.y, payload: note }))
    this.state.blocks.forEach((block) => {
      events.push({ type: 'block-start', y: block.y, payload: block })
      events.push({ type: 'block-end', y: block.y + block.height, payload: block })
    })

    const priority: Record<TimelineEvent['type'], number> = {
      'block-start': 0,
      message: 1,
      note: 2,
      'block-end': 3
    }

    events.sort((a, b) => (a.y === b.y ? priority[a.type] - priority[b.type] : a.y - b.y))

    events.forEach((event) => {
      if (event.type === 'message') {
        const message = event.payload
        const from = this.findParticipant(message.fromId)?.name ?? 'Unknown'
        const to = this.findParticipant(message.toId)?.name ?? 'Unknown'
        const sourceSuffix = message.activateSource ? '+' : message.deactivateSource ? '-' : ''
        const targetSuffix = message.activateTarget ? '+' : message.deactivateTarget ? '-' : ''
        const text = message.text ? `: ${message.text}` : ''
        lines.push(`${from}${sourceSuffix}${message.arrow}${targetSuffix}${to}${text}`)
      }

      if (event.type === 'note') {
        const note = event.payload
        const targets = note.targetIds.map((id) => this.findParticipant(id)?.name).filter(Boolean).join(',')
        if (!targets) return
        const prefix = note.placement === 'over' ? 'Note over' : `Note ${note.placement} of`
        lines.push(`${prefix} ${targets}: ${note.text}`)
      }

      if (event.type === 'block-start') {
        const block = event.payload
        if (block.kind === 'rect') {
          lines.push(`rect ${block.color}`)
        } else {
          lines.push(`${block.kind} ${block.label}`)
        }
      }

      if (event.type === 'block-end') {
        lines.push('end')
      }
    })

    this.mermaidOutput.textContent = lines.join('\n')
  }

  private copyMermaid() {
    const text = this.mermaidOutput.textContent ?? ''
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => this.flashCopyState('Copied!'))
        .catch(() => this.flashCopyState('Copy failed'))
      return
    }
    try {
      const temp = document.createElement('textarea')
      temp.value = text
      document.body.appendChild(temp)
      temp.select()
      document.execCommand('copy')
      document.body.removeChild(temp)
      this.flashCopyState('Copied!')
    } catch (error) {
      this.flashCopyState('Copy failed')
    }
  }

  private flashCopyState(label: string) {
    const previous = this.copyButton.textContent
    this.copyButton.textContent = label
    setTimeout(() => {
      this.copyButton.textContent = previous
    }, 1200)
  }

  private getSvgPoint(event: PointerEvent) {
    const rect = this.svg.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }

  private findParticipant(id: string) {
    return this.state.participants.find((participant) => participant.id === id)
  }

  private findMessage(id: string) {
    return this.state.messages.find((message) => message.id === id)
  }

  private findNote(id: string) {
    return this.state.notes.find((note) => note.id === id)
  }

  private findBlock(id: string) {
    return this.state.blocks.find((block) => block.id === id)
  }
}

const root = document.querySelector<HTMLDivElement>('#app')
if (root) {
  new SequenceEditor(root)
}
