import './style.css';
import { SequenceDiagramModel } from './model/DiagramModel';
import { SequenceGraph } from './graph/SequenceGraph';
import { PropertyPanel } from './ui/PropertyPanel';
import { Toolbar } from './ui/Toolbar';
import { MermaidExporter } from './export/MermaidExporter';

class SequenceDiagramEditor {
  private model: SequenceDiagramModel;
  private graph: SequenceGraph;
  private toolbar: Toolbar;
  private exporter: MermaidExporter;

  constructor() {
    this.setupDOM();

    const graphContainer = document.getElementById('graph-container') as HTMLElement;
    const propertyContainer = document.getElementById('property-panel') as HTMLElement;
    const toolbarContainer = document.getElementById('toolbar') as HTMLElement;

    // Initialize model
    this.model = new SequenceDiagramModel();

    // Initialize graph
    this.graph = new SequenceGraph(graphContainer, this.model);

    // Initialize UI components
    this.toolbar = new Toolbar(toolbarContainer, this.graph);
    new PropertyPanel(propertyContainer, this.model, this.graph);

    // Initialize exporter
    this.exporter = new MermaidExporter(this.model);

    this.setupCanvasClickHandler();
    this.setupEventHandlers();
    this.loadSampleDiagram();
  }

  private setupDOM(): void {
    document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
      <div class="editor-container">
        <header>
          <h1>Sequence Diagram Editor</h1>
          <p>Create and edit Mermaid sequence diagrams with GUI</p>
        </header>

        <div id="toolbar"></div>

        <div class="main-content">
          <div id="graph-container" class="graph-container"></div>
          <div id="property-panel" class="property-panel-container"></div>
        </div>

        <div id="export-modal" class="modal hidden">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Export Mermaid Code</h3>
              <button id="close-modal" class="close-btn">✕</button>
            </div>
            <div class="modal-body">
              <textarea id="export-code" readonly rows="20"></textarea>
            </div>
            <div class="modal-footer">
              <button id="copy-code" class="btn btn-primary">Copy to Clipboard</button>
              <button id="download-code" class="btn btn-secondary">Download</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private setupCanvasClickHandler(): void {
    const graphContainer = document.getElementById('graph-container');
    if (!graphContainer) return;

    graphContainer.addEventListener('click', (e) => {
      const tool = this.toolbar.getCurrentTool();

      // Only handle canvas clicks for creation tools
      if (tool === 'participant' || tool === 'actor') {
        const rect = graphContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (tool === 'participant') {
          const label = prompt('Enter participant label:', 'Participant');
          if (label) {
            this.graph.createParticipant(x, y, 'participant', label);
          }
        } else if (tool === 'actor') {
          const label = prompt('Enter actor label:', 'Actor');
          if (label) {
            this.graph.createParticipant(x, y, 'actor', label);
          }
        }
      }
    });
  }

  private setupEventHandlers(): void {
    // Export diagram
    window.addEventListener('export-diagram', () => {
      this.showExportModal();
    });

    // Clear diagram
    window.addEventListener('clear-diagram', () => {
      this.model.clear();
    });

    // Export modal handlers
    document.getElementById('close-modal')?.addEventListener('click', () => {
      this.hideExportModal();
    });

    document.getElementById('copy-code')?.addEventListener('click', () => {
      this.exporter.exportToClipboard();
    });

    document.getElementById('download-code')?.addEventListener('click', () => {
      this.exporter.exportToFile();
      this.hideExportModal();
    });

    // Close modal on outside click
    document.getElementById('export-modal')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'export-modal') {
        this.hideExportModal();
      }
    });
  }

  private showExportModal(): void {
    const modal = document.getElementById('export-modal');
    const textarea = document.getElementById('export-code') as HTMLTextAreaElement;

    if (modal && textarea) {
      const mermaidCode = this.exporter.export();
      textarea.value = mermaidCode;
      modal.classList.remove('hidden');
    }
  }

  private hideExportModal(): void {
    const modal = document.getElementById('export-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  private loadSampleDiagram(): void {
    // Create sample participants
    this.graph.createParticipant(50, 50, 'actor', 'Alice');
    this.graph.createParticipant(250, 50, 'participant', 'Server');
    this.graph.createParticipant(450, 50, 'actor', 'Bob');
  }
}

// Initialize the editor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SequenceDiagramEditor();
});
