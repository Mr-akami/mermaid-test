import { DiagramModel } from './model/DiagramModel';
import { MermaidExporter } from './model/MermaidExporter';
import { Canvas2DRenderer } from './renderer/Canvas2DRenderer';
import { Canvas2DInteractionHandler } from './interactions/Canvas2DInteractionHandler';
import { IconToolbar } from './ui/IconToolbar';
import { PropertyPanel } from './ui/PropertyPanel';
import { CodeEditor } from './ui/CodeEditor';
import './style.css';

/**
 * Main application entry point
 */
class SequenceEditorApp {
  private model: DiagramModel;
  private renderer: Canvas2DRenderer;
  private interactionHandler: Canvas2DInteractionHandler;
  private toolbar: IconToolbar;
  private propertyPanel: PropertyPanel;
  private codeEditor: CodeEditor;
  private exporter: MermaidExporter;
  private canvas: HTMLCanvasElement;

  constructor() {
    // Initialize model with sample data
    this.model = new DiagramModel({
      participants: [
        { id: 'Alice', type: 'actor', label: 'Alice', links: [] },
        { id: 'Bob', type: 'participant', label: 'Bob', links: [] },
        { id: 'John', type: 'participant', label: 'John', links: [] }
      ],
      statements: [
        {
          sender: 'Alice',
          receiver: 'Bob',
          arrow: '->>',
          text: 'Hello Bob!'
        },
        {
          sender: 'Bob',
          receiver: 'John',
          arrow: '-->>' ,
          text: 'How about you John?'
        },
        {
          position: 'right',
          participants: ['John'],
          text: 'Bob thinks a long<br/>long time'
        },
        {
          sender: 'John',
          receiver: 'Alice',
          arrow: '->>',
          text: 'Checking with John...'
        }
      ],
      autoNumber: false
    });

    this.exporter = new MermaidExporter();

    // Setup UI
    this.setupUI();

    // Get canvas
    this.canvas = document.getElementById('diagram-canvas') as HTMLCanvasElement;

    // Initialize renderer
    this.renderer = new Canvas2DRenderer(this.canvas, this.model);

    // Initialize property panel
    this.propertyPanel = new PropertyPanel(this.model);
    document.body.appendChild(this.propertyPanel.getElement());

    // Initialize code editor
    this.codeEditor = new CodeEditor(this.model);
    document.body.appendChild(this.codeEditor.getElement());
    this.codeEditor.hide(); // Hidden by default

    // Initialize interaction handler
    this.interactionHandler = new Canvas2DInteractionHandler(
      this.canvas,
      this.renderer,
      this.model,
      {
        onSelect: (element) => this.propertyPanel.setSelected(element)
      }
    );

    // Initialize toolbar
    this.toolbar = new IconToolbar({
      onAddParticipant: () => this.interactionHandler.setMode('add-participant'),
      onAddActor: () => this.interactionHandler.setMode('add-actor'),
      onAddMessage: (arrow) => this.interactionHandler.setMode('create-edge', { arrowType: arrow }),
      onAddNote: () => this.addNote(),
      onAddLoop: () => this.addLoop(),
      onAddAlt: () => this.addAlt(),
      onAddOpt: () => this.addOpt(),
      onAddPar: () => this.addPar(),
      onSelect: () => this.interactionHandler.setMode('select'),
      onRectangleSelect: () => this.interactionHandler.setMode('rectangle-select'),
      onToggleAutoNumber: () => this.toggleAutoNumber(),
      onToggleCodeEditor: () => this.codeEditor.toggle(),
      onExport: () => this.exportMermaid()
    });
    document.body.appendChild(this.toolbar.getElement());
  }

  private setupUI(): void {
    const app = document.getElementById('app')!;
    app.innerHTML = `
      <canvas id="diagram-canvas" style="
        position: fixed;
        top: 68px;
        left: 0;
        right: 320px;
        bottom: 0;
        background: #ffffff;
        cursor: default;
      "></canvas>
      <div id="output-panel" style="
        position: fixed;
        bottom: 0;
        left: 0;
        right: 320px;
        height: 200px;
        background: #1e1e1e;
        color: #d4d4d4;
        padding: 10px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        overflow: auto;
        border-top: 1px solid #333;
        display: none;
        z-index: 100;
      ">
        <pre id="output-content"></pre>
      </div>
    `;
  }

  private addNote(): void {
    const participants = this.model.getOrderedParticipants();
    if (participants.length < 1) {
      // Silently return, user can see there are no participants
      return;
    }

    // Create note with default values (will be edited in PropertyPanel)
    const participantId = participants[0].id;

    this.model.addStatement({
      position: 'right',
      participants: [participantId],
      text: 'Note text'
    });
  }

  private addLoop(): void {
    // Create loop with default label (will be edited in PropertyPanel)
    this.model.addStatement({
      type: 'loop',
      label: 'Loop',
      statements: []
    });
  }

  private addAlt(): void {
    // Create alt with default condition (will be edited in PropertyPanel)
    this.model.addStatement({
      type: 'alt',
      branches: [
        {
          condition: 'Condition',
          statements: []
        }
      ]
    });
  }

  private addOpt(): void {
    // Create opt with default condition (will be edited in PropertyPanel)
    this.model.addStatement({
      type: 'opt',
      condition: 'Condition',
      statements: []
    });
  }

  private addPar(): void {
    // Create par with default branches (will be edited in PropertyPanel)
    this.model.addStatement({
      type: 'par',
      branches: [
        {
          label: 'Branch 1',
          statements: []
        },
        {
          label: 'Branch 2',
          statements: []
        }
      ]
    });
  }

  private toggleAutoNumber(): void {
    const current = this.model.getDiagram().autoNumber;
    this.model.setAutoNumber(!current);
    this.toolbar.updateAutoNumber(!current);
  }

  private exportMermaid(): void {
    const mermaidCode = this.exporter.export(this.model.getDiagram());

    // Show output panel
    const outputPanel = document.getElementById('output-panel')!;
    const outputContent = document.getElementById('output-content')!;

    outputPanel.style.display = 'block';
    outputContent.textContent = mermaidCode;

    // Also copy to clipboard
    navigator.clipboard.writeText(mermaidCode).then(() => {
      console.log('Mermaid code copied to clipboard');
    }).catch(() => {
      console.log('Failed to copy to clipboard');
    });

    // Adjust canvas
    this.canvas.style.bottom = '200px';

    // Add close button if not exists
    if (!outputPanel.querySelector('.close-btn')) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'close-btn';
      closeBtn.textContent = '✕ Close';
      closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        padding: 5px 10px;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      `;
      closeBtn.onclick = () => {
        outputPanel.style.display = 'none';
        this.canvas.style.bottom = '0';
      };
      outputPanel.appendChild(closeBtn);
    }
  }
}

// Initialize app
new SequenceEditorApp();
