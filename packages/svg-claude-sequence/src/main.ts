import './style.css';
import { DiagramModel } from './model/DiagramModel';
import { SVGRenderer } from './renderer/SVGRenderer';
import { InteractionHandler } from './interaction/InteractionHandler';
import { Toolbar } from './ui/Toolbar';
import { PropertyPanel } from './ui/PropertyPanel';
import { ExportPanel } from './ui/ExportPanel';

class SequenceDiagramEditor {
  private model: DiagramModel;
  private renderer: SVGRenderer;
  private interactionHandler: InteractionHandler;

  constructor() {
    this.setupUI();
    this.model = new DiagramModel();
    this.renderer = new SVGRenderer(document.getElementById('canvas-container')!);
    this.interactionHandler = new InteractionHandler(this.model, this.renderer);
    new Toolbar(document.getElementById('toolbar-container')!, this.interactionHandler);
    new PropertyPanel(document.getElementById('property-container')!, this.model);
    new ExportPanel(document.getElementById('export-container')!, this.model);

    this.setupEventListeners();
    this.render();
  }

  private setupUI(): void {
    document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
      <div id="editor-container" style="position: relative; width: 100vw; height: 100vh; overflow: hidden;">
        <div id="toolbar-container"></div>
        <div id="property-container"></div>
        <div id="export-container"></div>
        <div id="canvas-container" style="width: 100%; height: 100%;"></div>

        <div id="status-bar" style="
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 25px;
          background: #f5f5f5;
          border-top: 1px solid #ccc;
          display: flex;
          align-items: center;
          padding: 0 10px;
          font-size: 11px;
          color: #666;
        ">
          <span id="status-text">Ready</span>
          <span style="margin-left: auto;">SVG Sequence Diagram Editor</span>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    // Listen to model changes and re-render
    this.model.addListener(() => {
      this.render();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      this.interactionHandler.handleKeyDown(event);
    });

    // Update status bar based on interaction mode
    const updateStatus = () => {
      const mode = this.interactionHandler.getMode();
      const statusText = document.getElementById('status-text');
      if (statusText) {
        const modeMessages: Record<string, string> = {
          select: 'Select mode - Click elements to select, drag to move',
          addParticipant: 'Click on canvas to add a participant',
          addActor: 'Click on canvas to add an actor',
          addMessage: 'Click source lifeline, then target lifeline',
          addNote: 'Click on a lifeline to add a note',
          addLoop: 'Drag to select area for loop block',
          addAlt: 'Drag to select area for alt block',
          addOpt: 'Drag to select area for opt block',
          addPar: 'Drag to select area for parallel block',
          addCritical: 'Drag to select area for critical block',
          addBreak: 'Drag to select area for break block',
          addRect: 'Drag to select area for highlight rectangle'
        };
        statusText.textContent = modeMessages[mode] || 'Ready';
      }
    };

    // Check mode changes periodically (simple approach)
    setInterval(updateStatus, 100);
  }

  private render(): void {
    const diagram = this.model.getDiagram();
    const selectedId = this.model.getSelectedElementId();
    this.renderer.render(diagram, selectedId);
  }

  // Demo: Add sample data
  addSampleData(): void {
    // Add participants
    const alice = this.model.addParticipant('participant', 100, 50);
    this.model.updateParticipant(alice.id, { label: 'Alice' });

    const bob = this.model.addParticipant('participant', 300, 50);
    this.model.updateParticipant(bob.id, { label: 'Bob' });

    const charlie = this.model.addParticipant('actor', 500, 50);
    this.model.updateParticipant(charlie.id, { label: 'Charlie' });

    // Add messages
    const msg1 = this.model.addMessage(alice.id, bob.id, '->>', 150);
    this.model.updateMessage(msg1.id, { text: 'Hello Bob!' });

    const msg2 = this.model.addMessage(bob.id, charlie.id, '-->>', 200);
    this.model.updateMessage(msg2.id, { text: 'Forward to Charlie' });

    const msg3 = this.model.addMessage(charlie.id, bob.id, '->>', 250);
    this.model.updateMessage(msg3.id, { text: 'Response' });

    const msg4 = this.model.addMessage(bob.id, alice.id, '-->', 300);
    this.model.updateMessage(msg4.id, { text: 'Done' });

    // Add a note
    const note1 = this.model.addNote('right', [alice.id], 180);
    this.model.updateNote(note1.id, { text: 'Alice sends<br/>a greeting' });

    // Add a loop
    this.model.addControlStructure('loop', 1, 2, 80, 190, 450, 80);
    const loop = this.model.getDiagram().controlStructures[0];
    this.model.updateControlStructure(loop.id, { label: 'Every 5 seconds' });
  }
}

// Initialize the editor
const editor = new SequenceDiagramEditor();

// Add sample data for demonstration
// Comment this out if you want to start with an empty canvas
editor.addSampleData();

// Expose editor to window for debugging
(window as any).editor = editor;
