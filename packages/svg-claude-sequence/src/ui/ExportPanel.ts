import { DiagramModel } from '../model/DiagramModel';
import { MermaidExporter } from '../export/MermaidExporter';

export class ExportPanel {
  private container: HTMLElement;
  private model: DiagramModel;
  private exporter: MermaidExporter;

  constructor(container: HTMLElement, model: DiagramModel) {
    this.container = container;
    this.model = model;
    this.exporter = new MermaidExporter();
    this.setupPanel();
  }

  private setupPanel(): void {
    this.container.innerHTML = `
      <div id="export-panel" style="
        position: absolute;
        right: 10px;
        bottom: 10px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        width: 280px;
      ">
        <h3 style="margin-top: 0; font-size: 14px; color: #333; margin-bottom: 10px;">Export</h3>

        <button id="export-mermaid-btn" style="
          width: 100%;
          padding: 8px;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          margin-bottom: 8px;
        ">Export to Mermaid</button>

        <button id="copy-mermaid-btn" style="
          width: 100%;
          padding: 8px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        ">Copy Mermaid to Clipboard</button>

        <div id="export-output" style="
          margin-top: 10px;
          padding: 8px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 3px;
          font-family: monospace;
          font-size: 10px;
          max-height: 150px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-all;
          display: none;
        "></div>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const exportBtn = this.container.querySelector('#export-mermaid-btn');
    const copyBtn = this.container.querySelector('#copy-mermaid-btn');
    const output = this.container.querySelector('#export-output') as HTMLElement;

    exportBtn?.addEventListener('click', () => {
      const mermaidCode = this.exporter.export(this.model.getDiagram());
      output.textContent = mermaidCode;
      output.style.display = 'block';
    });

    copyBtn?.addEventListener('click', async () => {
      const mermaidCode = this.exporter.export(this.model.getDiagram());

      try {
        await navigator.clipboard.writeText(mermaidCode);
        this.showToast('Copied to clipboard!');
      } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = mermaidCode;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.showToast('Copied to clipboard!');
      }
    });
  }

  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #323232;
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10000;
      animation: fadeInOut 2s ease-in-out;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
        10% { opacity: 1; transform: translateX(-50%) translateY(0); }
        90% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
      style.remove();
    }, 2000);
  }
}
