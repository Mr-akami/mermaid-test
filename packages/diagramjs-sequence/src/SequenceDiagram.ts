/**
 * SequenceDiagram - Main diagram class that extends diagram-js
 */

import Diagram from 'diagram-js';
import type { DiagramOptions } from 'diagram-js';

// Core diagram-js modules
// @ts-ignore - diagram-js modules don't have type definitions
import CoreModule from 'diagram-js/lib/core';
// @ts-ignore - diagram-js modules don't have type definitions
import SelectionModule from 'diagram-js/lib/features/selection';
// @ts-ignore - diagram-js modules don't have type definitions
import MoveModule from 'diagram-js/lib/features/move';
// @ts-ignore - diagram-js modules don't have type definitions
import ZoomScrollModule from 'diagram-js/lib/navigation/zoomscroll';
// @ts-ignore - diagram-js modules don't have type definitions
import MoveCanvasModule from 'diagram-js/lib/navigation/movecanvas';

// Custom modules
import { SequenceRendererModule } from './modules/renderer/SequenceRenderer';
import { SequencePaletteModule } from './modules/palette/SequencePalette';
import { SequenceContextPadModule } from './modules/contextPad/SequenceContextPad';
import { SequenceRulesModule } from './modules/rules/SequenceRules';
import { SequenceModelingModule } from './modules/modeling/SequenceModeling';
import { SequenceOrderingBehaviorModule } from './modules/ordering/SequenceOrderingBehavior';
import { PropertiesPanelModule } from './modules/properties/PropertiesPanel';
import { MermaidExporterModule } from './modules/export/MermaidExporter';

export interface SequenceDiagramOptions extends DiagramOptions {
  container?: HTMLElement | string;
  propertiesPanel?: HTMLElement | string;
  additionalModules?: any[];
}

export default class SequenceDiagram extends Diagram {
  constructor(options: SequenceDiagramOptions = {}) {
    const modules = [
      CoreModule,
      SelectionModule,
      MoveModule,
      ZoomScrollModule,
      MoveCanvasModule,
      SequenceRendererModule,
      SequencePaletteModule,
      SequenceContextPadModule,
      SequenceRulesModule,
      SequenceModelingModule,
      SequenceOrderingBehaviorModule,
      PropertiesPanelModule,
      MermaidExporterModule,
      ...(options.additionalModules || [])
    ];

    super({
      ...options,
      modules
    });

    // Attach properties panel if container provided
    if (options.propertiesPanel) {
      const panelContainer = typeof options.propertiesPanel === 'string'
        ? document.querySelector(options.propertiesPanel)
        : options.propertiesPanel;

      if (panelContainer) {
        const propertiesPanel = this.get('propertiesPanel');
        propertiesPanel.attachTo(panelContainer as HTMLElement);
      }
    }

    // Initialize canvas
    this.get('canvas').zoom('fit-viewport');
  }

  /**
   * Get the Mermaid exporter
   */
  getExporter() {
    return this.get('mermaidExporter');
  }

  /**
   * Export diagram to Mermaid format
   */
  exportToMermaid(): string {
    return this.getExporter().exportToMermaid();
  }

  /**
   * Download diagram as Mermaid file
   */
  downloadMermaid(filename?: string): void {
    this.getExporter().downloadMermaid(filename);
  }

  /**
   * Copy Mermaid code to clipboard
   */
  async copyToClipboard(): Promise<void> {
    return this.getExporter().copyToClipboard();
  }
}
