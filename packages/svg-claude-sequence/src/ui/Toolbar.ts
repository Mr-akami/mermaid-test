import { InteractionHandler } from '../interaction/InteractionHandler';

export class Toolbar {
  private container: HTMLElement;
  private interactionHandler: InteractionHandler;

  constructor(container: HTMLElement, interactionHandler: InteractionHandler) {
    this.container = container;
    this.interactionHandler = interactionHandler;
    this.setupToolbar();
  }

  private setupToolbar(): void {
    this.container.innerHTML = `
      <div id="toolbar" style="
        position: absolute;
        left: 10px;
        top: 10px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        max-width: 600px;
      ">
        <button class="tool-btn" data-mode="select" title="Select (ESC)" style="
          padding: 8px 12px;
          border: 1px solid #ccc;
          background: #f5f5f5;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s;
        ">
          ↖️ Select
        </button>

        <div style="width: 1px; background: #ccc; margin: 0 4px;"></div>

        <button class="tool-btn" data-mode="addParticipant" title="Add Participant" style="
          padding: 8px 12px;
          border: 1px solid #ccc;
          background: #f5f5f5;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s;
        ">
          📦 Participant
        </button>

        <button class="tool-btn" data-mode="addActor" title="Add Actor" style="
          padding: 8px 12px;
          border: 1px solid #ccc;
          background: #f5f5f5;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s;
        ">
          🧑 Actor
        </button>

        <div style="width: 1px; background: #ccc; margin: 0 4px;"></div>

        <button class="tool-btn" data-mode="addMessage" title="Add Message (click source then target lifeline)" style="
          padding: 8px 12px;
          border: 1px solid #ccc;
          background: #f5f5f5;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s;
        ">
          → Message
        </button>

        <button class="tool-btn" data-mode="addNote" title="Add Note (click on lifeline)" style="
          padding: 8px 12px;
          border: 1px solid #ccc;
          background: #f5f5f5;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s;
        ">
          📝 Note
        </button>

        <div style="width: 1px; background: #ccc; margin: 0 4px;"></div>

        <button class="tool-btn" data-mode="addLoop" title="Add Loop (drag to select area)" style="
          padding: 8px 12px;
          border: 1px solid #ccc;
          background: #f5f5f5;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s;
        ">
          🔁 Loop
        </button>

        <button class="tool-btn" data-mode="addAlt" title="Add Alt (drag to select area)" style="
          padding: 8px 12px;
          border: 1px solid #ccc;
          background: #f5f5f5;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s;
        ">
          🔀 Alt
        </button>

        <button class="tool-btn" data-mode="addOpt" title="Add Opt (drag to select area)" style="
          padding: 8px 12px;
          border: 1px solid #ccc;
          background: #f5f5f5;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s;
        ">
          ❓ Opt
        </button>

        <button class="tool-btn" data-mode="addPar" title="Add Par (drag to select area)" style="
          padding: 8px 12px;
          border: 1px solid #ccc;
          background: #f5f5f5;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s;
        ">
          ⫴ Par
        </button>

        <button class="tool-btn" data-mode="addRect" title="Add Highlight Rectangle (drag to select area)" style="
          padding: 8px 12px;
          border: 1px solid #ccc;
          background: #f5f5f5;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s;
        ">
          ▭ Rect
        </button>
      </div>
    `;

    this.setupEventListeners();
    this.updateActiveButton();
  }

  private setupEventListeners(): void {
    const buttons = this.container.querySelectorAll('.tool-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).getAttribute('data-mode') as any;
        this.interactionHandler.setMode(mode);
        this.updateActiveButton();
      });
    });
  }

  private updateActiveButton(): void {
    const currentMode = this.interactionHandler.getMode();
    const buttons = this.container.querySelectorAll('.tool-btn');

    buttons.forEach(btn => {
      const mode = (btn as HTMLElement).getAttribute('data-mode');
      const button = btn as HTMLElement;

      if (mode === currentMode) {
        button.style.background = '#2196f3';
        button.style.color = 'white';
        button.style.borderColor = '#1976d2';
      } else {
        button.style.background = '#f5f5f5';
        button.style.color = 'black';
        button.style.borderColor = '#ccc';
      }
    });
  }
}
