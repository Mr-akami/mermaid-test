/**
 * PropertiesPanel - Provides UI for editing element properties
 */

import type { EventBus, Canvas } from 'diagram-js';
import type { ArrowType } from '../../types/sequence';
// @ts-ignore - diagram-js modules don't have type definitions
import SelectionModule from 'diagram-js/lib/features/selection';

export default class PropertiesPanel {
  static $inject = ['eventBus', 'canvas', 'sequenceModeling'];

  private panel: HTMLElement | null = null;
  private selectedElement: any = null;

  constructor(
    private eventBus: EventBus,
    private canvas: Canvas,
    private sequenceModeling: any
  ) {
    this.init();
  }

  private init(): void {
    this.eventBus.on('selection.changed', (event: any) => {
      const { newSelection } = event;
      this.selectedElement = newSelection.length > 0 ? newSelection[0] : null;
      this.updatePanel();
    });

    this.eventBus.on('element.changed', (event: any) => {
      if (event.element === this.selectedElement) {
        this.updatePanel();
      }
    });
  }

  attachTo(container: HTMLElement): void {
    this.panel = document.createElement('div');
    this.panel.className = 'properties-panel';
    container.appendChild(this.panel);
    this.updatePanel();
  }

  private updatePanel(): void {
    if (!this.panel) return;

    this.panel.innerHTML = '';

    if (!this.selectedElement) {
      this.panel.innerHTML = '<div class="properties-empty">No element selected</div>';
      return;
    }

    const header = document.createElement('h3');
    header.textContent = 'Properties';
    this.panel.appendChild(header);

    const type = this.selectedElement.type;

    if (type === 'participant' || type === 'actor') {
      this.renderParticipantProperties();
    } else if (type === 'message') {
      this.renderMessageProperties();
    } else if (type === 'note') {
      this.renderNoteProperties();
    } else if (['loop', 'alt', 'opt', 'par', 'critical', 'break', 'rect', 'box'].includes(type)) {
      this.renderBlockProperties();
    }
  }

  private renderParticipantProperties(): void {
    const { businessObject } = this.selectedElement;

    // ID
    this.addProperty('ID', businessObject?.id || '', false);

    // Label
    this.addTextInput('Label', businessObject?.label || '', (value: string) => {
      this.sequenceModeling.updateParticipantLabel(this.selectedElement, value);
    });

    // Type
    this.addProperty('Type', this.selectedElement.type, false);
  }

  private renderMessageProperties(): void {
    const { businessObject } = this.selectedElement;

    // Arrow Type
    const arrowTypes: ArrowType[] = [
      '->>', '-->', '->',  '-->>',
      '<<->>', '<<-->>',
      '-x', '--x',
      '-)', '--)'
    ];

    this.addSelect('Arrow Type', businessObject?.arrowType || '->>', arrowTypes, (value: string) => {
      this.sequenceModeling.updateMessageArrowType(this.selectedElement, value);
    });

    // Message Text
    this.addTextInput('Message', businessObject?.text || '', (value: string) => {
      this.sequenceModeling.updateMessageText(this.selectedElement, value);
    });

    // Source and Target
    if (this.selectedElement.source && this.selectedElement.target) {
      this.addProperty('From', this.selectedElement.source.businessObject?.id || '', false);
      this.addProperty('To', this.selectedElement.target.businessObject?.id || '', false);
    }

    // Order
    this.addProperty('Order', String(businessObject?.order || 0), false);
  }

  private renderNoteProperties(): void {
    const { businessObject } = this.selectedElement;

    // Note Text
    this.addTextArea('Note Text', businessObject?.text || '', (value: string) => {
      this.sequenceModeling.updateNoteText(this.selectedElement, value);
    });

    // Position
    this.addSelect('Position', businessObject?.position || 'right', ['left', 'right', 'over'], (value: string) => {
      const newBusinessObject = {
        ...businessObject,
        position: value
      };
      this.sequenceModeling.modeling.updateProperties(this.selectedElement, {
        businessObject: newBusinessObject
      });
    });
  }

  private renderBlockProperties(): void {
    const { businessObject } = this.selectedElement;

    // Type
    this.addProperty('Type', this.selectedElement.type, false);

    // Label
    this.addTextInput('Label', businessObject?.label || '', (value: string) => {
      this.sequenceModeling.updateBlockLabel(this.selectedElement, value);
    });

    // Color (for rect and box)
    if (this.selectedElement.type === 'rect' || this.selectedElement.type === 'box') {
      this.addTextInput('Color', businessObject?.color || '', (value: string) => {
        const newBusinessObject = {
          ...businessObject,
          color: value
        };
        this.sequenceModeling.modeling.updateProperties(this.selectedElement, {
          businessObject: newBusinessObject
        });
      });
    }
  }

  private addProperty(label: string, value: string, editable: boolean = false): void {
    const row = document.createElement('div');
    row.className = 'property-row';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.textContent = value;
    valueEl.className = 'property-value';
    row.appendChild(valueEl);

    this.panel!.appendChild(row);
  }

  private addTextInput(label: string, value: string, onChange: (value: string) => void): void {
    const row = document.createElement('div');
    row.className = 'property-row';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.className = 'property-input';
    input.addEventListener('change', () => onChange(input.value));
    input.addEventListener('blur', () => onChange(input.value));
    row.appendChild(input);

    this.panel!.appendChild(row);
  }

  private addTextArea(label: string, value: string, onChange: (value: string) => void): void {
    const row = document.createElement('div');
    row.className = 'property-row';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.className = 'property-textarea';
    textarea.rows = 4;
    textarea.addEventListener('change', () => onChange(textarea.value));
    textarea.addEventListener('blur', () => onChange(textarea.value));
    row.appendChild(textarea);

    this.panel!.appendChild(row);
  }

  private addSelect(label: string, value: string, options: string[], onChange: (value: string) => void): void {
    const row = document.createElement('div');
    row.className = 'property-row';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const select = document.createElement('select');
    select.className = 'property-select';

    options.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option;
      optionEl.textContent = option;
      optionEl.selected = option === value;
      select.appendChild(optionEl);
    });

    select.addEventListener('change', () => onChange(select.value));
    row.appendChild(select);

    this.panel!.appendChild(row);
  }
}

export const PropertiesPanelModule = {
  __depends__: [
    SelectionModule
  ],
  __init__: ['propertiesPanel'],
  propertiesPanel: ['type', PropertiesPanel]
};
