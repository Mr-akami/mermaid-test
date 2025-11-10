/**
 * Main application entry point
 * Mermaid Sequence Diagram Editor with D3.js
 */

import './style.css';
import { createEmptyDiagram } from './model';
import { InteractiveSequenceRenderer } from './interactive-renderer';
import { exportToMermaid } from './mermaid';
import type { ArrowType, Message, Participant } from './model';

// Create the UI
const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div class="tool-palette" id="tool-palette">
    <button class="tool-btn active" data-tool="select" title="Select (S)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3l7 18 3-9 9-3z"/></svg>
      <span>Select</span>
    </button>
    <button class="tool-btn" data-tool="participant" title="Participant (P)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
      <span>Box</span>
    </button>
    <button class="tool-btn" data-tool="actor" title="Actor (A)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="7" r="3"/><path d="M12 10v7m-3-3h6"/></svg>
      <span>Actor</span>
    </button>
    <button class="tool-btn" data-tool="message" title="Message (M)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14M15 8l4 4-4 4"/></svg>
      <span>Message</span>
    </button>
  </div>

  <div class="main-content">
    <div class="toolbar">
      <button class="btn" id="clear-btn">Clear All</button>
      <button class="btn" id="delete-btn">Delete Selected (Del)</button>
      <button class="btn btn-primary" id="export-btn">Copy Mermaid</button>
      <button class="btn" id="import-btn">Import</button>
    </div>

    <div class="canvas-container" id="canvas"></div>

    <div class="bottom-panel">
      <div class="panel-header">
        <span>Mermaid Text (Read-only Preview)</span>
      </div>
      <div class="panel-content">
        <textarea class="mermaid-editor" id="mermaid-text" readonly></textarea>
      </div>
    </div>
  </div>

  <div class="property-panel">
    <div class="sidebar-header">
      Properties
    </div>

    <div class="sidebar-section" id="property-content">
      <!-- Configuration -->
      <div class="section-title">Configuration</div>
      <div class="toggle-group">
        <label class="toggle-switch">
          <input type="checkbox" id="autonumber-toggle">
          <span class="slider"></span>
        </label>
        <label for="autonumber-toggle">Auto Number</label>
      </div>
      <div class="toggle-group">
        <label class="toggle-switch">
          <input type="checkbox" id="mirror-actors-toggle">
          <span class="slider"></span>
        </label>
        <label for="mirror-actors-toggle">Mirror Actors</label>
      </div>

      <!-- Participants -->
      <div class="section-title">Participants</div>
      <div class="input-group">
        <label>ID</label>
        <input type="text" id="participant-id" placeholder="e.g., Alice">
      </div>
      <div class="input-group">
        <label>Type</label>
        <select id="participant-type">
          <option value="participant">Participant</option>
          <option value="actor">Actor</option>
        </select>
      </div>
      <div class="input-group">
        <label>Label (optional)</label>
        <input type="text" id="participant-label" placeholder="e.g., Alice Johnson">
      </div>
      <button class="btn btn-primary" id="add-participant-btn">Add Participant</button>

      <ul class="item-list" id="participant-list"></ul>

      <!-- Messages -->
      <div class="section-title">Add Message</div>
      <div class="input-group">
        <label>From</label>
        <select id="message-from"></select>
      </div>
      <div class="input-group">
        <label>To</label>
        <select id="message-to"></select>
      </div>
      <div class="input-group">
        <label>Arrow Type</label>
        <select id="message-arrow">
          <option value="->>">->> (solid, arrow)</option>
          <option value="-->>">-->> (dashed, arrow)</option>
          <option value="->">-> (solid, no arrow)</option>
          <option value="-->">--> (dashed, no arrow)</option>
          <option value="-x">-x (solid, cross)</option>
          <option value="--x">--x (dashed, cross)</option>
          <option value="-)">-) (solid, async)</option>
          <option value="--))">--)) (dashed, async)</option>
          <option value="<<->>"><<->> (solid, both)</option>
          <option value="<<-->>"><<-->> (dashed, both)</option>
        </select>
      </div>
      <div class="input-group">
        <label>Text (optional)</label>
        <input type="text" id="message-text" placeholder="e.g., Hello">
      </div>
      <button class="btn btn-primary" id="add-message-btn">Add Message</button>

      <!-- Notes -->
      <div class="section-title">Add Note</div>
      <div class="input-group">
        <label>Position</label>
        <select id="note-position">
          <option value="right of">Right of</option>
          <option value="left of">Left of</option>
          <option value="over">Over</option>
        </select>
      </div>
      <div class="input-group">
        <label>Actor(s)</label>
        <select id="note-actors" multiple></select>
        <small>Hold Ctrl/Cmd to select multiple for "over"</small>
      </div>
      <div class="input-group">
        <label>Text</label>
        <textarea id="note-text" placeholder="Note text"></textarea>
      </div>
      <button class="btn btn-primary" id="add-note-btn">Add Note</button>

      <!-- Control Structures -->
      <div class="section-title">Control Structures</div>
      <button class="btn" id="add-loop-btn">Add Loop</button>
      <button class="btn" id="add-alt-btn">Add Alt</button>
    </div>
  </div>

  <div class="main-content">
    <div class="toolbar">
      <button class="btn" id="clear-elements-btn">Clear Elements</button>
      <button class="btn btn-danger" id="clear-diagram-btn">Clear All</button>
      <button class="btn btn-primary" id="export-btn">Copy Mermaid Text</button>
      <button class="btn" id="import-btn">Import from Text</button>
    </div>

    <div class="canvas-container" id="canvas"></div>

    <div class="bottom-panel">
      <div class="panel-header">
        <span>Mermaid Text (Read-only Preview)</span>
      </div>
      <div class="panel-content">
        <textarea class="mermaid-editor" id="mermaid-text" readonly></textarea>
      </div>
    </div>
  </div>

  <!-- Modal for import -->
  <div class="modal" id="import-modal">
    <div class="modal-content">
      <div class="modal-header">Import Mermaid Text</div>
      <div class="input-group">
        <label>Paste your Mermaid sequence diagram code:</label>
        <textarea id="import-text" rows="10" placeholder="sequenceDiagram&#10;  Alice->>Bob: Hello"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn" id="import-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="import-confirm-btn">Import</button>
      </div>
    </div>
  </div>

  <!-- Modal for adding loop -->
  <div class="modal" id="loop-modal">
    <div class="modal-content">
      <div class="modal-header">Add Loop</div>
      <div class="input-group">
        <label>Loop Label:</label>
        <input type="text" id="loop-label" placeholder="e.g., Every minute">
      </div>
      <div class="modal-actions">
        <button class="btn" id="loop-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="loop-confirm-btn">Add</button>
      </div>
    </div>
  </div>

  <!-- Modal for adding alt -->
  <div class="modal" id="alt-modal">
    <div class="modal-content">
      <div class="modal-header">Add Alt Block</div>
      <div class="input-group">
        <label>First Condition:</label>
        <input type="text" id="alt-condition1" placeholder="e.g., if success">
      </div>
      <div class="input-group">
        <label>Second Condition (else):</label>
        <input type="text" id="alt-condition2" placeholder="e.g., if failure">
      </div>
      <div class="modal-actions">
        <button class="btn" id="alt-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="alt-confirm-btn">Add</button>
      </div>
    </div>
  </div>
`;

// Initialize editor with empty diagram
const diagram = createEmptyDiagram();
const canvas = document.getElementById('canvas')!;

const editor = new SequenceDiagramEditor(diagram, canvas, {
  onMermaidTextChange: (text) => {
    const textarea = document.getElementById('mermaid-text') as HTMLTextAreaElement;
    textarea.value = text;
  },
  onDiagramChange: () => {
    updateParticipantLists();
  }
});

// Update participant select dropdowns
function updateParticipantLists(): void {
  const participants = Array.from(editor.getDiagram().participants.values());
  const participantIds = participants.map(p => p.id);

  // Update message from/to selects
  const messageFrom = document.getElementById('message-from') as HTMLSelectElement;
  const messageTo = document.getElementById('message-to') as HTMLSelectElement;
  const noteActors = document.getElementById('note-actors') as HTMLSelectElement;

  [messageFrom, messageTo, noteActors].forEach(select => {
    const currentValue = select.value;
    select.innerHTML = participantIds
      .map(id => `<option value="${id}">${id}</option>`)
      .join('');
    if (participantIds.includes(currentValue)) {
      select.value = currentValue;
    }
  });

  // Update participant list
  const participantList = document.getElementById('participant-list')!;
  participantList.innerHTML = participants
    .map(p => `
      <li class="item">
        <div class="item-content">
          <strong>${p.id}</strong> (${p.type})
          ${p.label ? `<br><small>${p.label}</small>` : ''}
        </div>
        <div class="item-actions">
          <button class="btn btn-small btn-danger" data-action="remove-participant" data-id="${p.id}">Remove</button>
        </div>
      </li>
    `)
    .join('');
}

// Event Listeners
document.getElementById('autonumber-toggle')!.addEventListener('change', (e) => {
  editor.toggleAutonumber();
});

document.getElementById('mirror-actors-toggle')!.addEventListener('change', (e) => {
  editor.toggleMirrorActors();
});

document.getElementById('add-participant-btn')!.addEventListener('click', () => {
  const id = (document.getElementById('participant-id') as HTMLInputElement).value.trim();
  const type = (document.getElementById('participant-type') as HTMLSelectElement).value as ParticipantType;
  const label = (document.getElementById('participant-label') as HTMLInputElement).value.trim();

  if (id) {
    editor.addParticipant(id, type, label || undefined);
    (document.getElementById('participant-id') as HTMLInputElement).value = '';
    (document.getElementById('participant-label') as HTMLInputElement).value = '';
  } else {
    alert('Please enter a participant ID');
  }
});

document.getElementById('add-message-btn')!.addEventListener('click', () => {
  const from = (document.getElementById('message-from') as HTMLSelectElement).value;
  const to = (document.getElementById('message-to') as HTMLSelectElement).value;
  const arrow = (document.getElementById('message-arrow') as HTMLSelectElement).value as ArrowType;
  const text = (document.getElementById('message-text') as HTMLInputElement).value.trim();

  if (from && to) {
    editor.addMessage(from, to, arrow, text || undefined);
    (document.getElementById('message-text') as HTMLInputElement).value = '';
  } else {
    alert('Please select both from and to participants');
  }
});

document.getElementById('add-note-btn')!.addEventListener('click', () => {
  const position = (document.getElementById('note-position') as HTMLSelectElement).value as NotePosition;
  const actorsSelect = document.getElementById('note-actors') as HTMLSelectElement;
  const actors = Array.from(actorsSelect.selectedOptions).map(opt => opt.value);
  const text = (document.getElementById('note-text') as HTMLTextAreaElement).value.trim();

  if (actors.length === 0) {
    alert('Please select at least one actor');
    return;
  }

  if ((position === 'over' && actors.length !== 2) || (position !== 'over' && actors.length !== 1)) {
    alert(position === 'over' ? 'Select exactly 2 actors for "over"' : 'Select exactly 1 actor for left/right');
    return;
  }

  if (text) {
    editor.addNote(position, actors, text);
    (document.getElementById('note-text') as HTMLTextAreaElement).value = '';
  } else {
    alert('Please enter note text');
  }
});

// Control structures
document.getElementById('add-loop-btn')!.addEventListener('click', () => {
  document.getElementById('loop-modal')!.classList.add('active');
});

document.getElementById('loop-cancel-btn')!.addEventListener('click', () => {
  document.getElementById('loop-modal')!.classList.remove('active');
});

document.getElementById('loop-confirm-btn')!.addEventListener('click', () => {
  const label = (document.getElementById('loop-label') as HTMLInputElement).value.trim();
  if (label) {
    editor.addLoop(label);
    (document.getElementById('loop-label') as HTMLInputElement).value = '';
    document.getElementById('loop-modal')!.classList.remove('active');
  }
});

document.getElementById('add-alt-btn')!.addEventListener('click', () => {
  document.getElementById('alt-modal')!.classList.add('active');
});

document.getElementById('alt-cancel-btn')!.addEventListener('click', () => {
  document.getElementById('alt-modal')!.classList.remove('active');
});

document.getElementById('alt-confirm-btn')!.addEventListener('click', () => {
  const cond1 = (document.getElementById('alt-condition1') as HTMLInputElement).value.trim();
  const cond2 = (document.getElementById('alt-condition2') as HTMLInputElement).value.trim();
  if (cond1 && cond2) {
    editor.addAlt(cond1, cond2);
    (document.getElementById('alt-condition1') as HTMLInputElement).value = '';
    (document.getElementById('alt-condition2') as HTMLInputElement).value = '';
    document.getElementById('alt-modal')!.classList.remove('active');
  }
});

// Toolbar actions
document.getElementById('clear-elements-btn')!.addEventListener('click', () => {
  if (confirm('Clear all elements (keep participants)?')) {
    editor.clearElements();
  }
});

document.getElementById('clear-diagram-btn')!.addEventListener('click', () => {
  if (confirm('Clear entire diagram?')) {
    editor.clearDiagram();
  }
});

document.getElementById('export-btn')!.addEventListener('click', () => {
  const text = editor.getMermaidText();
  navigator.clipboard.writeText(text).then(() => {
    alert('Mermaid text copied to clipboard!');
  });
});

document.getElementById('import-btn')!.addEventListener('click', () => {
  document.getElementById('import-modal')!.classList.add('active');
});

document.getElementById('import-cancel-btn')!.addEventListener('click', () => {
  document.getElementById('import-modal')!.classList.remove('active');
});

document.getElementById('import-confirm-btn')!.addEventListener('click', () => {
  const text = (document.getElementById('import-text') as HTMLTextAreaElement).value.trim();
  if (text) {
    try {
      editor.setFromMermaid(text);
      document.getElementById('import-modal')!.classList.remove('active');
      (document.getElementById('import-text') as HTMLTextAreaElement).value = '';
    } catch (error) {
      alert('Failed to parse Mermaid text. Please check the syntax.');
      console.error(error);
    }
  }
});

// Delegate event for removing participants
document.getElementById('participant-list')!.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.dataset.action === 'remove-participant') {
    const id = target.dataset.id!;
    if (confirm(`Remove participant ${id}?`)) {
      editor.removeParticipant(id);
    }
  }
});

// Initial render
updateParticipantLists();
editor.toggleAutonumber(); // Trigger initial render

// Add sample data for demonstration
setTimeout(() => {
  editor.addParticipant('Alice', 'actor', 'Alice Johnson');
  editor.addParticipant('Bob', 'participant', 'Bob Smith');
  editor.addMessage('Alice', 'Bob', '->>', 'Hello Bob!');
  editor.addMessage('Bob', 'Alice', '-->>', 'Hi Alice!');
  editor.addNote('right of', ['Alice'], 'Alice thinks...');
}, 100);

console.log('Mermaid Sequence Diagram Editor initialized');
