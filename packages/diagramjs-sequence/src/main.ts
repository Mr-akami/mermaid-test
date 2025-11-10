/**
 * Main entry point for the Sequence Diagram Editor
 */

import SequenceDiagram from './SequenceDiagram';
import 'diagram-js/assets/diagram-js.css';
import './style.css';

// Create the main container
const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div class="sequence-editor">
    <header class="editor-header">
      <h1>Sequence Diagram Editor</h1>
      <div class="editor-actions">
        <button id="export-btn" class="btn btn-primary">Export Mermaid</button>
        <button id="copy-btn" class="btn btn-secondary">Copy to Clipboard</button>
      </div>
    </header>

    <div class="editor-content">
      <div class="canvas-container" id="canvas"></div>

      <div class="side-panel">
        <div class="properties-container" id="properties">
          <h3>Properties</h3>
          <p class="empty-message">Select an element to edit its properties</p>
        </div>

        <div class="mermaid-output">
          <h3>Mermaid Output</h3>
          <pre id="mermaid-preview" class="mermaid-code"></pre>
        </div>
      </div>
    </div>
  </div>
`;

// Initialize the diagram
const canvasContainer = document.getElementById('canvas');
if (!canvasContainer) {
  throw new Error('Canvas container not found');
}

const diagram = new SequenceDiagram({
  canvas: {
    container: canvasContainer
  },
  propertiesPanel: '#properties'
});

console.log('Diagram initialized:', diagram);

// Check if palette and context pad are initialized
setTimeout(() => {
  const paletteEl = document.querySelector('.djs-palette');
  if (paletteEl) {
    console.log('✓ Palette found:', paletteEl);
  } else {
    console.error('✗ Palette not found!');
  }

  try {
    const palette = diagram.get('palette');
    const contextPad = diagram.get('contextPad');
    const connect = diagram.get('connect');
    console.log('✓ Services loaded:', { palette, contextPad, connect });
  } catch (e) {
    console.error('✗ Error getting services:', e);
  }

  console.log('');
  console.log('📖 Quick Start Guide:');
  console.log('1. Click an icon in the left palette (□ for Participant, 👤 for Actor)');
  console.log('2. Click on the canvas to place the element');
  console.log('3. Select a Participant/Actor by clicking it');
  console.log('4. Click the → (arrow) button in the context menu that appears');
  console.log('5. Click another Participant/Actor to create a message');
  console.log('6. Edit properties in the right panel');
}, 1000);

// Export button handler
const exportBtn = document.getElementById('export-btn');
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    diagram.downloadMermaid('sequence-diagram.mmd');
  });
}

// Copy button handler
const copyBtn = document.getElementById('copy-btn');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    try {
      await diagram.copyToClipboard();

      // Show feedback
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy to Clipboard';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    }
  });
}

// Update Mermaid preview
const updatePreview = () => {
  const preview = document.getElementById('mermaid-preview');
  if (preview) {
    preview.textContent = diagram.exportToMermaid();
  }
};

// Listen for changes
const eventBus = diagram.get('eventBus');
eventBus.on(['commandStack.changed', 'elements.changed'], () => {
  updatePreview();
});

// Initial preview update
updatePreview();

// Make diagram globally accessible for debugging
(window as any).diagram = diagram;

console.log('Sequence Diagram Editor initialized');
console.log('Usage:');
console.log('  1. Click elements in the palette on the left');
console.log('  2. Click on the canvas to place them');
console.log('  3. Use "Connect" in the context pad to create messages');
console.log('  4. Select elements to edit their properties');
console.log('  5. Export to Mermaid format using the buttons above');
