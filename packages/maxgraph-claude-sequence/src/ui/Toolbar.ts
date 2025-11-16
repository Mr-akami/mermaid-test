import { SequenceGraph } from '../graph/SequenceGraph';

export class Toolbar {
  private container: HTMLElement;
  private currentTool: string = 'select';

  constructor(container: HTMLElement, _graph: SequenceGraph) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="toolbar">
        <button id="tool-select" class="tool-btn active" title="Select Tool">
          <span>🖱️</span> Select
        </button>

        <div class="toolbar-separator"></div>

        <button id="tool-participant" class="tool-btn" title="Add Participant">
          <span>📦</span> Participant
        </button>

        <button id="tool-actor" class="tool-btn" title="Add Actor">
          <span>👤</span> Actor
        </button>

        <div class="toolbar-separator"></div>

        <button id="tool-message" class="tool-btn" title="Create Message">
          <span>➡️</span> Message
        </button>

        <button id="tool-note" class="tool-btn" title="Add Note">
          <span>📝</span> Note
        </button>

        <div class="toolbar-separator"></div>

        <button id="tool-loop" class="tool-btn" title="Add Loop">
          <span>🔁</span> Loop
        </button>

        <button id="tool-alt" class="tool-btn" title="Add Alt">
          <span>🔀</span> Alt
        </button>

        <button id="tool-opt" class="tool-btn" title="Add Opt">
          <span>❓</span> Opt
        </button>

        <div class="toolbar-separator"></div>

        <button id="tool-export" class="tool-btn" title="Export to Mermaid">
          <span>📤</span> Export
        </button>

        <button id="tool-clear" class="tool-btn" title="Clear Diagram">
          <span>🗑️</span> Clear
        </button>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Select tool
    document.getElementById('tool-select')?.addEventListener('click', () => {
      this.setTool('select');
    });

    // Participant tool
    document.getElementById('tool-participant')?.addEventListener('click', () => {
      this.setTool('participant');
    });

    // Actor tool
    document.getElementById('tool-actor')?.addEventListener('click', () => {
      this.setTool('actor');
    });

    // Message tool
    document.getElementById('tool-message')?.addEventListener('click', () => {
      this.setTool('message');
      alert('Click on a lifeline, then click on another lifeline to create a message');
    });

    // Note tool
    document.getElementById('tool-note')?.addEventListener('click', () => {
      this.setTool('note');
    });

    // Loop tool
    document.getElementById('tool-loop')?.addEventListener('click', () => {
      this.setTool('loop');
    });

    // Alt tool
    document.getElementById('tool-alt')?.addEventListener('click', () => {
      this.setTool('alt');
    });

    // Opt tool
    document.getElementById('tool-opt')?.addEventListener('click', () => {
      this.setTool('opt');
    });

    // Export tool
    document.getElementById('tool-export')?.addEventListener('click', () => {
      this.handleExport();
    });

    // Clear tool
    document.getElementById('tool-clear')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the entire diagram?')) {
        this.handleClear();
      }
    });
  }

  private setTool(tool: string): void {
    this.currentTool = tool;

    // Update button states
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    const activeBtn = document.getElementById(`tool-${tool}`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
  }

  public getCurrentTool(): string {
    return this.currentTool;
  }

  private handleExport(): void {
    // This will be implemented in the MermaidExporter
    const event = new CustomEvent('export-diagram');
    window.dispatchEvent(event);
  }

  private handleClear(): void {
    const event = new CustomEvent('clear-diagram');
    window.dispatchEvent(event);
  }
}
