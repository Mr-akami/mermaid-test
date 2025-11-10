/**
 * Main application entry point
 * Interactive Mermaid Sequence Diagram Editor with D3.js
 */

import './style.css';
import { createEmptyDiagram } from './model';
import { InteractiveSequenceRenderer } from './interactive-renderer';
import { exportToMermaid, parseFromMermaid } from './mermaid';
import type { ArrowType, Message, Participant } from './model';

// Create the UI
const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div class="tool-palette" id="tool-palette">
    <button class="tool-btn active" data-tool="select" title="Select (S)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 3l7 18 3-9 9-3z"/>
      </svg>
      <span>Select</span>
    </button>
    <button class="tool-btn" data-tool="participant" title="Participant (P)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="4" y="4" width="16" height="16" rx="2"/>
      </svg>
      <span>Box</span>
    </button>
    <button class="tool-btn" data-tool="actor" title="Actor (A)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="7" r="3"/>
        <path d="M12 10v7m-3-3h6"/>
      </svg>
      <span>Actor</span>
    </button>
    <button class="tool-btn" data-tool="message" title="Message (M)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 12h14M15 8l4 4-4 4"/>
      </svg>
      <span>Message</span>
    </button>
    <button class="tool-btn" data-tool="loop" title="Loop (L)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 12a8 8 0 0 1 8-8M12 4v4m0 0l-3-3m3 3l3-3"/>
        <path d="M20 12a8 8 0 0 1-8 8M12 20v-4m0 0l-3 3m3-3l3 3"/>
      </svg>
      <span>Loop</span>
    </button>
  </div>

  <div class="main-content">
    <div class="toolbar">
      <span style="font-size: 11px; color: #999; margin-right: 15px;">Powered by D3.js</span>
      <button class="btn" id="clear-btn">Clear All</button>
      <button class="btn" id="delete-btn">Delete Selected (Del)</button>
      <button class="btn btn-primary" id="export-btn">Copy Mermaid</button>
      <button class="btn" id="import-btn">Import</button>
      <span id="tool-help" style="margin-left: auto; font-size: 13px; color: #666;"></span>
    </div>

    <div class="canvas-container" id="canvas"></div>

    <div class="bottom-panel">
      <div class="panel-header">
        <span>Mermaid Text (Editable)</span>
        <button class="btn btn-small" id="apply-mermaid-btn">Apply Changes</button>
      </div>
      <div class="panel-content">
        <textarea class="mermaid-editor" id="mermaid-text"></textarea>
      </div>
    </div>
  </div>

  <div class="property-panel">
    <div class="sidebar-header">
      Properties
    </div>

    <div class="sidebar-section" id="property-content">
      <p style="text-align: center; color: #999; padding: 20px;">
        Select an element to edit properties
      </p>
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
`;

// Initialize diagram and renderer
const diagram = createEmptyDiagram();
const canvas = document.getElementById('canvas')!;

// Track if mermaid text was manually changed
let mermaidTextChanged = false;

const renderer = new InteractiveSequenceRenderer(diagram, canvas, {
  onElementSelected: (element) => {
    updatePropertyPanel(element);
  },
  onDiagramChange: () => {
    updateMermaidText();
  }
});

// Update Mermaid text preview
function updateMermaidText(): void {
  const text = exportToMermaid(diagram);
  const textarea = document.getElementById('mermaid-text') as HTMLTextAreaElement;
  textarea.value = text;

  // Reset button state if text was updated programmatically
  mermaidTextChanged = false;
  const btn = document.getElementById('apply-mermaid-btn') as HTMLButtonElement;
  if (btn) {
    btn.style.background = '';
    btn.textContent = 'Apply Changes';
  }
}

// Update property panel based on selected element
function updatePropertyPanel(element: any): void {
  const panel = document.getElementById('property-content')!;

  if (!element) {
    panel.innerHTML = `
      <p style="text-align: center; color: #999; padding: 20px;">
        Select an element to edit properties
      </p>
    `;
    return;
  }

  if (element.type === 'participant') {
    const p = element.data as Participant;
    panel.innerHTML = `
      <div class="section-title">Participant Properties</div>
      <div class="input-group">
        <label>ID</label>
        <input type="text" id="prop-id" value="${p.id}" readonly>
      </div>
      <div class="input-group">
        <label>Type</label>
        <select id="prop-type">
          <option value="participant" ${p.type === 'participant' ? 'selected' : ''}>Participant</option>
          <option value="actor" ${p.type === 'actor' ? 'selected' : ''}>Actor</option>
        </select>
      </div>
      <div class="input-group">
        <label>Label</label>
        <input type="text" id="prop-label" value="${p.label || ''}" placeholder="Display name">
      </div>
      <button class="btn btn-primary" id="apply-props">Apply Changes</button>
    `;

    // Event listeners
    document.getElementById('prop-type')!.addEventListener('change', (e) => {
      p.type = (e.target as HTMLSelectElement).value as any;
      renderer.render();
      updateMermaidText();
    });

    document.getElementById('apply-props')!.addEventListener('click', () => {
      const label = (document.getElementById('prop-label') as HTMLInputElement).value.trim();
      p.label = label || undefined;
      renderer.render();
      updateMermaidText();
    });

  } else if (element.type === 'message') {
    const m = element.data as Message;
    panel.innerHTML = `
      <div class="section-title">Message Properties</div>
      <div class="input-group">
        <label>From</label>
        <input type="text" value="${m.from}" readonly>
      </div>
      <div class="input-group">
        <label>To</label>
        <input type="text" value="${m.to}" readonly>
      </div>
      <div class="input-group">
        <label>Arrow Type</label>
        <select id="prop-arrow">
          <option value="->>" ${m.arrow === '->>' ? 'selected' : ''}> ->> (solid, arrow)</option>
          <option value="-->>" ${m.arrow === '-->>' ? 'selected' : ''}>-->> (dashed, arrow)</option>
          <option value="->" ${m.arrow === '->' ? 'selected' : ''}>-> (solid, no arrow)</option>
          <option value="-->" ${m.arrow === '-->' ? 'selected' : ''}>--> (dashed, no arrow)</option>
          <option value="-x" ${m.arrow === '-x' ? 'selected' : ''}>-x (solid, cross)</option>
          <option value="--x" ${m.arrow === '--x' ? 'selected' : ''}>--x (dashed, cross)</option>
          <option value="-)" ${m.arrow === '-)' ? 'selected' : ''}>-) (solid, async)</option>
          <option value="--)))" ${m.arrow === '--))' ? 'selected' : ''}>--)) (dashed, async)</option>
          <option value="<<->>" ${m.arrow === '<<->>' ? 'selected' : ''}><<->> (solid, both)</option>
          <option value="<<-->>" ${m.arrow === '<<-->>' ? 'selected' : ''}><<-->> (dashed, both)</option>
        </select>
      </div>
      <div class="input-group">
        <label>Text</label>
        <input type="text" id="prop-text" value="${m.text || ''}" placeholder="Message text">
      </div>
      <button class="btn btn-primary" id="apply-props">Apply Changes</button>
    `;

    // Event listeners
    document.getElementById('prop-arrow')!.addEventListener('change', (e) => {
      m.arrow = (e.target as HTMLSelectElement).value as ArrowType;
      renderer.render();
      updateMermaidText();
    });

    document.getElementById('apply-props')!.addEventListener('click', () => {
      const text = (document.getElementById('prop-text') as HTMLInputElement).value.trim();
      m.text = text || undefined;
      renderer.render();
      updateMermaidText();
    });

  } else if (element.type === 'loop') {
    const loop = element.data as any;
    panel.innerHTML = `
      <div class="section-title">Loop Properties</div>
      <div class="input-group">
        <label>Label</label>
        <input type="text" id="prop-label" value="${loop.label || ''}" placeholder="Loop condition">
      </div>
      <div class="input-group">
        <label>Messages</label>
        <p style="font-size: 12px; color: #666;">${loop.statements.length} message(s) in this loop</p>
      </div>
      <button class="btn btn-primary" id="apply-props">Apply Changes</button>
    `;

    // Event listeners
    document.getElementById('apply-props')!.addEventListener('click', () => {
      const label = (document.getElementById('prop-label') as HTMLInputElement).value.trim();
      loop.label = label || 'loop';
      renderer.render();
      updateMermaidText();
    });
  }
}

// Helper text for each tool
const toolHelp: Record<string, string> = {
  select: 'Click to select, drag to move elements',
  participant: 'Click on canvas to place a participant box',
  actor: 'Click on canvas to place an actor',
  message: 'Click first lifeline (dashed line), then click second lifeline to create message',
  loop: 'Drag to select a range of messages to wrap in a loop block'
};

// Update tool help text
function updateToolHelp(tool: string): void {
  const helpEl = document.getElementById('tool-help');
  if (helpEl) {
    helpEl.textContent = toolHelp[tool] || '';
  }
}

// Tool palette - tool selection
document.getElementById('tool-palette')!.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const btn = target.closest('.tool-btn') as HTMLElement;

  if (btn) {
    const tool = btn.dataset.tool as any;

    // Update active state
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Set tool in renderer
    renderer.setTool(tool);

    // Update help text
    updateToolHelp(tool);
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Tool shortcuts
  if (e.key === 's' || e.key === 'S') {
    e.preventDefault();
    document.querySelector('[data-tool="select"]')?.dispatchEvent(new Event('click', { bubbles: true }));
  } else if (e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    document.querySelector('[data-tool="participant"]')?.dispatchEvent(new Event('click', { bubbles: true }));
  } else if (e.key === 'a' || e.key === 'A') {
    e.preventDefault();
    document.querySelector('[data-tool="actor"]')?.dispatchEvent(new Event('click', { bubbles: true }));
  } else if (e.key === 'm' || e.key === 'M') {
    e.preventDefault();
    document.querySelector('[data-tool="message"]')?.dispatchEvent(new Event('click', { bubbles: true }));
  } else if (e.key === 'l' || e.key === 'L') {
    e.preventDefault();
    document.querySelector('[data-tool="loop"]')?.dispatchEvent(new Event('click', { bubbles: true }));
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    renderer.deleteSelected();
  } else if (e.key === 'Escape') {
    renderer.setTool('select');
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tool="select"]')?.classList.add('active');
    updateToolHelp('select');
  }
});

// Toolbar actions
document.getElementById('clear-btn')!.addEventListener('click', () => {
  if (confirm('Clear entire diagram?')) {
    diagram.participants.clear();
    diagram.elements = [];
    renderer.render();
    updateMermaidText();
  }
});

document.getElementById('delete-btn')!.addEventListener('click', () => {
  renderer.deleteSelected();
});

document.getElementById('export-btn')!.addEventListener('click', () => {
  const text = exportToMermaid(diagram);
  navigator.clipboard.writeText(text).then(() => {
    alert('Mermaid text copied to clipboard!');
  }).catch(() => {
    alert('Failed to copy to clipboard');
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
      const importedDiagram = parseFromMermaid(text);
      diagram.participants = importedDiagram.participants;
      diagram.elements = importedDiagram.elements;
      diagram.config = importedDiagram.config;

      renderer.setDiagram(diagram);
      renderer.render();
      updateMermaidText();

      document.getElementById('import-modal')!.classList.remove('active');
      (document.getElementById('import-text') as HTMLTextAreaElement).value = '';
    } catch (error) {
      alert('Failed to parse Mermaid text. Please check the syntax.');
      console.error(error);
    }
  }
});

// Apply Mermaid text changes from editor
function applyMermaidChanges() {
  const text = (document.getElementById('mermaid-text') as HTMLTextAreaElement).value.trim();
  if (text) {
    try {
      const importedDiagram = parseFromMermaid(text);
      diagram.participants = importedDiagram.participants;
      diagram.elements = importedDiagram.elements;
      diagram.config = importedDiagram.config;

      renderer.setDiagram(diagram);
      renderer.render();
      updateMermaidText();

      // Visual feedback
      const btn = document.getElementById('apply-mermaid-btn') as HTMLButtonElement;
      const originalText = btn.textContent;
      btn.textContent = '✓ Applied!';
      btn.style.background = '#28a745';
      setTimeout(() => {
        btn.textContent = originalText!;
        btn.style.background = '';
      }, 1500);
    } catch (error) {
      alert('Failed to parse Mermaid text. Please check the syntax.\n\nError: ' + (error as Error).message);
      console.error(error);
    }
  }
}

document.getElementById('apply-mermaid-btn')!.addEventListener('click', applyMermaidChanges);

// Detect changes in Mermaid text area
document.getElementById('mermaid-text')!.addEventListener('input', () => {
  mermaidTextChanged = true;
  const btn = document.getElementById('apply-mermaid-btn') as HTMLButtonElement;
  btn.style.background = '#ffc107';
  btn.textContent = 'Apply Changes *';
});

// Ctrl+S to apply changes
document.getElementById('mermaid-text')!.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    applyMermaidChanges();
    mermaidTextChanged = false;
  }
});

// Initial render
renderer.render();
updateMermaidText();
updateToolHelp('select'); // Show initial help

console.log('Interactive Mermaid Sequence Diagram Editor initialized');
console.log('Shortcuts: S=Select, P=Participant, A=Actor, M=Message, Del=Delete, Esc=Select tool');
