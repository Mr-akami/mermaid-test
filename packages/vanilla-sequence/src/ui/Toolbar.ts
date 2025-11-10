export type ToolType =
  | 'select'
  | 'participant'
  | 'actor'
  | 'message'
  | 'note'
  | 'loop'
  | 'alt'
  | 'opt'
  | 'par'
  | 'critical'
  | 'break'
  | 'rect'
  | 'box'
  | 'activate'
  | 'export';

export class Toolbar {
  private container: HTMLElement;
  private currentTool: ToolType = 'select';
  private toolButtons: Map<ToolType, HTMLButtonElement> = new Map();
  private onToolChange: (tool: ToolType) => void;

  constructor(container: HTMLElement, onToolChange: (tool: ToolType) => void) {
    this.container = container;
    this.onToolChange = onToolChange;
    this.render();
  }

  private render(): void {
    this.container.style.cssText = `
      padding: 10px;
      background: #f5f5f5;
      border-bottom: 2px solid #ccc;
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
    `;

    const tools: { type: ToolType; label: string; group?: string }[] = [
      { type: 'select', label: '選択', group: 'basic' },
      { type: 'participant', label: 'Participant', group: 'basic' },
      { type: 'actor', label: 'Actor', group: 'basic' },
      { type: 'message', label: 'Message', group: 'basic' },
      { type: 'note', label: 'Note', group: 'basic' },
      { type: 'activate', label: 'Activate', group: 'basic' },
      { type: 'loop', label: 'Loop', group: 'blocks' },
      { type: 'alt', label: 'Alt', group: 'blocks' },
      { type: 'opt', label: 'Opt', group: 'blocks' },
      { type: 'par', label: 'Par', group: 'blocks' },
      { type: 'critical', label: 'Critical', group: 'blocks' },
      { type: 'break', label: 'Break', group: 'blocks' },
      { type: 'rect', label: 'Rect', group: 'blocks' },
      { type: 'box', label: 'Box', group: 'blocks' },
      { type: 'export', label: 'Export Mermaid', group: 'actions' },
    ];

    let currentGroup = '';
    tools.forEach(tool => {
      if (tool.group !== currentGroup) {
        if (currentGroup) {
          const separator = document.createElement('div');
          separator.style.cssText = 'width: 1px; background: #999; margin: 0 5px;';
          this.container.appendChild(separator);
        }
        currentGroup = tool.group || '';
      }

      const button = document.createElement('button');
      button.textContent = tool.label;
      button.style.cssText = `
        padding: 8px 12px;
        border: 1px solid #999;
        background: #fff;
        cursor: pointer;
        border-radius: 4px;
        font-size: 13px;
        transition: all 0.2s;
      `;

      button.addEventListener('mouseenter', () => {
        if (this.currentTool !== tool.type) {
          button.style.background = '#e0e0e0';
        }
      });

      button.addEventListener('mouseleave', () => {
        if (this.currentTool !== tool.type) {
          button.style.background = '#fff';
        }
      });

      button.addEventListener('click', () => {
        this.setTool(tool.type);
      });

      this.toolButtons.set(tool.type, button);
      this.container.appendChild(button);
    });

    this.updateButtonStates();
  }

  setTool(tool: ToolType): void {
    this.currentTool = tool;
    this.updateButtonStates();
    this.onToolChange(tool);
  }

  getCurrentTool(): ToolType {
    return this.currentTool;
  }

  private updateButtonStates(): void {
    this.toolButtons.forEach((button, tool) => {
      if (tool === this.currentTool) {
        button.style.background = '#2196F3';
        button.style.color = '#fff';
        button.style.borderColor = '#1976D2';
      } else {
        button.style.background = '#fff';
        button.style.color = '#000';
        button.style.borderColor = '#999';
      }
    });
  }
}
