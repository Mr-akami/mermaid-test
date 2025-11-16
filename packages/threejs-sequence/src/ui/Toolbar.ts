import type { DiagramModel } from '../model/DiagramModel';
import type { ParticipantType, ArrowType } from '../model/types';

export interface ToolbarOptions {
  onAddParticipant: (type: ParticipantType) => void;
  onAddMessage: (arrow: ArrowType) => void;
  onAddNote: () => void;
  onAddLoop: () => void;
  onAddAlt: () => void;
  onToggleAutoNumber: () => void;
  onExport: () => void;
}

/**
 * Toolbar provides UI controls for editing the diagram
 */
export class Toolbar {
  private element: HTMLElement;
  private model: DiagramModel;
  private options: ToolbarOptions;

  constructor(model: DiagramModel, options: ToolbarOptions) {
    this.model = model;
    this.options = options;
    this.element = this.createToolbar();
  }

  private createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'sequence-toolbar';
    toolbar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
      padding: 10px;
      display: flex;
      gap: 10px;
      align-items: center;
      z-index: 1000;
      font-family: Arial, sans-serif;
    `;

    // Participant section
    this.addSection(toolbar, 'Participants', [
      this.createButton('Add Participant', () => this.options.onAddParticipant('participant')),
      this.createButton('Add Actor', () => this.options.onAddParticipant('actor'))
    ]);

    // Message section
    this.addSection(toolbar, 'Messages', [
      this.createButton('Solid →', () => this.options.onAddMessage('->>')),
      this.createButton('Dashed →', () => this.options.onAddMessage('-->>')),
      this.createButton('Async →', () => this.options.onAddMessage('-)')),
      this.createButton('Delete ×', () => this.options.onAddMessage('-x'))
    ]);

    // Note section
    this.addSection(toolbar, 'Notes', [
      this.createButton('Add Note', () => this.options.onAddNote())
    ]);

    // Control structures
    this.addSection(toolbar, 'Structures', [
      this.createButton('Loop', () => this.options.onAddLoop()),
      this.createButton('Alt', () => this.options.onAddAlt())
    ]);

    // Options
    this.addSection(toolbar, 'Options', [
      this.createCheckbox('Auto Number', this.model.getDiagram().autoNumber, (_checked) => {
        this.options.onToggleAutoNumber();
      })
    ]);

    // Export
    toolbar.appendChild(this.createButton('Export Mermaid', () => this.options.onExport(), 'primary'));

    return toolbar;
  }

  private addSection(toolbar: HTMLElement, title: string, elements: HTMLElement[]): void {
    const section = document.createElement('div');
    section.style.cssText = `
      display: flex;
      gap: 5px;
      align-items: center;
      padding: 0 10px;
      border-left: 1px solid #ddd;
    `;

    const label = document.createElement('span');
    label.textContent = title + ':';
    label.style.cssText = `
      font-size: 12px;
      font-weight: bold;
      margin-right: 5px;
      color: #666;
    `;
    section.appendChild(label);

    elements.forEach(el => section.appendChild(el));
    toolbar.appendChild(section);
  }

  private createButton(label: string, onClick: () => void, variant: 'default' | 'primary' = 'default'): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = label;
    button.onclick = onClick;

    const isPrimary = variant === 'primary';
    button.style.cssText = `
      padding: 6px 12px;
      background: ${isPrimary ? '#2196f3' : '#fff'};
      color: ${isPrimary ? '#fff' : '#333'};
      border: 1px solid ${isPrimary ? '#2196f3' : '#ddd'};
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: ${isPrimary ? 'bold' : 'normal'};
      transition: all 0.2s;
    `;

    button.onmouseenter = () => {
      button.style.background = isPrimary ? '#1976d2' : '#f5f5f5';
    };

    button.onmouseleave = () => {
      button.style.background = isPrimary ? '#2196f3' : '#fff';
    };

    return button;
  }

  private createCheckbox(label: string, checked: boolean, onChange: (checked: boolean) => void): HTMLLabelElement {
    const labelEl = document.createElement('label');
    labelEl.style.cssText = `
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      cursor: pointer;
    `;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.onchange = () => onChange(checkbox.checked);

    const text = document.createElement('span');
    text.textContent = label;

    labelEl.appendChild(checkbox);
    labelEl.appendChild(text);

    return labelEl;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  updateAutoNumber(enabled: boolean): void {
    const checkbox = this.element.querySelector('input[type="checkbox"]') as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = enabled;
    }
  }
}
