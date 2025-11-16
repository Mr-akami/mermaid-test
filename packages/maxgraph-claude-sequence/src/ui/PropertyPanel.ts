import type { ArrowType, ParticipantType } from '../model/types';
import { SequenceDiagramModel } from '../model/DiagramModel';
import { SequenceGraph } from '../graph/SequenceGraph';

export class PropertyPanel {
  private container: HTMLElement;
  private model: SequenceDiagramModel;
  private graph: SequenceGraph;
  private currentSelection: { id: string; type: string } | null = null;

  constructor(container: HTMLElement, model: SequenceDiagramModel, graph: SequenceGraph) {
    this.container = container;
    this.model = model;
    this.graph = graph;

    this.render();
    this.setupGraphSelectionListener();
  }

  private setupGraphSelectionListener(): void {
    // Poll for selection changes
    setInterval(() => {
      const selectedId = this.graph.getSelectedId();
      if (selectedId !== this.currentSelection?.id) {
        this.handleSelectionChange(selectedId);
      }
    }, 200);
  }

  private handleSelectionChange(selectedId: string | null): void {
    if (!selectedId) {
      this.currentSelection = null;
      this.renderEmpty();
      return;
    }

    // Check if it's a participant
    const participant = this.model.getParticipant(selectedId);
    if (participant) {
      this.currentSelection = { id: selectedId, type: 'participant' };
      this.renderParticipantProperties(selectedId);
      return;
    }

    // Check if it's a message
    const message = this.model.getMessage(selectedId);
    if (message) {
      this.currentSelection = { id: selectedId, type: 'message' };
      this.renderMessageProperties(selectedId);
      return;
    }

    // Check if it's a note
    const note = this.model.getNote(selectedId);
    if (note) {
      this.currentSelection = { id: selectedId, type: 'note' };
      this.renderNoteProperties(selectedId);
      return;
    }

    this.currentSelection = null;
    this.renderEmpty();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="property-panel">
        <h3>Properties</h3>
        <div id="property-content">
          <p>Select an element to edit its properties</p>
        </div>
      </div>
    `;
  }

  private renderEmpty(): void {
    const content = document.getElementById('property-content');
    if (content) {
      content.innerHTML = '<p>Select an element to edit its properties</p>';
    }
  }

  private renderParticipantProperties(id: string): void {
    const participant = this.model.getParticipant(id);
    if (!participant) return;

    const content = document.getElementById('property-content');
    if (!content) return;

    content.innerHTML = `
      <div class="property-group">
        <h4>Participant</h4>

        <div class="property-field">
          <label>Type:</label>
          <select id="prop-participant-type">
            <option value="participant" ${participant.type === 'participant' ? 'selected' : ''}>Participant</option>
            <option value="actor" ${participant.type === 'actor' ? 'selected' : ''}>Actor</option>
          </select>
        </div>

        <div class="property-field">
          <label>Label:</label>
          <input type="text" id="prop-participant-label" value="${participant.label}" />
        </div>

        <div class="property-field">
          <label>ID:</label>
          <input type="text" id="prop-participant-id" value="${participant.id}" readonly />
        </div>

        <div class="property-actions">
          <button id="prop-delete-participant">Delete</button>
        </div>
      </div>
    `;

    // Setup event listeners
    const typeSelect = document.getElementById('prop-participant-type') as HTMLSelectElement;
    typeSelect?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value as ParticipantType;
      this.model.updateParticipant(id, { type: value });
    });

    const labelInput = document.getElementById('prop-participant-label') as HTMLInputElement;
    labelInput?.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.model.updateParticipant(id, { label: value });
    });

    const deleteBtn = document.getElementById('prop-delete-participant');
    deleteBtn?.addEventListener('click', () => {
      this.model.removeParticipant(id);
      this.renderEmpty();
    });
  }

  private renderMessageProperties(id: string): void {
    const message = this.model.getMessage(id);
    if (!message) return;

    const content = document.getElementById('property-content');
    if (!content) return;

    const fromParticipant = this.model.getParticipant(message.fromId);
    const toParticipant = this.model.getParticipant(message.toId);

    content.innerHTML = `
      <div class="property-group">
        <h4>Message</h4>

        <div class="property-field">
          <label>From:</label>
          <input type="text" value="${fromParticipant?.label || message.fromId}" readonly />
        </div>

        <div class="property-field">
          <label>To:</label>
          <input type="text" value="${toParticipant?.label || message.toId}" readonly />
        </div>

        <div class="property-field">
          <label>Arrow Type:</label>
          <select id="prop-message-arrow">
            <option value="->" ${message.arrowType === '->' ? 'selected' : ''}>→ (solid, no arrow)</option>
            <option value="-->" ${message.arrowType === '-->' ? 'selected' : ''}>⇢ (dashed, no arrow)</option>
            <option value="->>" ${message.arrowType === '->>' ? 'selected' : ''}>→ (solid arrow)</option>
            <option value="-->>" ${message.arrowType === '-->>' ? 'selected' : ''}>⇢ (dashed arrow)</option>
            <option value="<<->>" ${message.arrowType === '<<->>' ? 'selected' : ''}>↔ (solid both)</option>
            <option value="<<-->>" ${message.arrowType === '<<-->>' ? 'selected' : ''}>⇔ (dashed both)</option>
            <option value="-x" ${message.arrowType === '-x' ? 'selected' : ''}>→✗ (solid cross)</option>
            <option value="--x" ${message.arrowType === '--x' ? 'selected' : ''}>⇢✗ (dashed cross)</option>
            <option value="-)" ${message.arrowType === '-)' ? 'selected' : ''}>→) (solid open)</option>
            <option value="--))" ${message.arrowType === '--))' ? 'selected' : ''}>⇢) (dashed open)</option>
          </select>
        </div>

        <div class="property-field">
          <label>Text:</label>
          <textarea id="prop-message-text" rows="3">${message.text}</textarea>
        </div>

        <div class="property-actions">
          <button id="prop-delete-message">Delete</button>
        </div>
      </div>
    `;

    // Setup event listeners
    const arrowSelect = document.getElementById('prop-message-arrow') as HTMLSelectElement;
    arrowSelect?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value as ArrowType;
      this.model.updateMessage(id, { arrowType: value });
    });

    const textArea = document.getElementById('prop-message-text') as HTMLTextAreaElement;
    textArea?.addEventListener('input', (e) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.model.updateMessage(id, { text: value });
    });

    const deleteBtn = document.getElementById('prop-delete-message');
    deleteBtn?.addEventListener('click', () => {
      this.model.removeMessage(id);
      this.renderEmpty();
    });
  }

  private renderNoteProperties(id: string): void {
    const note = this.model.getNote(id);
    if (!note) return;

    const content = document.getElementById('property-content');
    if (!content) return;

    content.innerHTML = `
      <div class="property-group">
        <h4>Note</h4>

        <div class="property-field">
          <label>Position:</label>
          <select id="prop-note-position">
            <option value="left" ${note.position === 'left' ? 'selected' : ''}>Left</option>
            <option value="right" ${note.position === 'right' ? 'selected' : ''}>Right</option>
            <option value="over" ${note.position === 'over' ? 'selected' : ''}>Over</option>
          </select>
        </div>

        <div class="property-field">
          <label>Text:</label>
          <textarea id="prop-note-text" rows="4">${note.text}</textarea>
        </div>

        <div class="property-actions">
          <button id="prop-delete-note">Delete</button>
        </div>
      </div>
    `;

    // Setup event listeners
    const positionSelect = document.getElementById('prop-note-position') as HTMLSelectElement;
    positionSelect?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value as 'left' | 'right' | 'over';
      this.model.updateNote(id, { position: value });
    });

    const textArea = document.getElementById('prop-note-text') as HTMLTextAreaElement;
    textArea?.addEventListener('input', (e) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.model.updateNote(id, { text: value });
    });

    const deleteBtn = document.getElementById('prop-delete-note');
    deleteBtn?.addEventListener('click', () => {
      this.model.removeNote(id);
      this.renderEmpty();
    });
  }
}
