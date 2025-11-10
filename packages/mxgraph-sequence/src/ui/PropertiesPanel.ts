export interface PropertyField {
  label: string
  key: string
  type: 'text' | 'select' | 'checkbox'
  options?: { value: string; label: string }[]
  value?: any
}

export class PropertiesPanel {
  private container: HTMLElement
  private currentElement: any = null
  private onPropertyChange?: (element: any, key: string, value: any) => void

  constructor(
    container: HTMLElement,
    onPropertyChange?: (element: any, key: string, value: any) => void
  ) {
    this.container = container
    this.onPropertyChange = onPropertyChange
    this.showEmptyState()
  }

  showEmptyState(): void {
    this.container.innerHTML = `
      <div class="properties-empty">
        <p>Select an element to view properties</p>
      </div>
    `
  }

  showProperties(element: any, fields: PropertyField[]): void {
    this.currentElement = element

    let html = '<div class="properties-content">'
    html += '<h3>Properties</h3>'

    fields.forEach(field => {
      html += this.renderField(field)
    })

    html += '</div>'

    this.container.innerHTML = html

    // Attach event listeners
    fields.forEach(field => {
      const input = this.container.querySelector(`[data-key="${field.key}"]`) as HTMLInputElement
      if (input) {
        input.addEventListener('change', (e) => {
          const target = e.target as HTMLInputElement
          const value = field.type === 'checkbox' ? target.checked : target.value
          if (this.onPropertyChange && this.currentElement) {
            this.onPropertyChange(this.currentElement, field.key, value)
          }
        })
      }
    })
  }

  private renderField(field: PropertyField): string {
    let html = `<div class="property-field">`
    html += `<label>${field.label}</label>`

    switch (field.type) {
      case 'text':
        html += `<input type="text" data-key="${field.key}" value="${field.value || ''}" />`
        break
      case 'select':
        html += `<select data-key="${field.key}">`
        field.options?.forEach(opt => {
          const selected = opt.value === field.value ? 'selected' : ''
          html += `<option value="${opt.value}" ${selected}>${opt.label}</option>`
        })
        html += `</select>`
        break
      case 'checkbox':
        const checked = field.value ? 'checked' : ''
        html += `<input type="checkbox" data-key="${field.key}" ${checked} />`
        break
    }

    html += `</div>`
    return html
  }
}
