import type { DiagramModel } from '../model/DiagramModel';
import { MermaidExporter } from '../model/MermaidExporter';
import { MermaidParser } from '../model/MermaidParser';

export interface CodeEditorOptions {
  onCodeChange?: (code: string) => void;
}

/**
 * Live code editor with bidirectional sync
 */
export class CodeEditor {
  private element: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private model: DiagramModel;
  private exporter: MermaidExporter;
  private parser: MermaidParser;
  private isUpdatingFromModel = false;
  private isUpdatingFromCode = false;
  private onCodeChangeCallback?: (code: string) => void;

  constructor(model: DiagramModel, options?: CodeEditorOptions) {
    this.model = model;
    this.exporter = new MermaidExporter();
    this.parser = new MermaidParser();
    this.onCodeChangeCallback = options?.onCodeChange;

    this.element = this.createEditor();
    this.textarea = this.element.querySelector('textarea')!;

    // Listen to model changes
    this.model.onChange(() => this.updateCodeFromModel());

    // Initial sync
    this.updateCodeFromModel();
  }

  private createEditor(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'code-editor';
    container.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 320px;
      height: 300px;
      background: #1e1e1e;
      border-top: 2px solid #444;
      display: flex;
      flex-direction: column;
      z-index: 100;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      background: #2d2d2d;
      padding: 8px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #444;
    `;

    const title = document.createElement('span');
    title.textContent = 'Mermaid Code (Live Edit)';
    title.style.cssText = `
      color: #e0e0e0;
      font-size: 14px;
      font-weight: bold;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: #e0e0e0;
      font-size: 18px;
      cursor: pointer;
      padding: 0 8px;
    `;
    closeBtn.onclick = () => this.hide();

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Textarea
    const textarea = document.createElement('textarea');
    textarea.style.cssText = `
      flex: 1;
      background: #1e1e1e;
      color: #d4d4d4;
      border: none;
      padding: 16px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.6;
      resize: none;
      outline: none;
    `;
    textarea.spellcheck = false;

    // Handle input with debounce
    let timeout: NodeJS.Timeout;
    textarea.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.updateModelFromCode(textarea.value);
      }, 500); // 500ms debounce
    });

    container.appendChild(header);
    container.appendChild(textarea);

    return container;
  }

  private updateCodeFromModel(): void {
    if (this.isUpdatingFromCode) return;

    this.isUpdatingFromModel = true;
    const code = this.exporter.export(this.model.getDiagram());
    this.textarea.value = code;
    this.isUpdatingFromModel = false;

    if (this.onCodeChangeCallback) {
      this.onCodeChangeCallback(code);
    }
  }

  private updateModelFromCode(code: string): void {
    if (this.isUpdatingFromModel) return;

    this.isUpdatingFromCode = true;

    try {
      const diagram = this.parser.parse(code);

      // Clear current model
      const currentParticipants = this.model.getParticipants();
      currentParticipants.forEach(p => this.model.removeParticipant(p.id));

      const currentStatements = this.model.getStatements();
      for (let i = currentStatements.length - 1; i >= 0; i--) {
        this.model.removeStatement(i);
      }

      // Add parsed participants
      diagram.participants.forEach(p => this.model.addParticipant(p));

      // Add parsed statements
      diagram.statements.forEach(s => this.model.addStatement(s));

      // Update auto number
      this.model.setAutoNumber(diagram.autoNumber);

    } catch (error) {
      console.error('Failed to parse Mermaid code:', error);
    }

    this.isUpdatingFromCode = false;
  }

  show(): void {
    this.element.style.display = 'flex';
    // Adjust canvas
    const canvas = document.getElementById('diagram-canvas') as HTMLCanvasElement;
    if (canvas) {
      canvas.style.bottom = '300px';
    }
  }

  hide(): void {
    this.element.style.display = 'none';
    // Restore canvas
    const canvas = document.getElementById('diagram-canvas') as HTMLCanvasElement;
    if (canvas) {
      canvas.style.bottom = '0';
    }
  }

  toggle(): void {
    if (this.element.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  getCode(): string {
    return this.textarea.value;
  }
}
