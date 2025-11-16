import { DiagramModel } from '../model/DiagramModel';
import type { ArrowType, NotePosition, ParticipantType } from '../model/types';

export class PropertyPanel {
  private container: HTMLElement;
  private model: DiagramModel;

  constructor(container: HTMLElement, model: DiagramModel) {
    this.container = container;
    this.model = model;
    this.setupPanel();
    this.model.addListener(() => this.update());
  }

  private setupPanel(): void {
    this.container.innerHTML = `
      <div id="property-panel" style="
        position: absolute;
        right: 10px;
        top: 60px;
        width: 280px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 15px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        max-height: calc(100vh - 80px);
        overflow-y: auto;
      ">
        <h3 style="margin-top: 0; font-size: 14px; color: #333;">Properties</h3>
        <div id="property-content" style="font-size: 12px;">
          Select an element to edit its properties
        </div>
      </div>
    `;
  }

  update(): void {
    const selectedId = this.model.getSelectedElementId();
    const content = document.getElementById('property-content');
    if (!content) return;

    if (!selectedId) {
      content.innerHTML = 'Select an element to edit its properties';
      return;
    }

    const diagram = this.model.getDiagram();
    const participant = diagram.participants.find(p => p.id === selectedId);
    const message = diagram.messages.find(m => m.id === selectedId);
    const note = diagram.notes.find(n => n.id === selectedId);
    const cs = diagram.controlStructures.find(c => c.id === selectedId);

    if (participant) {
      this.renderParticipantProperties(content, participant);
    } else if (message) {
      this.renderMessageProperties(content, message);
    } else if (note) {
      this.renderNoteProperties(content, note);
    } else if (cs) {
      this.renderControlStructureProperties(content, cs);
    } else {
      content.innerHTML = 'Unknown element type';
    }
  }

  private renderParticipantProperties(container: HTMLElement, participant: any): void {
    const diagram = this.model.getDiagram();

    container.innerHTML = `
      <div style="margin-bottom: 10px;">
        <strong>Participant</strong>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Type:</label>
        <select id="participant-type" style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px;">
          <option value="participant" ${participant.type === 'participant' ? 'selected' : ''}>Participant</option>
          <option value="actor" ${participant.type === 'actor' ? 'selected' : ''}>Actor</option>
        </select>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">ID:</label>
        <input type="text" id="participant-id" value="${participant.id}" readonly
          style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; background: #f5f5f5;" />
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Label:</label>
        <input type="text" id="participant-label" value="${participant.label || ''}" placeholder="Optional display name"
          style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px;" />
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Position:</label>
        <div style="display: flex; gap: 8px;">
          <input type="number" id="participant-x" value="${Math.round(participant.x)}" placeholder="X"
            style="flex: 1; padding: 4px; border: 1px solid #ccc; border-radius: 3px;" />
          <input type="number" id="participant-y" value="${Math.round(participant.y)}" placeholder="Y"
            style="flex: 1; padding: 4px; border: 1px solid #ccc; border-radius: 3px;" />
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Order:</label>
        <input type="number" id="participant-order" value="${participant.order}" min="0" max="${diagram.participants.length - 1}"
          style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px;" />
      </div>

      <div style="margin-top: 15px;">
        <button id="apply-participant" style="
          width: 100%;
          padding: 8px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        ">Apply Changes</button>
      </div>

      <div style="margin-top: 8px;">
        <button id="delete-participant" style="
          width: 100%;
          padding: 8px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        ">Delete</button>
      </div>
    `;

    const applyBtn = container.querySelector('#apply-participant');
    applyBtn?.addEventListener('click', () => {
      const type = (container.querySelector('#participant-type') as HTMLSelectElement).value as ParticipantType;
      const label = (container.querySelector('#participant-label') as HTMLInputElement).value;
      const x = parseFloat((container.querySelector('#participant-x') as HTMLInputElement).value);
      const y = parseFloat((container.querySelector('#participant-y') as HTMLInputElement).value);
      const order = parseInt((container.querySelector('#participant-order') as HTMLInputElement).value);

      this.model.updateParticipant(participant.id, {
        type,
        label: label || undefined,
        x,
        y,
        order
      });
    });

    const deleteBtn = container.querySelector('#delete-participant');
    deleteBtn?.addEventListener('click', () => {
      if (confirm('Delete this participant?')) {
        this.model.deleteParticipant(participant.id);
      }
    });
  }

  private renderMessageProperties(container: HTMLElement, message: any): void {
    const diagram = this.model.getDiagram();

    container.innerHTML = `
      <div style="margin-bottom: 10px;">
        <strong>Message</strong>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">From:</label>
        <select id="message-from" style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px;">
          ${diagram.participants.map(p => `
            <option value="${p.id}" ${p.id === message.from ? 'selected' : ''}>
              ${p.label || p.id}
            </option>
          `).join('')}
        </select>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">To:</label>
        <select id="message-to" style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px;">
          ${diagram.participants.map(p => `
            <option value="${p.id}" ${p.id === message.to ? 'selected' : ''}>
              ${p.label || p.id}
            </option>
          `).join('')}
        </select>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Arrow Type:</label>
        <select id="message-arrow" style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px;">
          <option value="->" ${message.arrowType === '->' ? 'selected' : ''}>-> (solid, no head)</option>
          <option value="-->" ${message.arrowType === '-->' ? 'selected' : ''}>--> (dashed, no head)</option>
          <option value="->>" ${message.arrowType === '->>' ? 'selected' : ''}>>> (solid, arrow)</option>
          <option value="-->>" ${message.arrowType === '-->>' ? 'selected' : ''}-->> (dashed, arrow)</option>
          <option value="<<->>" ${message.arrowType === '<<->>' ? 'selected' : ''}><<->> (solid, both ends)</option>
          <option value="<<-->>" ${message.arrowType === '<<-->>' ? 'selected' : ''}><<-->> (dashed, both ends)</option>
          <option value="-x" ${message.arrowType === '-x' ? 'selected' : ''}>-x (solid, cross)</option>
          <option value="--x" ${message.arrowType === '--x' ? 'selected' : ''}>--x (dashed, cross)</option>
          <option value="-)" ${message.arrowType === '-' ? 'selected' : ''}>-) (solid, open)</option>
          <option value="--)" ${message.arrowType === '--))' ? 'selected' : ''}>--)) (dashed, open)</option>
        </select>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Text:</label>
        <textarea id="message-text" rows="3" placeholder="Message text (use &lt;br/&gt; for line breaks)"
          style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; resize: vertical;">${message.text || ''}</textarea>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Y Position:</label>
        <input type="number" id="message-y" value="${Math.round(message.y)}"
          style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px;" />
      </div>

      <div style="margin-top: 15px;">
        <button id="apply-message" style="
          width: 100%;
          padding: 8px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        ">Apply Changes</button>
      </div>

      <div style="margin-top: 8px;">
        <button id="delete-message" style="
          width: 100%;
          padding: 8px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        ">Delete</button>
      </div>
    `;

    const applyBtn = container.querySelector('#apply-message');
    applyBtn?.addEventListener('click', () => {
      const from = (container.querySelector('#message-from') as HTMLSelectElement).value;
      const to = (container.querySelector('#message-to') as HTMLSelectElement).value;
      const arrowType = (container.querySelector('#message-arrow') as HTMLSelectElement).value as ArrowType;
      const text = (container.querySelector('#message-text') as HTMLTextAreaElement).value;
      const y = parseFloat((container.querySelector('#message-y') as HTMLInputElement).value);

      this.model.updateMessage(message.id, {
        from,
        to,
        arrowType,
        text,
        y
      });
    });

    const deleteBtn = container.querySelector('#delete-message');
    deleteBtn?.addEventListener('click', () => {
      if (confirm('Delete this message?')) {
        this.model.deleteMessage(message.id);
      }
    });
  }

  private renderNoteProperties(container: HTMLElement, note: any): void {
    const diagram = this.model.getDiagram();

    container.innerHTML = `
      <div style="margin-bottom: 10px;">
        <strong>Note</strong>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Position:</label>
        <select id="note-position" style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px;">
          <option value="left" ${note.position === 'left' ? 'selected' : ''}>Left</option>
          <option value="right" ${note.position === 'right' ? 'selected' : ''}>Right</option>
          <option value="over" ${note.position === 'over' ? 'selected' : ''}>Over</option>
        </select>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Participant:</label>
        <select id="note-participant" style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px;">
          ${diagram.participants.map(p => `
            <option value="${p.id}" ${note.participants.includes(p.id) ? 'selected' : ''}>
              ${p.label || p.id}
            </option>
          `).join('')}
        </select>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Text:</label>
        <textarea id="note-text" rows="4" placeholder="Note text (use &lt;br/&gt; for line breaks)"
          style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; resize: vertical;">${note.text || ''}</textarea>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Y Position:</label>
        <input type="number" id="note-y" value="${Math.round(note.y)}"
          style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px;" />
      </div>

      <div style="margin-top: 15px;">
        <button id="apply-note" style="
          width: 100%;
          padding: 8px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        ">Apply Changes</button>
      </div>

      <div style="margin-top: 8px;">
        <button id="delete-note" style="
          width: 100%;
          padding: 8px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        ">Delete</button>
      </div>
    `;

    const applyBtn = container.querySelector('#apply-note');
    applyBtn?.addEventListener('click', () => {
      const position = (container.querySelector('#note-position') as HTMLSelectElement).value as NotePosition;
      const participant = (container.querySelector('#note-participant') as HTMLSelectElement).value;
      const text = (container.querySelector('#note-text') as HTMLTextAreaElement).value;
      const y = parseFloat((container.querySelector('#note-y') as HTMLInputElement).value);

      this.model.updateNote(note.id, {
        position,
        participants: [participant],
        text,
        y
      });
    });

    const deleteBtn = container.querySelector('#delete-note');
    deleteBtn?.addEventListener('click', () => {
      if (confirm('Delete this note?')) {
        this.model.deleteNote(note.id);
      }
    });
  }

  private renderControlStructureProperties(container: HTMLElement, cs: any): void {
    container.innerHTML = `
      <div style="margin-bottom: 10px;">
        <strong>Control Structure: ${cs.type.toUpperCase()}</strong>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Label:</label>
        <input type="text" id="cs-label" value="${cs.label || ''}" placeholder="Label"
          style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px;" />
      </div>

      ${cs.type === 'rect' ? `
        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Color:</label>
          <input type="text" id="cs-color" value="${cs.color || 'rgba(200,200,200,0.3)'}" placeholder="rgba(r,g,b,a)"
            style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px;" />
        </div>
      ` : ''}

      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Position & Size:</label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <input type="number" id="cs-x" value="${Math.round(cs.x)}" placeholder="X"
            style="padding: 4px; border: 1px solid #ccc; border-radius: 3px;" />
          <input type="number" id="cs-y" value="${Math.round(cs.y)}" placeholder="Y"
            style="padding: 4px; border: 1px solid #ccc; border-radius: 3px;" />
          <input type="number" id="cs-width" value="${Math.round(cs.width)}" placeholder="Width"
            style="padding: 4px; border: 1px solid #ccc; border-radius: 3px;" />
          <input type="number" id="cs-height" value="${Math.round(cs.height)}" placeholder="Height"
            style="padding: 4px; border: 1px solid #ccc; border-radius: 3px;" />
        </div>
      </div>

      <div style="margin-top: 15px;">
        <button id="apply-cs" style="
          width: 100%;
          padding: 8px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        ">Apply Changes</button>
      </div>

      <div style="margin-top: 8px;">
        <button id="delete-cs" style="
          width: 100%;
          padding: 8px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        ">Delete</button>
      </div>
    `;

    const applyBtn = container.querySelector('#apply-cs');
    applyBtn?.addEventListener('click', () => {
      const label = (container.querySelector('#cs-label') as HTMLInputElement).value;
      const x = parseFloat((container.querySelector('#cs-x') as HTMLInputElement).value);
      const y = parseFloat((container.querySelector('#cs-y') as HTMLInputElement).value);
      const width = parseFloat((container.querySelector('#cs-width') as HTMLInputElement).value);
      const height = parseFloat((container.querySelector('#cs-height') as HTMLInputElement).value);

      const updates: any = { label, x, y, width, height };

      if (cs.type === 'rect') {
        const color = (container.querySelector('#cs-color') as HTMLInputElement)?.value;
        if (color) updates.color = color;
      }

      this.model.updateControlStructure(cs.id, updates);
    });

    const deleteBtn = container.querySelector('#delete-cs');
    deleteBtn?.addEventListener('click', () => {
      if (confirm('Delete this control structure?')) {
        this.model.deleteControlStructure(cs.id);
      }
    });
  }
}
