import type { Participant, Message, Note } from '../models/types';
import { ParticipantType, ArrowType, NotePosition } from '../models/types';

export class PropertyPanel {
  private container: HTMLElement;
  private currentElement: any = null;

  public onPropertyChange?: (element: any) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  public setSelectedElement(element: any): void {
    this.currentElement = element;
    this.render();
  }

  private render(): void {
    if (!this.currentElement) {
      this.container.innerHTML = `
        <div class="property-panel">
          <h3>Properties</h3>
          <p class="no-selection">No element selected</p>
        </div>
      `;
      return;
    }

    const type = this.currentElement.type;
    const data = this.currentElement.data;

    let content = '';

    if (type === 'participant') {
      content = this.renderParticipantProperties(data);
    } else if (type === 'message') {
      content = this.renderMessageProperties(data);
    } else if (type === 'note') {
      content = this.renderNoteProperties(data);
    }

    this.container.innerHTML = `
      <div class="property-panel">
        <h3>Properties</h3>
        ${content}
      </div>
    `;

    this.setupEventListeners();
  }

  private renderParticipantProperties(participant: Participant): string {
    return `
      <div class="property-group">
        <label>Type:</label>
        <select id="prop-participant-type">
          <option value="${ParticipantType.PARTICIPANT}" ${participant.type === ParticipantType.PARTICIPANT ? 'selected' : ''}>Participant</option>
          <option value="${ParticipantType.ACTOR}" ${participant.type === ParticipantType.ACTOR ? 'selected' : ''}>Actor</option>
        </select>
      </div>
      <div class="property-group">
        <label>ID:</label>
        <input type="text" id="prop-participant-id" value="${participant.id}" readonly />
      </div>
      <div class="property-group">
        <label>Label:</label>
        <input type="text" id="prop-participant-label" value="${participant.label || ''}" />
      </div>
      <button id="apply-properties">Apply</button>
    `;
  }

  private renderMessageProperties(message: Message): string {
    return `
      <div class="property-group">
        <label>From:</label>
        <input type="text" id="prop-message-from" value="${message.sender}" readonly />
      </div>
      <div class="property-group">
        <label>To:</label>
        <input type="text" id="prop-message-to" value="${message.receiver}" readonly />
      </div>
      <div class="property-group">
        <label>Arrow Type:</label>
        <select id="prop-message-arrow">
          ${Object.entries(ArrowType).map(([key, value]) => `
            <option value="${value}" ${message.arrowType === value ? 'selected' : ''}>${key}</option>
          `).join('')}
        </select>
      </div>
      <div class="property-group">
        <label>Text:</label>
        <input type="text" id="prop-message-text" value="${message.text || ''}" />
      </div>
      <button id="apply-properties">Apply</button>
    `;
  }

  private renderNoteProperties(note: Note): string {
    return `
      <div class="property-group">
        <label>Position:</label>
        <select id="prop-note-position">
          ${Object.entries(NotePosition).map(([key, value]) => `
            <option value="${value}" ${note.position === value ? 'selected' : ''}>${key}</option>
          `).join('')}
        </select>
      </div>
      <div class="property-group">
        <label>Text:</label>
        <textarea id="prop-note-text">${note.text || ''}</textarea>
      </div>
      <button id="apply-properties">Apply</button>
    `;
  }

  private setupEventListeners(): void {
    const applyButton = this.container.querySelector('#apply-properties');
    if (applyButton) {
      applyButton.addEventListener('click', () => {
        this.applyProperties();
      });
    }
  }

  private applyProperties(): void {
    if (!this.currentElement) return;

    const type = this.currentElement.type;
    const data = this.currentElement.data;

    if (type === 'participant') {
      const typeSelect = this.container.querySelector('#prop-participant-type') as HTMLSelectElement;
      const labelInput = this.container.querySelector('#prop-participant-label') as HTMLInputElement;

      if (typeSelect) data.type = typeSelect.value;
      if (labelInput) data.label = labelInput.value;
    } else if (type === 'message') {
      const arrowSelect = this.container.querySelector('#prop-message-arrow') as HTMLSelectElement;
      const textInput = this.container.querySelector('#prop-message-text') as HTMLInputElement;

      if (arrowSelect) data.arrowType = arrowSelect.value;
      if (textInput) data.text = textInput.value;
    } else if (type === 'note') {
      const positionSelect = this.container.querySelector('#prop-note-position') as HTMLSelectElement;
      const textArea = this.container.querySelector('#prop-note-text') as HTMLTextAreaElement;

      if (positionSelect) data.position = positionSelect.value;
      if (textArea) data.text = textArea.value;
    }

    if (this.onPropertyChange) {
      this.onPropertyChange(this.currentElement);
    }
  }
}
