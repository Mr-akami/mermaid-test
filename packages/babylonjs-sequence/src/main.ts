import './style.css';
import { CanvasEditor } from './editor/CanvasEditor';
import type { SequenceDiagram } from './models/types';
import { ParticipantType, ArrowType, NotePosition } from './models/types';
import { MermaidParser } from './parser/MermaidParser';
import { MermaidGenerator } from './generator/MermaidGenerator';
import { IconPalette } from './ui/IconPalette';
import { PropertyPanel } from './ui/PropertyPanel';

// Global error handler
window.addEventListener('error', (event) => {
  console.error('GLOBAL ERROR:', event.error);
  console.error('Error message:', event.message);
  console.error('Error stack:', event.error?.stack);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('UNHANDLED PROMISE REJECTION:', event.reason);
});

console.log('Application starting...');

// Create sample diagram
let sampleDiagram: SequenceDiagram = {
  participants: [
    { id: 'Alice', type: ParticipantType.ACTOR, label: 'Alice' },
    { id: 'Bob', type: ParticipantType.PARTICIPANT, label: 'Bob' },
    { id: 'Charlie', type: ParticipantType.PARTICIPANT, label: 'Charlie' },
  ],
  boxes: [],
  elements: [
    {
      type: 'message',
      data: {
        id: 'msg1',
        sender: 'Alice',
        receiver: 'Bob',
        arrowType: ArrowType.SOLID_ARROW,
        text: 'Hello Bob!',
      },
    },
    {
      type: 'message',
      data: {
        id: 'msg2',
        sender: 'Bob',
        receiver: 'Charlie',
        arrowType: ArrowType.DASHED_ARROW,
        text: 'Hi Charlie',
      },
    },
    {
      type: 'note',
      data: {
        id: 'note1',
        position: NotePosition.RIGHT,
        participants: ['Bob'],
        text: 'Bob thinks...',
      },
    },
    {
      type: 'message',
      data: {
        id: 'msg3',
        sender: 'Charlie',
        receiver: 'Alice',
        arrowType: ArrowType.SOLID_ARROW,
        text: 'Response',
      },
    },
  ],
  autoNumber: false,
};

// Setup HTML
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="container">
    <div class="toolbar">
      <h1>Sequence Diagram Editor (2D Canvas)</h1>
      <div class="controls">
        <button id="addMessage">Create Message</button>
        <button id="exportMermaid">Export Mermaid</button>
        <button id="importMermaid">Import Mermaid</button>
      </div>
    </div>
    <div class="editor-container">
      <div class="palette-container" id="paletteContainer"></div>
      <div class="canvas-container">
        <canvas id="renderCanvas"></canvas>
      </div>
      <div class="sidebar">
        <div class="property-container" id="propertyContainer"></div>
        <div class="text-editor">
          <h3>Mermaid Text</h3>
          <textarea id="mermaidText" placeholder="Enter Mermaid sequence diagram..."></textarea>
        </div>
      </div>
    </div>
  </div>
`;

// Initialize editor
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
if (!canvas) {
  console.error('ERROR: Canvas element not found!');
  alert('ERROR: Canvas element not found!');
  throw new Error('Canvas element not found');
}

console.log('Initializing CanvasEditor...');
const editor = new CanvasEditor(canvas, sampleDiagram);
console.log('CanvasEditor initialized successfully');

// Initialize parser and generator
const parser = new MermaidParser();
const generator = new MermaidGenerator();

// Initialize UI components
const paletteContainer = document.getElementById('paletteContainer') as HTMLElement;
const palette = new IconPalette(paletteContainer);

const propertyContainer = document.getElementById('propertyContainer') as HTMLElement;
const propertyPanel = new PropertyPanel(propertyContainer);

// Setup event handlers
const mermaidTextArea = document.getElementById('mermaidText') as HTMLTextAreaElement;

// Display initial Mermaid text
mermaidTextArea.value = generator.generate(sampleDiagram);

// Palette events
palette.onParticipantCreate = (participant) => {
  editor.addParticipant(participant);
  mermaidTextArea.value = generator.generate(sampleDiagram);
};

palette.onNoteCreateMode = () => {
  editor.enableNoteCreation();
};

palette.onMessageCreateMode = () => {
  editor.enableMessageCreation();
};

// Editor events
editor.onSelectionChange = (element) => {
  propertyPanel.setSelectedElement(element);
};

editor.onDiagramChange = (diagram) => {
  sampleDiagram = diagram;
  mermaidTextArea.value = generator.generate(diagram);
};

// Property panel event
propertyPanel.onPropertyChange = () => {
  editor.render();
  mermaidTextArea.value = generator.generate(sampleDiagram);
};

// Button events
document.getElementById('addMessage')?.addEventListener('click', () => {
  editor.enableMessageCreation();
  alert('Click on a lifeline, then click on another lifeline to create a message');
});

document.getElementById('exportMermaid')?.addEventListener('click', () => {
  const mermaidText = generator.generate(sampleDiagram);
  mermaidTextArea.value = mermaidText;

  // Copy to clipboard
  navigator.clipboard.writeText(mermaidText);
  alert('Mermaid text copied to clipboard!');
});

document.getElementById('importMermaid')?.addEventListener('click', () => {
  try {
    const diagram = parser.parse(mermaidTextArea.value);
    sampleDiagram = diagram;
    editor.updateDiagram(diagram);
  } catch (error) {
    console.error('Parse error:', error);
    alert('Error parsing Mermaid text: ' + (error as Error).message);
  }
});
