import { MxGraphRenderer } from '../renderer/MxGraphRenderer'

declare const mxUtils: any
declare const mxEvent: any
declare const mxCell: any
declare const mxGeometry: any

export class Toolbar {
  private container: HTMLElement
  private renderer: MxGraphRenderer
  private onElementAdd?: (type: string, data: any) => void

  constructor(
    container: HTMLElement,
    renderer: MxGraphRenderer,
    onElementAdd?: (type: string, data: any) => void
  ) {
    this.container = container
    this.renderer = renderer
    this.onElementAdd = onElementAdd

    this.setupToolbar()
  }

  private setupToolbar(): void {
    this.container.innerHTML = ''

    // Create toolbar items
    this.addToolbarItem('Participant', 'participant', this.createParticipantIcon())
    this.addToolbarItem('Actor', 'actor', this.createActorIcon())
    this.addToolbarItem('Note', 'note', this.createNoteIcon())
    this.addSeparator()
    this.addToolbarItem('Loop', 'loop', this.createLoopIcon())
    this.addToolbarItem('Alt', 'alt', this.createAltIcon())
    this.addToolbarItem('Opt', 'opt', this.createOptIcon())
  }

  private addToolbarItem(label: string, type: string, icon: HTMLElement): void {
    const item = document.createElement('div')
    item.className = 'toolbar-item'
    item.title = label
    item.draggable = true

    item.appendChild(icon)

    const labelEl = document.createElement('div')
    labelEl.className = 'toolbar-item-label'
    labelEl.textContent = label
    item.appendChild(labelEl)

    // Setup drag behavior
    item.addEventListener('dragstart', (evt) => {
      if (evt.dataTransfer) {
        evt.dataTransfer.effectAllowed = 'copy'
        evt.dataTransfer.setData('application/json', JSON.stringify({
          type: type,
          label: label
        }))
      }
    })

    this.container.appendChild(item)
  }

  private addSeparator(): void {
    const sep = document.createElement('div')
    sep.className = 'toolbar-separator'
    this.container.appendChild(sep)
  }

  private createParticipantIcon(): HTMLElement {
    const icon = document.createElement('div')
    icon.className = 'icon-participant'
    icon.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 40 40">
        <rect x="5" y="5" width="30" height="30" rx="4" fill="#E8F5E9" stroke="#4CAF50" stroke-width="2"/>
        <text x="20" y="25" text-anchor="middle" font-size="12" fill="#000">P</text>
      </svg>
    `
    return icon
  }

  private createActorIcon(): HTMLElement {
    const icon = document.createElement('div')
    icon.className = 'icon-actor'
    icon.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="12" r="4" fill="#E3F2FD" stroke="#2196F3" stroke-width="2"/>
        <line x1="20" y1="16" x2="20" y2="26" stroke="#2196F3" stroke-width="2"/>
        <line x1="20" y1="20" x2="12" y2="16" stroke="#2196F3" stroke-width="2"/>
        <line x1="20" y1="20" x2="28" y2="16" stroke="#2196F3" stroke-width="2"/>
        <line x1="20" y1="26" x2="14" y2="34" stroke="#2196F3" stroke-width="2"/>
        <line x1="20" y1="26" x2="26" y2="34" stroke="#2196F3" stroke-width="2"/>
      </svg>
    `
    return icon
  }

  private createNoteIcon(): HTMLElement {
    const icon = document.createElement('div')
    icon.className = 'icon-note'
    icon.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 40 40">
        <rect x="8" y="8" width="24" height="24" fill="#FFF9C4" stroke="#F57F17" stroke-width="2"/>
        <line x1="12" y1="16" x2="28" y2="16" stroke="#F57F17" stroke-width="1"/>
        <line x1="12" y1="20" x2="28" y2="20" stroke="#F57F17" stroke-width="1"/>
        <line x1="12" y1="24" x2="24" y2="24" stroke="#F57F17" stroke-width="1"/>
      </svg>
    `
    return icon
  }

  private createLoopIcon(): HTMLElement {
    const icon = document.createElement('div')
    icon.className = 'icon-loop'
    icon.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 40 40">
        <rect x="6" y="6" width="28" height="28" fill="none" stroke="#757575" stroke-width="2" stroke-dasharray="4,2"/>
        <text x="20" y="24" text-anchor="middle" font-size="10" fill="#757575">loop</text>
      </svg>
    `
    return icon
  }

  private createAltIcon(): HTMLElement {
    const icon = document.createElement('div')
    icon.className = 'icon-alt'
    icon.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 40 40">
        <rect x="6" y="6" width="28" height="28" fill="none" stroke="#757575" stroke-width="2" stroke-dasharray="4,2"/>
        <line x1="6" y1="20" x2="34" y2="20" stroke="#757575" stroke-width="1" stroke-dasharray="2,2"/>
        <text x="20" y="15" text-anchor="middle" font-size="9" fill="#757575">alt</text>
      </svg>
    `
    return icon
  }

  private createOptIcon(): HTMLElement {
    const icon = document.createElement('div')
    icon.className = 'icon-opt'
    icon.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 40 40">
        <rect x="6" y="6" width="28" height="28" fill="none" stroke="#757575" stroke-width="2" stroke-dasharray="4,2"/>
        <text x="20" y="24" text-anchor="middle" font-size="10" fill="#757575">opt</text>
      </svg>
    `
    return icon
  }
}
