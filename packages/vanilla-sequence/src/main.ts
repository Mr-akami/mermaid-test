import './style.css';
import { Diagram } from './models/Diagram';
import { SVGRenderer } from './renderer/SVGRenderer';
import { Toolbar } from './ui/Toolbar';
import type { ToolType } from './ui/Toolbar';
import { FloatingPropertyPanel } from './ui/FloatingPropertyPanel';
import { InteractionManager } from './interactions/InteractionManager';
import { MermaidGenerator } from './parser/MermaidGenerator';

class SequenceEditor {
  private diagram: Diagram;
  private renderer: SVGRenderer;
  private propertyPanel: FloatingPropertyPanel;
  private interactionManager: InteractionManager;
  private generator: MermaidGenerator;

  constructor() {
    this.diagram = new Diagram();
    this.generator = new MermaidGenerator();

    // UI要素を作成
    this.setupUI();

    // コンポーネント初期化
    const toolbarContainer = document.getElementById('toolbar')!;
    const canvasContainer = document.getElementById('canvas')!;

    new Toolbar(toolbarContainer, (tool) => this.onToolChange(tool));
    this.propertyPanel = new FloatingPropertyPanel(() => this.onPropertyUpdate());
    this.renderer = new SVGRenderer(canvasContainer, this.diagram);
    this.interactionManager = new InteractionManager(
      this.diagram,
      this.renderer,
      this.propertyPanel
    );

    // 初期レンダリング
    this.renderer.render();

    // デモデータを追加
    this.loadDemoData();
  }

  private setupUI(): void {
    const app = document.getElementById('app')!;
    app.innerHTML = `
      <div id="toolbar"></div>
      <div id="canvas" style="flex: 1; overflow: auto; background: white;"></div>
      <div id="export-panel" style="display: none; position: fixed; bottom: 20px; right: 20px; background: white; border: 2px solid #333; padding: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 500px; z-index: 2000;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h3 style="margin: 0;">Mermaid Export</h3>
          <button id="close-export" style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
        </div>
        <textarea id="mermaid-output" style="width: 100%; height: 300px; font-family: monospace; font-size: 12px; padding: 10px; border: 1px solid #ccc;"></textarea>
        <button id="copy-mermaid" style="margin-top: 10px; padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy to Clipboard</button>
      </div>
    `;

    app.style.cssText = 'display: flex; flex-direction: column; height: 100vh; margin: 0; padding: 0;';

    // Export panel イベント
    document.getElementById('close-export')?.addEventListener('click', () => {
      document.getElementById('export-panel')!.style.display = 'none';
    });

    document.getElementById('copy-mermaid')?.addEventListener('click', () => {
      const textarea = document.getElementById('mermaid-output') as HTMLTextAreaElement;
      textarea.select();
      document.execCommand('copy');
      alert('Copied to clipboard!');
    });
  }

  private onToolChange(tool: ToolType): void {
    this.interactionManager.setTool(tool);

    if (tool === 'export') {
      this.showExportPanel();
    }
  }

  private onPropertyUpdate(): void {
    this.renderer.render();
  }

  private showExportPanel(): void {
    const mermaidText = this.generator.generate(this.diagram);
    const textarea = document.getElementById('mermaid-output') as HTMLTextAreaElement;
    textarea.value = mermaidText;
    document.getElementById('export-panel')!.style.display = 'block';
  }

  private loadDemoData(): void {
    // デモ用のサンプルデータ
    // ユーザーがすぐに操作できるよう、いくつかのparticipantとmessageを追加
    /*
    const alice = new Participant('Alice', 'participant', true);
    const bob = new Participant('Bob', 'participant', true);
    this.diagram.addParticipant(alice);
    this.diagram.addParticipant(bob);

    const msg1 = new Message('Alice', 'Bob', '->>', 'Hello Bob!');
    const msg2 = new Message('Bob', 'Alice', '-->>', 'Hi Alice!');
    this.diagram.addMessage(msg1);
    this.diagram.addMessage(msg2);

    this.renderer.render();
    */
  }
}

// アプリケーション起動
new SequenceEditor();
