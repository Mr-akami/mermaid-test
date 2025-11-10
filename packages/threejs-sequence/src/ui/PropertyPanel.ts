import type { DiagramModel } from '../model/DiagramModel';
import type { Participant, Message, Note } from '../model/types';

export type SelectedElement =
  | { type: 'participant'; data: Participant }
  | { type: 'message'; data: Message; index: number }
  | { type: 'note'; data: Note; index: number }
  | null;

/**
 * PropertyPanel allows editing properties of selected elements
 */
export class PropertyPanel {
  private element: HTMLElement;
  private model: DiagramModel;
  private selected: SelectedElement = null;

  constructor(model: DiagramModel) {
    this.model = model;
    this.element = this.createPanel();
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'property-panel';
    panel.style.cssText = `
      position: fixed;
      top: 60px;
      right: 0;
      width: 300px;
      bottom: 0;
      background: #fafafa;
      border-left: 1px solid #ddd;
      padding: 20px;
      overflow-y: auto;
      font-family: Arial, sans-serif;
      z-index: 999;
    `;

    panel.innerHTML = `
      <div style="color: #999; text-align: center; padding: 40px 20px;">
        Select an element to edit its properties
      </div>
    `;

    return panel;
  }

  setSelected(selected: SelectedElement): void {
    this.selected = selected;
    this.render();
  }

  private render(): void {
    this.element.innerHTML = '';

    if (!this.selected) {
      this.element.innerHTML = `
        <div style="color: #999; text-align: center; padding: 40px 20px;">
          Select an element to edit its properties
        </div>
      `;
      return;
    }

    switch (this.selected.type) {
      case 'participant':
        this.renderParticipantProperties(this.selected.data);
        break;
      case 'message':
        this.renderMessageProperties(this.selected.data, this.selected.index);
        break;
      case 'note':
        this.renderNoteProperties(this.selected.data, this.selected.index);
        break;
    }
  }

  private renderParticipantProperties(participant: Participant): void {
    const title = this.createTitle('Participant Properties');
    this.element.appendChild(title);

    // Type
    this.element.appendChild(this.createSelect(
      'Type',
      participant.type,
      [
        { value: 'participant', label: 'Participant' },
        { value: 'actor', label: 'Actor' }
      ],
      (value) => {
        this.model.updateParticipant(participant.id, { type: value as 'participant' | 'actor' });
      }
    ));

    // ID
    this.element.appendChild(this.createInput(
      'ID',
      participant.id,
      (value) => {
        // Note: Changing ID requires more complex handling
        console.warn('ID change not implemented');
      },
      true // disabled
    ));

    // Label
    this.element.appendChild(this.createInput(
      'Label',
      participant.label || '',
      (value) => {
        this.model.updateParticipant(participant.id, { label: value || undefined });
      }
    ));

    // Delete button
    this.element.appendChild(this.createDeleteButton(() => {
      this.model.removeParticipant(participant.id);
      this.setSelected(null);
    }));
  }

  private renderMessageProperties(message: Message, index: number): void {
    const title = this.createTitle('Message Properties');
    this.element.appendChild(title);

    // Arrow type
    this.element.appendChild(this.createSelect(
      'Arrow Type',
      message.arrow,
      [
        { value: '->>', label: 'Solid Arrow' },
        { value: '-->>', label: 'Dashed Arrow' },
        { value: '-)', label: 'Async' },
        { value: '-x', label: 'Delete (X)' },
        { value: '->', label: 'Solid Line' },
        { value: '-->', label: 'Dashed Line' }
      ],
      (value) => {
        this.model.updateStatement(index, { ...message, arrow: value as any });
      }
    ));

    // Text
    this.element.appendChild(this.createTextarea(
      'Message Text',
      message.text || '',
      (value) => {
        this.model.updateStatement(index, { ...message, text: value });
      }
    ));

    // Sender
    this.element.appendChild(this.createInput(
      'From',
      message.sender,
      (value) => {
        this.model.updateStatement(index, { ...message, sender: value });
      }
    ));

    // Receiver
    this.element.appendChild(this.createInput(
      'To',
      message.receiver,
      (value) => {
        this.model.updateStatement(index, { ...message, receiver: value });
      }
    ));

    // Delete button
    this.element.appendChild(this.createDeleteButton(() => {
      this.model.removeStatement(index);
      this.setSelected(null);
    }));
  }

  private renderNoteProperties(note: Note, index: number): void {
    const title = this.createTitle('Note Properties');
    this.element.appendChild(title);

    // Position
    this.element.appendChild(this.createSelect(
      'Position',
      note.position,
      [
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
        { value: 'over', label: 'Over' }
      ],
      (value) => {
        const statements = this.model.getStatements();
        const stmt = statements[index];
        if ('position' in stmt) {
          this.model.updateStatement(index, { ...stmt, position: value as any });
        }
      }
    ));

    // Text
    this.element.appendChild(this.createTextarea(
      'Note Text',
      note.text,
      (value) => {
        const statements = this.model.getStatements();
        const stmt = statements[index];
        if ('position' in stmt) {
          this.model.updateStatement(index, { ...stmt, text: value });
        }
      }
    ));

    // Delete button
    this.element.appendChild(this.createDeleteButton(() => {
      this.model.removeStatement(index);
      this.setSelected(null);
    }));
  }

  private createTitle(text: string): HTMLElement {
    const title = document.createElement('h3');
    title.textContent = text;
    title.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 16px;
      color: #333;
      border-bottom: 2px solid #2196f3;
      padding-bottom: 10px;
    `;
    return title;
  }

  private createInput(label: string, value: string, onChange: (value: string) => void, disabled: boolean = false): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 15px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      display: block;
      font-size: 12px;
      font-weight: bold;
      color: #666;
      margin-bottom: 5px;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.disabled = disabled;
    input.style.cssText = `
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
    `;
    input.oninput = () => onChange(input.value);

    container.appendChild(labelEl);
    container.appendChild(input);
    return container;
  }

  private createTextarea(label: string, value: string, onChange: (value: string) => void): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 15px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      display: block;
      font-size: 12px;
      font-weight: bold;
      color: #666;
      margin-bottom: 5px;
    `;

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.rows = 3;
    textarea.style.cssText = `
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      font-family: Arial, sans-serif;
      resize: vertical;
      box-sizing: border-box;
    `;
    textarea.oninput = () => onChange(textarea.value);

    container.appendChild(labelEl);
    container.appendChild(textarea);
    return container;
  }

  private createSelect(label: string, value: string, options: Array<{ value: string; label: string }>, onChange: (value: string) => void): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 15px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      display: block;
      font-size: 12px;
      font-weight: bold;
      color: #666;
      margin-bottom: 5px;
    `;

    const select = document.createElement('select');
    select.style.cssText = `
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
    `;

    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      option.selected = opt.value === value;
      select.appendChild(option);
    });

    select.onchange = () => onChange(select.value);

    container.appendChild(labelEl);
    container.appendChild(select);
    return container;
  }

  private createDeleteButton(onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    button.textContent = 'Delete';
    button.onclick = onClick;
    button.style.cssText = `
      width: 100%;
      padding: 10px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      margin-top: 20px;
    `;

    button.onmouseenter = () => {
      button.style.background = '#d32f2f';
    };

    button.onmouseleave = () => {
      button.style.background = '#f44336';
    };

    return button;
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
