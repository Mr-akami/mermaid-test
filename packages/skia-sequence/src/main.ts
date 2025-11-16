import './style.css'

import CanvasKitInit, { type CanvasKit, type Font, type Paint, type PathEffect, type Surface } from 'canvaskit-wasm/bin/full/canvaskit.js'
import canvaskitWasmUrl from 'canvaskit-wasm/bin/full/canvaskit.wasm?url'

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
  | { type: 'block-draft'; startX: number; startY: number; currentX: number; currentY: number }

type MessageAnchor = { participantId: string; y: number }

interface Point {
  x: number
  y: number
}

type SkiaCanvas = ReturnType<Surface['getCanvas']>

const TOOL_LABELS: Record<ToolMode, string> = {
  select: 'Select / Move',
  participant: 'Participant',
  actor: 'Actor',
  message: 'Message',
  note: 'Note',
  block: 'Block'
}

const ARROW_OPTIONS: Array<{ id: ArrowType; label: string; dashed: boolean; variant: 'plain' | 'arrow' | 'cross' | 'open' }> = [
  { id: '->', label: 'Solid line', dashed: false, variant: 'plain' },
  { id: '-->', label: 'Dashed line', dashed: true, variant: 'plain' },
  { id: '->>', label: 'Sync call', dashed: false, variant: 'arrow' },
  { id: '-->>', label: 'Async call', dashed: true, variant: 'arrow' },
  { id: '<<->>', label: 'Bidirectional', dashed: false, variant: 'arrow' },
  { id: '<<-->>', label: 'Bidirectional dashed', dashed: true, variant: 'arrow' },
  { id: '-x', label: 'Destroy (solid)', dashed: false, variant: 'cross' },
  { id: '--x', label: 'Destroy (dashed)', dashed: true, variant: 'cross' },
  { id: '-)', label: 'Open arrow', dashed: false, variant: 'open' },
  { id: '--))', label: 'Open arrow dashed', dashed: true, variant: 'open' }
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
  participantCardHeight: 60,
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

const splitAlias = (value: string) => value.split(/<br\s*\/?>/gi)

const toMermaidColor = (value: string) => {
  const hex = value.trim()
  const match = hex.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!match) {
    return value
  }
  let raw = match[1]
  if (raw.length === 3) {
    raw = raw
      .split('')
      .map((char) => char + char)
      .join('')
  }
  const r = parseInt(raw.slice(0, 2), 16)
  const g = parseInt(raw.slice(2, 4), 16)
  const b = parseInt(raw.slice(4, 6), 16)
  return `rgb(${r},${g},${b})`
}

class SkiaSequenceEditor {
  private root: HTMLElement
  private canvas: HTMLCanvasElement
  private propertyPane: HTMLElement
  private mermaidOutput: HTMLElement
  private toolbarButtons: NodeListOf<HTMLButtonElement>
  private deleteButton: HTMLButtonElement
  private copyButton: HTMLButtonElement

  private state: AppState
  private dragState: DragState | null = null
  private pendingAnchor: MessageAnchor | null = null

  private ck: CanvasKit | null = null
  private surface: Surface | null = null
  private basePaint: Paint | null = null
  private textPaint: Paint | null = null
  private notePaint: Paint | null = null
  private blockPaint: Paint | null = null
  private font: Font | null = null
  private smallFont: Font | null = null
  private dashedEffect: PathEffect | null = null
  private canvasScale = 1

  constructor(root: HTMLElement) {
    this.root = root
    this.root.innerHTML = this.createLayout()

    this.canvas = this.root.querySelector('#skiaCanvas') as HTMLCanvasElement
    this.propertyPane = this.root.querySelector('[data-properties]') as HTMLElement
    this.mermaidOutput = this.root.querySelector('[data-mermaid-output]') as HTMLElement
    this.toolbarButtons = this.root.querySelectorAll('[data-tool]') as NodeListOf<HTMLButtonElement>
    this.deleteButton = this.root.querySelector('[data-delete-selection]') as HTMLButtonElement
    this.copyButton = this.root.querySelector('[data-copy-mermaid]') as HTMLButtonElement

    this.state = this.createInitialState()

    this.bindEvents()
    this.render()
    void this.bootstrapSkia()
  }

  private createLayout() {
    const buttons = (Object.keys(TOOL_LABELS) as ToolMode[])
      .map((tool) => `<button type="button" class="tool-btn" data-tool="${tool}">${TOOL_LABELS[tool]}</button>`)
      .join('')

    return `
      <div class="app-shell">
        <aside class="toolbar">
          <header>
            <h1>Skia Sequence Editor</h1>
            <p>Draw Mermaid sequence flows with CanvasKit rendering.</p>
          </header>
          <div class="tool-grid">${buttons}</div>
          <p class="hint">Pick a tool, click the canvas to create shapes, drag to adjust, edit via the property panel.</p>
          <button type="button" class="danger-btn" data-delete-selection>Delete Selected</button>
        </aside>
        <section class="canvas-panel">
          <canvas id="skiaCanvas" class="diagram-canvas"></canvas>
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
        x: 220,
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
        x: 520,
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
        y: METRICS.headerHeight + 120,
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

    this.canvas.addEventListener('pointerdown', (event) => this.onPointerDown(event))
    window.addEventListener('pointermove', (event) => this.onPointerMove(event))
    window.addEventListener('pointerup', () => this.onPointerUp())
    window.addEventListener('keydown', (event) => this.onKeyDown(event))
  }

  private async bootstrapSkia() {
    try {
      this.resizeCanvas()
      console.log('[Skia] Starting CanvasKitInit')
      const ck = await CanvasKitInit({
        locateFile: (file: string) => {
          if (file === 'canvaskit.wasm') {
            return canvaskitWasmUrl
          }
          return `https://unpkg.com/canvaskit-wasm@0.40.0/bin/full/${file}`
        }
      })
      this.ck = ck
      console.log('[Skia] CanvasKit initialized: ', { canvasId: this.canvas.id, ck })
      this.recreateSurface()

      const paint = new ck.Paint()
      paint.setAntiAlias(true)
      paint.setStyle(ck.PaintStyle.Stroke)
      paint.setStrokeWidth(2)
      paint.setColor(ck.parseColorString('#0f172a'))

      const textPaint = new ck.Paint()
      textPaint.setAntiAlias(true)
      textPaint.setStyle(ck.PaintStyle.Fill)
      textPaint.setColor(ck.parseColorString('#0f172a'))

      const notePaint = new ck.Paint()
      notePaint.setAntiAlias(true)
      notePaint.setStyle(ck.PaintStyle.Fill)

      const blockPaint = new ck.Paint()
      blockPaint.setAntiAlias(true)
      blockPaint.setStyle(ck.PaintStyle.Stroke)
      blockPaint.setStrokeWidth(2)

      const font = new ck.Font(null, 18)
      const smallFont = new ck.Font(null, 14)

      const dashedEffect = ck.PathEffect.MakeDash([12, 8], 0)

      this.basePaint = paint
      this.textPaint = textPaint
      this.notePaint = notePaint
      this.blockPaint = blockPaint
      this.font = font
      this.smallFont = smallFont
      this.dashedEffect = dashedEffect

      this.renderCanvas()
    } catch (error) {
      console.error('CanvasKit initialization failed', error)
      console.log('[Skia] CanvasKit init stack', (error as Error).stack)
      this.mermaidOutput.textContent = 'Failed to initialize CanvasKit. See console for details.'
    }
  }

  private resizeCanvas() {
    const { width, height } = this.state.settings
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = Math.floor(width * dpr)
    this.canvas.height = Math.floor(height * dpr)
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.canvasScale = dpr

    if (this.ck) {
      this.recreateSurface()
    }
  }

  private setTool(tool: ToolMode) {
    this.state.tool = tool
    if (tool !== 'message') {
      this.pendingAnchor = null
    }
    this.render()
  }

  private setSelection(selection: Selection | null) {
    this.state.selection = selection
    this.renderProperties()
    this.renderCanvas()
  }

  private onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.pendingAnchor = null
      this.setTool('select')
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && this.state.selection) {
      this.deleteSelection()
    }
  }

  private getPointerPosition(event: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / (rect.width || 1)) * this.state.settings.width
    const y = ((event.clientY - rect.top) / (rect.height || 1)) * this.state.settings.height
    return { x, y }
  }

  private onPointerDown(event: PointerEvent) {
    const point = this.getPointerPosition(event)

    if (this.state.tool === 'block') {
      this.dragState = { type: 'block-draft', startX: point.x, startY: point.y, currentX: point.x, currentY: point.y }
      event.preventDefault()
      return
    }

    if (this.state.tool === 'participant' || this.state.tool === 'actor') {
      const existing = this.hitParticipant(point)
      if (!existing) {
        this.createParticipantAt(point.x, this.state.tool)
        event.preventDefault()
        return
      }
    }

    const blockHandle = this.hitBlockHandle(point)
    if (blockHandle) {
      this.setSelection({ type: 'block', id: blockHandle.block.id })
      this.dragState = {
        type: 'block-handle',
        id: blockHandle.block.id,
        handle: blockHandle.handle,
        startX: point.x,
        startY: point.y,
        original: { ...blockHandle.block }
      }
      event.preventDefault()
      return
    }

    const participant = this.hitParticipant(point)
    if (participant) {
      if (this.state.tool === 'message') {
        this.handleMessageAnchor(participant.id, point.y)
        event.preventDefault()
        return
      }

      if (this.state.tool === 'note') {
        this.createNoteFromClick(participant, point)
        event.preventDefault()
        return
      }

      this.setSelection({ type: 'participant', id: participant.id })
      this.dragState = { type: 'participant', id: participant.id, offsetX: point.x - participant.x }
      event.preventDefault()
      return
    }

    const message = this.hitMessage(point)
    if (message) {
      this.setSelection({ type: 'message', id: message.id })
      this.dragState = { type: 'message', id: message.id, offsetY: point.y - message.y }
      event.preventDefault()
      return
    }

    const note = this.hitNote(point)
    if (note) {
      this.setSelection({ type: 'note', id: note.id })
      this.dragState = { type: 'note', id: note.id, offsetY: point.y - note.y }
      event.preventDefault()
      return
    }

    const block = this.hitBlock(point)
    if (block) {
      this.setSelection({ type: 'block', id: block.id })
      this.dragState = { type: 'block', id: block.id, offsetX: point.x - block.x, offsetY: point.y - block.y }
      event.preventDefault()
      return
    }

    this.setSelection(null)
  }

  private onPointerMove(event: PointerEvent) {
    if (!this.dragState) {
      return
    }
    const point = this.getPointerPosition(event)

    switch (this.dragState.type) {
      case 'participant': {
        const participant = this.findParticipant(this.dragState.id)
        if (!participant) break
        participant.x = clamp(point.x - this.dragState.offsetX, METRICS.participantWidth, this.state.settings.width - METRICS.participantWidth)
        this.renderCanvas()
        break
      }
      case 'message': {
        const message = this.findMessage(this.dragState.id)
        if (!message) break
        message.y = clamp(point.y - this.dragState.offsetY, METRICS.headerHeight + 40, this.state.settings.height - METRICS.footerPadding)
        this.renderCanvas()
        break
      }
      case 'note': {
        const note = this.findNote(this.dragState.id)
        if (!note) break
        note.y = clamp(point.y - this.dragState.offsetY, METRICS.headerHeight + 40, this.state.settings.height - METRICS.footerPadding - note.height)
        this.renderCanvas()
        break
      }
      case 'block': {
        const block = this.findBlock(this.dragState.id)
        if (!block) break
        block.x = clamp(point.x - this.dragState.offsetX, 40, this.state.settings.width - block.width - 40)
        block.y = clamp(point.y - this.dragState.offsetY, METRICS.headerHeight + 20, this.state.settings.height - METRICS.footerPadding - block.height)
        this.renderCanvas()
        break
      }
      case 'block-handle': {
        const block = this.findBlock(this.dragState.id)
        if (!block) break
        const dx = point.x - this.dragState.startX
        const dy = point.y - this.dragState.startY
        const original = this.dragState.original
        if (this.dragState.handle === 'e') {
          block.width = clamp(original.width + dx, 80, this.state.settings.width - original.x - 40)
        } else if (this.dragState.handle === 'w') {
          const newWidth = clamp(original.width - dx, 80, original.width + original.x - 40)
          const diff = newWidth - original.width
          block.width = newWidth
          block.x = original.x - diff
        } else if (this.dragState.handle === 's') {
          block.height = clamp(original.height + dy, 60, this.state.settings.height - original.y - METRICS.footerPadding)
        } else if (this.dragState.handle === 'n') {
          const newHeight = clamp(original.height - dy, 60, original.height + original.y - METRICS.headerHeight)
          const diff = newHeight - original.height
          block.height = newHeight
          block.y = original.y - diff
        }
        this.renderCanvas()
        break
      }
      case 'block-draft': {
        this.dragState.currentX = point.x
        this.dragState.currentY = point.y
        this.renderCanvasDraft()
        break
      }
    }
  }

  private onPointerUp() {
    if (this.dragState?.type === 'block-draft') {
      const { startX, startY, currentX, currentY } = this.dragState
      const width = Math.abs(currentX - startX)
      const height = Math.abs(currentY - startY)
      if (width > 20 && height > 20) {
        const block: Block = {
          id: createId('block'),
          kind: 'loop',
          label: 'Block',
          color: '#a855f7',
          x: Math.min(startX, currentX),
          y: Math.min(startY, currentY),
          width,
          height
        }
        this.state.blocks.push(block)
        this.setSelection({ type: 'block', id: block.id })
      }
      this.dragState = null
      this.renderCanvas()
      return
    }

    this.dragState = null
  }

  private handleMessageAnchor(participantId: string, y: number) {
    if (!this.pendingAnchor) {
      this.pendingAnchor = { participantId, y }
      this.renderCanvas()
      return
    }

    const from = this.pendingAnchor.participantId
    const to = participantId
    const message: Message = {
      id: createId('msg'),
      fromId: from,
      toId: to,
      y,
      text: 'Message',
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

  private createNoteFromClick(participant: Participant, point: Point) {
    const note: Note = {
      id: createId('note'),
      targetIds: [participant.id],
      placement: 'right',
      text: 'New note',
      y: clamp(point.y, METRICS.headerHeight + 20, this.state.settings.height - METRICS.footerPadding - 100),
      height: 100
    }

    this.state.notes.push(note)
    this.setSelection({ type: 'note', id: note.id })
    this.render()
  }

  private hitParticipant(point: Point): Participant | null {
    const top = 40
    const bottom = top + METRICS.participantCardHeight
    const half = METRICS.participantWidth / 2
    return (
      this.state.participants.find((participant) => {
        const left = participant.x - half
        const right = participant.x + half
        return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom
      }) || null
    )
  }

  private hitMessage(point: Point): Message | null {
    return (
      this.state.messages.find((message) => {
        const from = this.findParticipant(message.fromId)
        const to = this.findParticipant(message.toId)
        if (!from || !to) return false
        const minX = Math.min(from.x, to.x)
        const maxX = Math.max(from.x, to.x)
        return point.x >= minX - 10 && point.x <= maxX + 10 && Math.abs(point.y - message.y) <= 10
      }) || null
    )
  }

  private hitNote(point: Point): Note | null {
    return (
      this.state.notes.find((note) => {
        const width = METRICS.noteWidth
        const left = this.getNoteX(note)
        const right = left + width
        const top = note.y
        const bottom = note.y + note.height
        return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom
      }) || null
    )
  }

  private hitBlock(point: Point): Block | null {
    return (
      this.state.blocks.find((block) => point.x >= block.x && point.x <= block.x + block.width && point.y >= block.y && point.y <= block.y + block.height) ||
      null
    )
  }

  private hitBlockHandle(point: Point): { block: Block; handle: 'n' | 's' | 'e' | 'w' } | null {
    const handles: Array<{ handle: 'n' | 's' | 'e' | 'w'; contains: (block: Block) => boolean }> = [
      { handle: 'n', contains: (block) => Math.abs(point.y - block.y) <= 8 && point.x >= block.x && point.x <= block.x + block.width },
      { handle: 's', contains: (block) => Math.abs(point.y - (block.y + block.height)) <= 8 && point.x >= block.x && point.x <= block.x + block.width },
      { handle: 'w', contains: (block) => Math.abs(point.x - block.x) <= 8 && point.y >= block.y && point.y <= block.y + block.height },
      { handle: 'e', contains: (block) => Math.abs(point.x - (block.x + block.width)) <= 8 && point.y >= block.y && point.y <= block.y + block.height }
    ]
    for (const block of this.state.blocks) {
      for (const entry of handles) {
        if (entry.contains(block)) {
          return { block, handle: entry.handle }
        }
      }
    }
    return null
  }

  private findParticipant(id: string) {
    return this.state.participants.find((participant) => participant.id === id) || null
  }

  private findMessage(id: string) {
    return this.state.messages.find((message) => message.id === id) || null
  }

  private findNote(id: string) {
    return this.state.notes.find((note) => note.id === id) || null
  }

  private findBlock(id: string) {
    return this.state.blocks.find((block) => block.id === id) || null
  }

  private createParticipantAt(x: number, mode: 'participant' | 'actor') {
    const clampedX = clamp(x, METRICS.participantWidth, this.state.settings.width - METRICS.participantWidth)
    const index = this.state.participants.length + 1
    const participant: Participant = {
      id: createId(mode),
      name: `${mode}-${index}`,
      label: mode === 'actor' ? `Actor ${index}` : `Participant ${index}`,
      kind: mode,
      x: clampedX,
      created: false,
      destroyed: false,
      color: mode === 'actor' ? '#fde68a' : '#bfdbfe',
      links: []
    }
    this.state.participants.push(participant)
    this.setSelection({ type: 'participant', id: participant.id })
    this.render()
  }

  private deleteSelection() {
    if (!this.state.selection) return

    const { type, id } = this.state.selection
    if (type === 'participant') {
      this.state.participants = this.state.participants.filter((participant) => participant.id !== id)
      this.state.messages = this.state.messages.filter((message) => message.fromId !== id && message.toId !== id)
      this.state.notes = this.state.notes.map((note) => ({ ...note, targetIds: note.targetIds.filter((targetId) => targetId !== id) }))
    } else if (type === 'message') {
      this.state.messages = this.state.messages.filter((message) => message.id !== id)
    } else if (type === 'note') {
      this.state.notes = this.state.notes.filter((note) => note.id !== id)
    } else if (type === 'block') {
      this.state.blocks = this.state.blocks.filter((block) => block.id !== id)
    }

    this.state.selection = null
    this.render()
  }

  private copyMermaid() {
    const text = this.toMermaid()
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.copyButton.textContent = 'Copied!'
        setTimeout(() => {
          this.copyButton.textContent = 'Copy'
        }, 1600)
      })
      .catch(() => {
        this.copyButton.textContent = 'Failed'
        setTimeout(() => {
          this.copyButton.textContent = 'Copy'
        }, 1600)
      })
  }

  private render() {
    this.renderToolbar()
    this.renderProperties()
    this.renderMermaid()
    this.renderCanvas()
  }

  private renderToolbar() {
    this.toolbarButtons.forEach((button) => {
      const tool = button.dataset.tool as ToolMode
      button.classList.toggle('is-active', tool === this.state.tool)
    })
    this.canvas.dataset.tool = this.state.tool
  }

  private recreateSurface() {
    if (!this.ck) return
    const canvasElement = this.canvas
    const canvasId = canvasElement.id || (canvasElement.id = createId('canvas'))
    const attempts: Array<{label:string; fn:() => Surface | null}> = [
      { label:'MakeCanvasSurface(element)', fn: () => this.ck!.MakeCanvasSurface(canvasElement) },
      { label:'MakeCanvasSurface(id)', fn: () => this.ck!.MakeCanvasSurface(canvasId) },
      { label:'MakeSWCanvasSurface(element)', fn: () => this.ck!.MakeSWCanvasSurface(canvasElement) },
      { label:'MakeSWCanvasSurface(id)', fn: () => this.ck!.MakeSWCanvasSurface(canvasId) }
    ]

    const errors: unknown[] = []
    let surface: Surface | null = null
    for (const attempt of attempts) {
      try {
        console.log(`[Skia] Trying ${attempt.label}`)
        surface = attempt.fn()
        console.log(`[Skia] Result ${attempt.label} ->`, !!surface)
        if (surface) break
      } catch (error) {
        console.error(`[Skia] ${attempt.label} threw`, error)
        errors.push(error)
      }
    }

    if (!surface) {
      console.error('CanvasKit surface creation attempts failed', errors)
      throw new Error('Unable to create CanvasKit surface')
    }

    this.surface?.dispose()
    this.surface = surface
  }

  private renderProperties() {
    const content = document.createElement('div')
    content.className = 'property-stack'
    content.appendChild(this.createSettingsSection())

    if (this.state.selection) {
      if (this.state.selection.type === 'participant') {
        const participant = this.findParticipant(this.state.selection.id)
        if (participant) {
          content.appendChild(this.createParticipantSection(participant))
        }
      } else if (this.state.selection.type === 'message') {
        const message = this.findMessage(this.state.selection.id)
        if (message) {
          content.appendChild(this.createMessageSection(message))
        }
      } else if (this.state.selection.type === 'note') {
        const note = this.findNote(this.state.selection.id)
        if (note) {
          content.appendChild(this.createNoteSection(note))
        }
      } else if (this.state.selection.type === 'block') {
        const block = this.findBlock(this.state.selection.id)
        if (block) {
          content.appendChild(this.createBlockSection(block))
        }
      }
    } else {
      const hint = document.createElement('p')
      hint.className = 'property-hint'
      hint.textContent = 'Select a participant, message, note, or block to edit its properties.'
      content.appendChild(hint)
    }

    this.propertyPane.innerHTML = ''
    this.propertyPane.appendChild(content)
  }

  private createSettingsSection() {
    const section = document.createElement('section')
    section.className = 'property-section'
    section.innerHTML = `
      <header>Diagram Settings</header>
      <label class="property-field">
        <span>Width</span>
        <input type="number" min="600" max="2000" step="10" value="${this.state.settings.width}" data-setting="width" />
      </label>
      <label class="property-field">
        <span>Height</span>
        <input type="number" min="600" max="1800" step="10" value="${this.state.settings.height}" data-setting="height" />
      </label>
      <label class="property-field checkbox">
        <input type="checkbox" data-setting="autonumber" ${this.state.settings.autonumber ? 'checked' : ''} />
        <span>Autonumber</span>
      </label>
      <label class="property-field checkbox">
        <input type="checkbox" data-setting="mirrorActors" ${this.state.settings.mirrorActors ? 'checked' : ''} />
        <span>Mirror actors top/bottom</span>
      </label>
    `

    section.querySelectorAll<HTMLInputElement>('[data-setting]').forEach((input) => {
      input.addEventListener('input', () => {
        const key = input.dataset.setting as keyof DiagramSettings
        if (input.type === 'checkbox') {
          this.state.settings[key] = input.checked as never
        } else if (input.type === 'number') {
          this.state.settings[key] = Number(input.value) as never
        }
        if (key === 'width' || key === 'height') {
          this.resizeCanvas()
        }
        this.render()
      })
    })

    return section
  }

  private createParticipantSection(participant: Participant) {
    const section = document.createElement('section')
    section.className = 'property-section'
    section.innerHTML = `
      <header>Participant</header>
      <label class="property-field">
        <span>Identifier</span>
        <input type="text" value="${participant.name}" data-participant-field="name" />
      </label>
      <label class="property-field">
        <span>Label (supports &lt;br/&gt;)</span>
        <input type="text" value="${participant.label}" data-participant-field="label" />
      </label>
      <label class="property-field">
        <span>Type</span>
        <select data-participant-field="kind">
          <option value="participant" ${participant.kind === 'participant' ? 'selected' : ''}>Participant</option>
          <option value="actor" ${participant.kind === 'actor' ? 'selected' : ''}>Actor</option>
        </select>
      </label>
      <label class="property-field">
        <span>Color</span>
        <input type="color" value="${participant.color}" data-participant-field="color" />
      </label>
      <label class="property-field checkbox">
        <input type="checkbox" data-participant-field="created" ${participant.created ? 'checked' : ''} />
        <span>Created mid-flow</span>
      </label>
      <label class="property-field checkbox">
        <input type="checkbox" data-participant-field="destroyed" ${participant.destroyed ? 'checked' : ''} />
        <span>Destroyed</span>
      </label>
      <div class="links-panel">
        <div class="links-panel__header">
          <span>Links</span>
          <button type="button" data-add-link>Add link</button>
        </div>
        <div data-links></div>
      </div>
    `

    section.querySelectorAll<HTMLElement>('[data-participant-field]').forEach((element) => {
      element.addEventListener('input', () => {
        const field = element.dataset.participantField as keyof Participant
        if (element instanceof HTMLInputElement && element.type === 'checkbox') {
          participant[field] = element.checked as never
        } else if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
          participant[field] = element.value as never
        }
        this.render()
      })
    })

    const linksContainer = section.querySelector('[data-links]') as HTMLElement
    participant.links.forEach((link) => {
      const row = document.createElement('div')
      row.className = 'link-row'
      row.innerHTML = `
        <input type="text" placeholder="Label" value="${link.label}" data-link-field="label" data-link-id="${link.id}" />
        <input type="url" placeholder="https://example.com" value="${link.url}" data-link-field="url" data-link-id="${link.id}" />
        <button type="button" data-remove-link="${link.id}">✕</button>
      `
      linksContainer.appendChild(row)
    })

    linksContainer.querySelectorAll<HTMLInputElement>('[data-link-field]').forEach((input) => {
      input.addEventListener('input', () => {
        const link = participant.links.find((item) => item.id === input.dataset.linkId)
        if (!link) return
        if (input.dataset.linkField === 'label') {
          link.label = input.value
        } else if (input.dataset.linkField === 'url') {
          link.url = input.value
        }
        this.renderMermaid()
      })
    })

    linksContainer.querySelectorAll<HTMLButtonElement>('[data-remove-link]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.removeLink
        participant.links = participant.links.filter((link) => link.id !== id)
        this.render()
      })
    })

    const addLinkButton = section.querySelector('[data-add-link]') as HTMLButtonElement
    addLinkButton.addEventListener('click', () => {
      participant.links.push({
        id: createId('link'),
        label: 'Label',
        url: 'https://example.com'
      })
      this.render()
    })

    return section
  }

  private createMessageSection(message: Message) {
    const section = document.createElement('section')
    section.className = 'property-section'
    const participantOptions = this.state.participants
      .map((participant) => `<option value="${participant.id}">${participant.label}</option>`)
      .join('')

    const arrowOptions = ARROW_OPTIONS.map(
      (option) => `<option value="${option.id}" ${option.id === message.arrow ? 'selected' : ''}>${option.label}</option>`
    ).join('')

    section.innerHTML = `
      <header>Message</header>
      <label class="property-field">
        <span>From</span>
        <select data-message-field="fromId">${participantOptions}</select>
      </label>
      <label class="property-field">
        <span>To</span>
        <select data-message-field="toId">${participantOptions}</select>
      </label>
      <label class="property-field">
        <span>Arrow</span>
        <select data-message-field="arrow">${arrowOptions}</select>
      </label>
      <label class="property-field">
        <span>Text (supports &lt;br/&gt;)</span>
        <textarea rows="3" data-message-field="text">${message.text}</textarea>
      </label>
      <div class="message-flags">
        <label><input type="checkbox" data-message-flag="activateSource" ${message.activateSource ? 'checked' : ''}/> Activate Source</label>
        <label><input type="checkbox" data-message-flag="deactivateSource" ${message.deactivateSource ? 'checked' : ''}/> Deactivate Source</label>
        <label><input type="checkbox" data-message-flag="activateTarget" ${message.activateTarget ? 'checked' : ''}/> Activate Target</label>
        <label><input type="checkbox" data-message-flag="deactivateTarget" ${message.deactivateTarget ? 'checked' : ''}/> Deactivate Target</label>
      </div>
    `

    section.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-message-field]').forEach((element) => {
      element.addEventListener('input', () => {
        const field = element.dataset.messageField as keyof Message
        message[field] = element.value as never
        this.render()
      })
      if (element instanceof HTMLSelectElement) {
        element.value = message[element.dataset.messageField as keyof Message] as string
      }
    })

    section.querySelectorAll<HTMLInputElement>('[data-message-flag]').forEach((checkbox) => {
      checkbox.addEventListener('input', () => {
        const field = checkbox.dataset.messageFlag as keyof Message
        message[field] = checkbox.checked as never
        this.render()
      })
    })

    section.querySelector<HTMLSelectElement>('[data-message-field="fromId"]')!.value = message.fromId
    section.querySelector<HTMLSelectElement>('[data-message-field="toId"]')!.value = message.toId

    return section
  }

  private createNoteSection(note: Note) {
    const section = document.createElement('section')
    section.className = 'property-section'
    const placementOptions = NOTE_PLACEMENTS.map(
      (option) => `<option value="${option.id}" ${option.id === note.placement ? 'selected' : ''}>${option.label}</option>`
    ).join('')

    const participantChoices = this.state.participants
      .map(
        (participant) => `
          <label class="checkbox">
            <input type="checkbox" data-note-target="${participant.id}" ${note.targetIds.includes(participant.id) ? 'checked' : ''}/>
            <span>${participant.label}</span>
          </label>
        `
      )
      .join('')

    section.innerHTML = `
      <header>Note</header>
      <label class="property-field">
        <span>Placement</span>
        <select data-note-field="placement">${placementOptions}</select>
      </label>
      <label class="property-field">
        <span>Text (supports &lt;br/&gt;)</span>
        <textarea rows="3" data-note-field="text">${note.text}</textarea>
      </label>
      <label class="property-field">
        <span>Height</span>
        <input type="number" min="60" max="240" value="${note.height}" data-note-field="height" />
      </label>
      <div class="note-targets">
        <span>Targets</span>
        ${participantChoices}
      </div>
    `

    section.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-note-field]').forEach((element) => {
      element.addEventListener('input', () => {
        const field = element.dataset.noteField as keyof Note
        if (element instanceof HTMLInputElement && element.type === 'number') {
          note[field] = Number(element.value) as never
        } else {
          note[field] = element.value as never
        }
        this.render()
      })
    })

    section.querySelectorAll<HTMLInputElement>('[data-note-target]').forEach((checkbox) => {
      checkbox.addEventListener('input', () => {
        const id = checkbox.dataset.noteTarget!
        if (checkbox.checked) {
          if (!note.targetIds.includes(id)) note.targetIds.push(id)
        } else {
          note.targetIds = note.targetIds.filter((targetId) => targetId !== id)
        }
        this.render()
      })
    })

    return section
  }

  private createBlockSection(block: Block) {
    const section = document.createElement('section')
    section.className = 'property-section'
    const kindOptions = BLOCK_TYPES.map(
      (option) => `<option value="${option.id}" ${option.id === block.kind ? 'selected' : ''}>${option.label}</option>`
    ).join('')

    section.innerHTML = `
      <header>Block</header>
      <label class="property-field">
        <span>Kind</span>
        <select data-block-field="kind">${kindOptions}</select>
      </label>
      <label class="property-field">
        <span>Label</span>
        <input type="text" data-block-field="label" value="${block.label}" />
      </label>
      <label class="property-field">
        <span>Color</span>
        <input type="color" data-block-field="color" value="${block.color}" />
      </label>
      <label class="property-field">
        <span>Width</span>
        <input type="number" min="80" value="${Math.round(block.width)}" data-block-field="width" />
      </label>
      <label class="property-field">
        <span>Height</span>
        <input type="number" min="60" value="${Math.round(block.height)}" data-block-field="height" />
      </label>
    `

    section.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-block-field]').forEach((element) => {
      element.addEventListener('input', () => {
        const field = element.dataset.blockField as keyof Block
        if (element instanceof HTMLInputElement && element.type === 'number') {
          block[field] = Number(element.value) as never
        } else {
          block[field] = element.value as never
        }
        this.render()
      })
    })

    return section
  }

  private renderMermaid() {
    this.mermaidOutput.textContent = this.toMermaid()
  }

  private renderCanvas() {
    if (
      !this.surface ||
      !this.ck ||
      !this.basePaint ||
      !this.textPaint ||
      !this.font ||
      !this.smallFont ||
      !this.notePaint ||
      !this.blockPaint
    ) {
      return
    }

    const canvas = this.surface.getCanvas()
    canvas.clear(this.ck.parseColorString('#f4f6fb'))
    canvas.save()
    canvas.scale(this.canvasScale, this.canvasScale)

    this.drawBackground(canvas)
    this.drawBlocks(canvas)
    this.drawParticipants(canvas)
    this.drawMessages(canvas)
    this.drawNotes(canvas)

    if (this.pendingAnchor) {
      this.drawPendingAnchor(canvas)
    }

    canvas.restore()
    this.surface.flush()
  }

  private renderCanvasDraft() {
    this.renderCanvas()
    if (!this.surface || !this.ck) return
    if (!this.dragState || this.dragState.type !== 'block-draft') return
    const canvas = this.surface.getCanvas()
    canvas.save()
    canvas.scale(this.canvasScale, this.canvasScale)
    const rect = this.ck.LTRBRect(this.dragState.startX, this.dragState.startY, this.dragState.currentX, this.dragState.currentY)
    const paint = new this.ck.Paint()
    paint.setStyle(this.ck.PaintStyle.Stroke)
    paint.setColor(this.ck.parseColorString('#a855f7'))
    paint.setStrokeWidth(1.5)
    paint.setAntiAlias(true)
    canvas.drawRect(rect, paint)
    paint.delete()
    canvas.restore()
    this.surface.flush()
  }

  private drawBackground(canvas: SkiaCanvas) {
    if (!this.ck || !this.basePaint) return
    const bgPaint = new this.ck.Paint()
    bgPaint.setStyle(this.ck.PaintStyle.Fill)
    bgPaint.setColor(this.ck.parseColorString('#ffffff'))
    const rect = this.ck.LTRBRect(0, 0, this.state.settings.width, this.state.settings.height)
    canvas.drawRect(rect, bgPaint)
    bgPaint.setColor(this.ck.parseColorString('#eef2ff'))
    const headerRect = this.ck.LTRBRect(0, 0, this.state.settings.width, METRICS.headerHeight)
    canvas.drawRect(headerRect, bgPaint)
    bgPaint.delete()
  }

  private drawParticipants(canvas: SkiaCanvas) {
    if (!this.ck || !this.basePaint || !this.textPaint || !this.font) return
    const half = METRICS.participantWidth / 2
    const lifelineTop = METRICS.headerHeight
    const lifelineBottom = this.state.settings.height - METRICS.footerPadding

    for (const participant of this.state.participants) {
      const isSelected = this.state.selection?.type === 'participant' && this.state.selection.id === participant.id
      const cardPaint = new this.ck.Paint()
      cardPaint.setStyle(this.ck.PaintStyle.Fill)
      cardPaint.setColor(this.ck.parseColorString(participant.color))
      cardPaint.setAntiAlias(true)

      const strokePaint = new this.ck.Paint()
      strokePaint.setStyle(this.ck.PaintStyle.Stroke)
      strokePaint.setColor(this.ck.parseColorString(isSelected ? '#2563eb' : '#0f172a'))
      strokePaint.setStrokeWidth(isSelected ? 2.4 : 1.6)
      strokePaint.setAntiAlias(true)

      const cardRect = this.ck.LTRBRect(participant.x - half, 40, participant.x + half, 40 + METRICS.participantCardHeight)
      canvas.drawRRect(this.ck.RRectXY(cardRect, 12, 12), cardPaint)
      canvas.drawRRect(this.ck.RRectXY(cardRect, 12, 12), strokePaint)

      const labelLines = splitAlias(participant.label)
      labelLines.forEach((line, index) => {
        canvas.drawText(line.trim(), participant.x - half + 12, 70 + index * 18, this.textPaint!, this.font!)
      })

      const lifelinePaint = new this.ck.Paint()
      lifelinePaint.setStyle(this.ck.PaintStyle.Stroke)
      lifelinePaint.setStrokeWidth(1.5)
      lifelinePaint.setColor(this.ck.parseColorString(isSelected ? '#38bdf8' : '#cbd5f5'))
      lifelinePaint.setPathEffect(this.dashedEffect)
      canvas.drawLine(participant.x, lifelineTop, participant.x, lifelineBottom, lifelinePaint)
      lifelinePaint.delete()

      if (participant.kind === 'actor') {
        this.drawActorIcon(canvas, participant.x, 40, isSelected)
      }

      cardPaint.delete()
      strokePaint.delete()
    }
  }

  private drawActorIcon(canvas: SkiaCanvas, x: number, top: number, highlighted: boolean) {
    if (!this.ck) return
    const paint = new this.ck.Paint()
    paint.setStyle(this.ck.PaintStyle.Stroke)
    paint.setStrokeWidth(2)
    paint.setColor(this.ck.parseColorString(highlighted ? '#1d4ed8' : '#0f172a'))
    paint.setAntiAlias(true)
    canvas.drawCircle(x, top - 12, 10, paint)
    canvas.drawLine(x, top - 2, x, top + 22, paint)
    canvas.drawLine(x - 14, top + 6, x + 14, top + 6, paint)
    canvas.drawLine(x, top + 22, x - 12, top + 40, paint)
    canvas.drawLine(x, top + 22, x + 12, top + 40, paint)
    paint.delete()
  }

  private drawMessages(canvas: SkiaCanvas) {
    if (!this.ck || !this.basePaint || !this.textPaint || !this.font) return

    for (const message of this.state.messages) {
      const from = this.findParticipant(message.fromId)
      const to = this.findParticipant(message.toId)
      if (!from || !to) continue

      const isSelected = this.state.selection?.type === 'message' && this.state.selection.id === message.id
      const paint = new this.ck.Paint()
      paint.setStyle(this.ck.PaintStyle.Stroke)
      paint.setAntiAlias(true)
      paint.setStrokeWidth(isSelected ? 3 : 2.2)
      paint.setColor(this.ck.parseColorString('#1f2937'))

      const arrowInfo = ARROW_OPTIONS.find((option) => option.id === message.arrow)!
      paint.setPathEffect(arrowInfo.dashed ? this.dashedEffect : null)

      const startX = from.x
      const endX = to.x
      canvas.drawLine(startX, message.y, endX, message.y, paint)

      this.drawArrowHead(canvas, message, startX, endX, arrowInfo.variant)
      const text = message.text
      if (text.trim()) {
        canvas.drawText(text, (startX + endX) / 2 - 50, message.y - 10, this.textPaint!, this.font!)
      }

      paint.delete()
    }
  }

  private drawArrowHead(canvas: SkiaCanvas, message: Message, startX: number, endX: number, variant: 'plain' | 'arrow' | 'cross' | 'open') {
    if (!this.ck) return
    const paint = new this.ck.Paint()
    paint.setAntiAlias(true)
    paint.setStyle(this.ck.PaintStyle.Stroke)
    paint.setColor(this.ck.parseColorString('#1f2937'))
    paint.setStrokeWidth(2.2)
    const direction = endX >= startX ? 1 : -1
    const tipX = endX
    const y = message.y

    switch (variant) {
      case 'arrow': {
        const path = new this.ck.Path()
        path.moveTo(tipX, y)
        path.lineTo(tipX - direction * 12, y - 6)
        path.moveTo(tipX, y)
        path.lineTo(tipX - direction * 12, y + 6)
        canvas.drawPath(path, paint)
        path.delete()
        break
      }
      case 'cross': {
        canvas.drawLine(tipX - direction * 8, y - 8, tipX + direction * 8, y + 8, paint)
        canvas.drawLine(tipX - direction * 8, y + 8, tipX + direction * 8, y - 8, paint)
        break
      }
      case 'open': {
        canvas.drawLine(tipX - direction * 12, y - 6, tipX, y, paint)
        canvas.drawLine(tipX - direction * 12, y + 6, tipX, y, paint)
        break
      }
      default:
        break
    }

    if (message.activateTarget || message.deactivateTarget) {
      const label = message.activateTarget ? '+' : '-'
      canvas.drawText(label, tipX + direction * 8, y - 12, this.textPaint!, this.smallFont!)
    }
    if (message.activateSource || message.deactivateSource) {
      const label = message.activateSource ? '+' : '-'
      canvas.drawText(label, startX - direction * 8, y + 18, this.textPaint!, this.smallFont!)
    }

    paint.delete()
  }

  private drawNotes(canvas: SkiaCanvas) {
    if (!this.ck || !this.notePaint || !this.textPaint || !this.font) return

    for (const note of this.state.notes) {
      const width = METRICS.noteWidth
      const x = this.getNoteX(note)
      const rect = this.ck.LTRBRect(x, note.y, x + width, note.y + note.height)

      this.notePaint.setColor(this.ck.parseColorString('#fefce8'))
      canvas.drawRRect(this.ck.RRectXY(rect, 12, 12), this.notePaint)

      const stroke = new this.ck.Paint()
      stroke.setStyle(this.ck.PaintStyle.Stroke)
      stroke.setAntiAlias(true)
      stroke.setColor(this.ck.parseColorString(this.state.selection?.type === 'note' && this.state.selection.id === note.id ? '#f59e0b' : '#fcd34d'))
      canvas.drawRRect(this.ck.RRectXY(rect, 12, 12), stroke)
      stroke.delete()

      const lines = splitAlias(note.text)
      lines.forEach((line, index) => {
        canvas.drawText(line.trim(), x + 16, note.y + 30 + index * 18, this.textPaint!, this.font!)
      })
    }
  }

  private drawBlocks(canvas: SkiaCanvas) {
    if (!this.ck || !this.blockPaint || !this.textPaint || !this.font) return

    for (const block of this.state.blocks) {
      const rect = this.ck.LTRBRect(block.x, block.y, block.x + block.width, block.y + block.height)
      this.blockPaint.setColor(this.ck.parseColorString(block.color))
      this.blockPaint.setStrokeWidth(this.state.selection?.type === 'block' && this.state.selection.id === block.id ? 3 : 2)
      canvas.drawRRect(this.ck.RRectXY(rect, 10, 10), this.blockPaint)

      canvas.drawText(`${block.kind} ${block.label}`.trim(), block.x + 12, block.y + 26, this.textPaint!, this.font!)

      if (this.state.selection?.type === 'block' && this.state.selection.id === block.id) {
        this.drawBlockHandles(block, canvas)
      }
    }
  }

  private drawBlockHandles(block: Block, canvas: SkiaCanvas) {
    if (!this.ck) return
    const ck = this.ck
    const points: Point[] = [
      { x: block.x + block.width / 2, y: block.y },
      { x: block.x + block.width / 2, y: block.y + block.height },
      { x: block.x, y: block.y + block.height / 2 },
      { x: block.x + block.width, y: block.y + block.height / 2 }
    ]
    const paint = new ck.Paint()
    paint.setStyle(ck.PaintStyle.Fill)
    paint.setAntiAlias(true)
    paint.setColor(ck.parseColorString('#1d4ed8'))
    points.forEach((point) => {
      const rect = ck.LTRBRect(point.x - 5, point.y - 5, point.x + 5, point.y + 5)
      canvas.drawRect(rect, paint)
    })
    paint.delete()
  }

  private drawPendingAnchor(canvas: SkiaCanvas) {
    if (!this.ck) return
    const anchor = this.pendingAnchor
    if (!anchor) return
    const participant = this.findParticipant(anchor.participantId)
    if (!participant) return

    const paint = new this.ck.Paint()
    paint.setStyle(this.ck.PaintStyle.Fill)
    paint.setColor(this.ck.parseColorString('#38bdf8'))
    canvas.drawCircle(participant.x, anchor.y, 6, paint)
    paint.delete()
  }

  private getNoteX(note: Note) {
    if (note.placement === 'over') {
      const targets = note.targetIds.map((id) => this.findParticipant(id)).filter(Boolean) as Participant[]
      if (targets.length >= 2) {
        const min = Math.min(...targets.map((participant) => participant.x))
        return min
      }
    }

    const target = this.findParticipant(note.targetIds[0])
    if (!target) return 100
    if (note.placement === 'left') {
      return target.x - METRICS.noteWidth - 40
    }
    if (note.placement === 'over') {
      return target.x - METRICS.noteWidth / 2
    }
    return target.x + 40
  }

  private toMermaid() {
    const lines: string[] = ['sequenceDiagram']

    if (this.state.settings.autonumber) {
      lines.push('autonumber')
    }

    for (const participant of this.state.participants) {
      const keyword = participant.kind === 'actor' ? 'actor' : 'participant'
      const alias = participant.label && participant.label !== participant.name ? ` as ${participant.label}` : ''
      lines.push(`${keyword} ${participant.name}${alias}`)
      participant.links.forEach((link) => {
        lines.push(`link ${participant.name}: ${link.label} @ ${link.url}`)
      })
    }

    for (const participant of this.state.participants) {
      if (participant.created) {
        lines.push(`create ${participant.kind} ${participant.name}`)
      }
      if (participant.destroyed) {
        lines.push(`destroy ${participant.name}`)
      }
    }

    const statements = [...this.state.messages]
      .sort((a, b) => a.y - b.y)
      .map((message) => {
        const from = this.findParticipant(message.fromId)
        const to = this.findParticipant(message.toId)
        if (!from || !to) return ''
        const start = `${message.activateSource ? '+' : message.deactivateSource ? '-' : ''}${from.name}`
        const end = `${message.activateTarget ? '+' : message.deactivateTarget ? '-' : ''}${to.name}`
        const text = message.text ? `: ${message.text}` : ''
        return `${start}${message.arrow}${end}${text}`
      })
      .filter(Boolean)

    lines.push(...statements)

    for (const note of this.state.notes) {
      if (!note.targetIds.length) continue
      const targets = note.targetIds.map((id) => this.findParticipant(id)?.name).filter(Boolean) as string[]
      if (!targets.length) continue
      const text = note.text.replace(/\n/g, '<br/>')
      if (note.placement === 'over' && targets.length >= 2) {
        lines.push(`Note over ${targets.join(',')}: ${text}`)
      } else {
        const placement = note.placement === 'left' ? 'left of' : 'right of'
        lines.push(`Note ${placement} ${targets[0]}: ${text}`)
      }
    }

    for (const block of this.state.blocks) {
      if (block.kind === 'rect') {
        lines.push(`rect ${toMermaidColor(block.color)}`)
        if (block.label.trim()) {
          lines.push(`%% ${block.label.trim()}`)
        }
        lines.push('end')
      } else {
        const label = block.label ? ` ${block.label}` : ''
        lines.push(`${block.kind}${label}`)
        lines.push('end')
      }
    }

    return lines.join('\n')
  }
}

const root = document.querySelector<HTMLDivElement>('#app')
if (root) {
  new SkiaSequenceEditor(root)
}
