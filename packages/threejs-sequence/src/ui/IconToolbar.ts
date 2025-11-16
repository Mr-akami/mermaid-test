import type { ArrowType } from '../model/types';

export interface ToolbarCallbacks {
  onAddParticipant: () => void;
  onAddActor: () => void;
  onAddMessage: (arrow: ArrowType) => void;
  onAddNote: () => void;
  onAddLoop: () => void;
  onAddAlt: () => void;
  onAddOpt: () => void;
  onAddPar: () => void;
  onSelect: () => void;
  onRectangleSelect: () => void;
  onToggleAutoNumber: () => void;
  onToggleCodeEditor: () => void;
  onExport: () => void;
}

/**
 * IconToolbar provides icon-based UI controls
 */
export class IconToolbar {
  private element: HTMLElement;
  private callbacks: ToolbarCallbacks;
  private activeButton: HTMLButtonElement | null = null;

  constructor(callbacks: ToolbarCallbacks) {
    this.callbacks = callbacks;
    this.element = this.createToolbar();
  }

  private createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'icon-toolbar';
    toolbar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 320px;
      background: #2c3e50;
      padding: 10px 20px;
      display: flex;
      gap: 5px;
      align-items: center;
      z-index: 1000;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;

    // Selection tools
    toolbar.appendChild(this.createIconButton('Select', '🖱️', () => {
      this.callbacks.onSelect();
      this.setActiveButton(null);
    }, 'Select and drag elements'));

    toolbar.appendChild(this.createIconButton('Rectangle', '⬚', () => {
      this.callbacks.onRectangleSelect();
    }, 'Rectangle selection for control structures'));

    toolbar.appendChild(this.createSeparator());

    // Participants
    toolbar.appendChild(this.createIconButton('Participant', '📦', () => {
      this.callbacks.onAddParticipant();
    }, 'Click on canvas to add participant'));

    toolbar.appendChild(this.createIconButton('Actor', '🧑', () => {
      this.callbacks.onAddActor();
    }, 'Click on canvas to add actor'));

    toolbar.appendChild(this.createSeparator());

    // Messages
    toolbar.appendChild(this.createIconButton('Solid', '→', () => {
      this.callbacks.onAddMessage('->>');
    }, 'Click lifeline to lifeline to create solid message'));

    toolbar.appendChild(this.createIconButton('Dashed', '⇢', () => {
      this.callbacks.onAddMessage('-->>');
    }, 'Click lifeline to lifeline to create dashed message'));

    toolbar.appendChild(this.createIconButton('Async', '↷', () => {
      this.callbacks.onAddMessage('-)');
    }, 'Click lifeline to lifeline to create async message'));

    toolbar.appendChild(this.createIconButton('Delete', '✕', () => {
      this.callbacks.onAddMessage('-x');
    }, 'Click lifeline to lifeline to create delete message'));

    toolbar.appendChild(this.createSeparator());

    // Notes
    toolbar.appendChild(this.createIconButton('Note', '📝', () => {
      this.callbacks.onAddNote();
    }, 'Add note'));

    toolbar.appendChild(this.createSeparator());

    // Control structures
    toolbar.appendChild(this.createIconButton('Loop', '🔁', () => {
      this.callbacks.onAddLoop();
    }, 'Add loop structure'));

    toolbar.appendChild(this.createIconButton('Alt', '🔀', () => {
      this.callbacks.onAddAlt();
    }, 'Add alternative (if-else) structure'));

    toolbar.appendChild(this.createIconButton('Opt', '❓', () => {
      this.callbacks.onAddOpt();
    }, 'Add optional structure'));

    toolbar.appendChild(this.createIconButton('Par', '⫴', () => {
      this.callbacks.onAddPar();
    }, 'Add parallel structure'));

    // Right side
    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    toolbar.appendChild(spacer);

    // Auto number checkbox
    const autoNumberLabel = document.createElement('label');
    autoNumberLabel.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      color: #ecf0f1;
      font-size: 14px;
      cursor: pointer;
      padding: 8px 12px;
      border-radius: 4px;
      transition: background-color 0.2s;
    `;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.cursor = 'pointer';
    checkbox.onchange = () => this.callbacks.onToggleAutoNumber();

    const checkboxLabel = document.createElement('span');
    checkboxLabel.textContent = 'Auto Number';

    autoNumberLabel.appendChild(checkbox);
    autoNumberLabel.appendChild(checkboxLabel);
    toolbar.appendChild(autoNumberLabel);

    // Code editor toggle button
    const codeBtn = this.createButton('Live Code', () => {
      this.callbacks.onToggleCodeEditor();
    });
    toolbar.appendChild(codeBtn);

    // Export button
    const exportBtn = this.createButton('Export Mermaid', () => {
      this.callbacks.onExport();
    });
    toolbar.appendChild(exportBtn);

    return toolbar;
  }

  private createIconButton(
    label: string,
    icon: string,
    onClick: () => void,
    tooltip?: string
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'icon-button';
    button.title = tooltip || label;
    button.style.cssText = `
      width: 48px;
      height: 48px;
      background: #34495e;
      border: none;
      border-radius: 6px;
      color: #ecf0f1;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      transition: all 0.2s;
      position: relative;
    `;

    const iconSpan = document.createElement('span');
    iconSpan.textContent = icon;
    iconSpan.style.fontSize = '20px';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    labelSpan.style.fontSize = '9px';
    labelSpan.style.fontWeight = 'bold';

    button.appendChild(iconSpan);
    button.appendChild(labelSpan);

    button.onmouseenter = () => {
      if (!button.classList.contains('active')) {
        button.style.background = '#3d5a73';
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
      }
    };

    button.onmouseleave = () => {
      if (!button.classList.contains('active')) {
        button.style.background = '#34495e';
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = 'none';
      }
    };

    button.onclick = () => {
      this.setActiveButton(button);
      onClick();
    };

    return button;
  }

  private setActiveButton(button: HTMLButtonElement | null): void {
    if (this.activeButton) {
      this.activeButton.classList.remove('active');
      this.activeButton.style.background = '#34495e';
      this.activeButton.style.boxShadow = 'none';
    }

    this.activeButton = button;

    if (button) {
      button.classList.add('active');
      button.style.background = '#2980b9';
      button.style.boxShadow = 'inset 0 0 0 2px #3498db';
    }
  }

  private createButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = label;
    button.onclick = onClick;
    button.style.cssText = `
      padding: 10px 20px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      transition: all 0.2s;
    `;

    button.onmouseenter = () => {
      button.style.background = '#2980b9';
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    };

    button.onmouseleave = () => {
      button.style.background = '#3498db';
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = 'none';
    };

    return button;
  }

  private createSeparator(): HTMLElement {
    const separator = document.createElement('div');
    separator.style.cssText = `
      width: 1px;
      height: 40px;
      background: #7f8c8d;
      margin: 0 5px;
    `;
    return separator;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  updateAutoNumber(enabled: boolean): void {
    const checkbox = this.element.querySelector('input[type="checkbox"]') as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = enabled;
    }
  }
}
