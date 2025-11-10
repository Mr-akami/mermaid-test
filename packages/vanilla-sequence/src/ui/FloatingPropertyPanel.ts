import { Participant } from '../models/Participant';
import { Message } from '../models/Message';
import { Note } from '../models/Note';
import { Block } from '../models/Block';
import type { ArrowType, ParticipantType, NotePosition } from '../types';

export type PropertyTarget = Participant | Message | Note | Block | null;

export class FloatingPropertyPanel {
  private panel: HTMLDivElement;
  private target: PropertyTarget = null;
  private onUpdate: () => void;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };

  constructor(onUpdate: () => void) {
    this.onUpdate = onUpdate;
    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      width: 300px;
      background: white;
      border: 2px solid #333;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: none;
      z-index: 1000;
      overflow: hidden;
    `;
    document.body.appendChild(this.panel);
    this.setupDragging();
  }

  private setupDragging(): void {
    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('property-header')) {
        this.isDragging = true;
        const rect = this.panel.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (this.isDragging) {
        this.panel.style.left = `${e.clientX - this.dragOffset.x}px`;
        this.panel.style.top = `${e.clientY - this.dragOffset.y}px`;
        this.panel.style.right = 'auto';
      }
    };

    const onMouseUp = () => {
      this.isDragging = false;
    };

    this.panel.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  show(target: PropertyTarget): void {
    this.target = target;
    this.panel.style.display = 'block';
    this.render();
  }

  hide(): void {
    this.panel.style.display = 'none';
    this.target = null;
  }

  isVisible(): boolean {
    return this.panel.style.display === 'block';
  }

  private render(): void {
    this.panel.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'property-header';
    header.style.cssText = `
      background: #333;
      color: white;
      padding: 10px;
      font-weight: bold;
      cursor: move;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const title = document.createElement('span');
    title.textContent = this.getTitle();
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
    `;
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);

    this.panel.appendChild(header);

    const content = document.createElement('div');
    content.style.cssText = `
      padding: 15px;
      max-height: 400px;
      overflow-y: auto;
    `;

    if (this.target instanceof Participant) {
      this.renderParticipantProperties(content);
    } else if (this.target instanceof Message) {
      this.renderMessageProperties(content);
    } else if (this.target instanceof Note) {
      this.renderNoteProperties(content);
    } else if (this.target instanceof Block) {
      this.renderBlockProperties(content);
    }

    this.panel.appendChild(content);
  }

  private getTitle(): string {
    if (this.target instanceof Participant) return 'Participant Properties';
    if (this.target instanceof Message) return 'Message Properties';
    if (this.target instanceof Note) return 'Note Properties';
    if (this.target instanceof Block) return `${this.target.type} Properties`;
    return 'Properties';
  }

  private renderParticipantProperties(container: HTMLElement): void {
    if (!(this.target instanceof Participant)) return;
    const p = this.target;

    this.addField(container, 'ID', 'text', p.id, () => {
      // IDは変更不可（参照があるため）
    }, true);

    this.addField(container, 'Type', 'select', p.type, (value) => {
      p.type = value as ParticipantType;
      this.onUpdate();
    }, false, ['participant', 'actor']);

    this.addField(container, 'Label', 'text', p.label || '', (value) => {
      p.setLabel(value);
      this.onUpdate();
    });

    this.addField(container, 'Explicit', 'checkbox', p.isExplicit, (value) => {
      p.isExplicit = value === 'true' || value === true;
      this.onUpdate();
    });

    // Links
    const linksLabel = document.createElement('div');
    linksLabel.textContent = 'Links:';
    linksLabel.style.marginTop = '10px';
    linksLabel.style.fontWeight = 'bold';
    container.appendChild(linksLabel);

    p.links.forEach((link, index) => {
      const linkDiv = document.createElement('div');
      linkDiv.style.cssText = 'margin: 5px 0; padding: 5px; background: #f5f5f5; border-radius: 4px;';
      linkDiv.innerHTML = `
        <div style="font-size: 12px;">${link.label}: <a href="${link.url}" target="_blank">${link.url}</a></div>
        <button class="remove-link" data-index="${index}" style="margin-top: 5px; font-size: 11px;">Remove</button>
      `;
      container.appendChild(linkDiv);
    });

    const addLinkBtn = document.createElement('button');
    addLinkBtn.textContent = '+ Add Link';
    addLinkBtn.style.cssText = 'margin-top: 5px; padding: 5px 10px;';
    addLinkBtn.addEventListener('click', () => {
      const label = prompt('Link label:');
      const url = prompt('Link URL:');
      if (label && url) {
        p.addLink(label, url);
        this.render();
        this.onUpdate();
      }
    });
    container.appendChild(addLinkBtn);

    container.querySelectorAll('.remove-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt((e.target as HTMLElement).dataset.index || '0');
        p.removeLink(index);
        this.render();
        this.onUpdate();
      });
    });
  }

  private renderMessageProperties(container: HTMLElement): void {
    if (!(this.target instanceof Message)) return;
    const m = this.target;

    this.addField(container, 'From', 'text', m.from, () => {}, true);
    this.addField(container, 'To', 'text', m.to, () => {}, true);

    const arrowTypes: ArrowType[] = ['->', '-->', '->>', '-->>', '<<-->>', '<<-->>>', '-x', '--x', '-)', '--))'];
    this.addField(container, 'Arrow Type', 'select', m.arrowType, (value) => {
      m.setArrowType(value as ArrowType);
      this.onUpdate();
    }, false, arrowTypes);

    this.addField(container, 'Text', 'textarea', m.text, (value) => {
      m.setText(value);
      this.onUpdate();
    });

    this.addField(container, 'Activate From', 'checkbox', m.activateFrom, (value) => {
      m.activateFrom = value === 'true' || value === true;
      this.onUpdate();
    });

    this.addField(container, 'Activate To', 'checkbox', m.activateTo, (value) => {
      m.activateTo = value === 'true' || value === true;
      this.onUpdate();
    });

    this.addField(container, 'Deactivate From', 'checkbox', m.deactivateFrom, (value) => {
      m.deactivateFrom = value === 'true' || value === true;
      this.onUpdate();
    });

    this.addField(container, 'Deactivate To', 'checkbox', m.deactivateTo, (value) => {
      m.deactivateTo = value === 'true' || value === true;
      this.onUpdate();
    });
  }

  private renderNoteProperties(container: HTMLElement): void {
    if (!(this.target instanceof Note)) return;
    const n = this.target;

    const positions: NotePosition[] = ['left of', 'right of', 'over'];
    this.addField(container, 'Position', 'select', n.position, (value) => {
      n.setPosition(value as NotePosition);
      this.onUpdate();
    }, false, positions);

    this.addField(container, 'Text', 'textarea', n.text, (value) => {
      n.setText(value);
      this.onUpdate();
    });

    this.addField(container, 'Participants', 'text', n.participants.join(', '), () => {}, true);
  }

  private renderBlockProperties(container: HTMLElement): void {
    if (!(this.target instanceof Block)) return;
    const b = this.target;

    this.addField(container, 'Type', 'text', b.type, () => {}, true);

    this.addField(container, 'Label', 'text', b.label, (value) => {
      b.label = value;
      this.onUpdate();
    });

    if (b.type === 'rect' || b.type === 'box') {
      this.addField(container, 'Color (rgb)', 'text',
        b.color ? `${b.color.r},${b.color.g},${b.color.b}` : '',
        (value: string) => {
          const parts = value.split(',').map(s => parseInt(s.trim()));
          if (parts.length >= 3) {
            b.setColor({ r: parts[0], g: parts[1], b: parts[2], a: parts[3] });
            this.onUpdate();
          }
        });
    }
  }

  private addField(
    container: HTMLElement,
    label: string,
    type: string,
    value: any,
    onChange: (value: any) => void,
    readonly: boolean = false,
    options?: string[]
  ): void {
    const fieldDiv = document.createElement('div');
    fieldDiv.style.cssText = 'margin-bottom: 12px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = 'display: block; margin-bottom: 4px; font-weight: 500; font-size: 13px;';
    fieldDiv.appendChild(labelEl);

    let input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    if (type === 'select' && options) {
      input = document.createElement('select');
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        option.selected = opt === value;
        input.appendChild(option);
      });
    } else if (type === 'textarea') {
      input = document.createElement('textarea');
      input.value = value;
      (input as HTMLTextAreaElement).rows = 3;
    } else if (type === 'checkbox') {
      input = document.createElement('input');
      input.type = 'checkbox';
      (input as HTMLInputElement).checked = value === true || value === 'true';
    } else {
      input = document.createElement('input');
      input.type = type;
      input.value = value;
    }

    input.style.cssText = `
      width: 100%;
      padding: 6px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 13px;
    `;

    if (readonly) {
      input.disabled = true;
      input.style.background = '#f0f0f0';
    }

    if (type === 'checkbox') {
      input.style.width = 'auto';
    }

    input.addEventListener('change', () => {
      const val = type === 'checkbox' ? (input as HTMLInputElement).checked : input.value;
      onChange(val);
    });

    fieldDiv.appendChild(input);
    container.appendChild(fieldDiv);
  }
}
