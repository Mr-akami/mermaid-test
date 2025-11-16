import type { DiagramModel } from '../model/DiagramModel';
import type { Participant, Message, Note } from '../model/types';

export type SelectedElement =
  | { type: 'participant'; data: Participant }
  | { type: 'message'; data: Message; index: number }
  | { type: 'note'; data: Note; index: number }
  | { type: 'controlStructure'; data: any; index: number }
  | null;

/**
 * PropertyPanel allows editing properties of selected elements
 */
export class PropertyPanel {
  private element: HTMLElement;
  private model: DiagramModel;
  private selected: SelectedElement = null;

  constructor(model: DiagramModel) {
    this.model = model;
    this.element = this.createPanel();
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'property-panel';
    panel.style.cssText = `
      position: fixed;
      top: 60px;
      right: 0;
      width: 300px;
      bottom: 0;
      background: #fafafa;
      border-left: 1px solid #ddd;
      padding: 20px;
      overflow-y: auto;
      font-family: Arial, sans-serif;
      z-index: 999;
    `;

    panel.innerHTML = `
      <div style="color: #999; text-align: center; padding: 40px 20px;">
        Select an element to edit its properties
      </div>
    `;

    return panel;
  }

  setSelected(selected: SelectedElement): void {
    this.selected = selected;
    this.render();
  }

  private render(): void {
    this.element.innerHTML = '';

    if (!this.selected) {
      this.element.innerHTML = `
        <div style="color: #999; text-align: center; padding: 40px 20px;">
          Select an element to edit its properties
        </div>
      `;
      return;
    }

    switch (this.selected.type) {
      case 'participant':
        this.renderParticipantProperties(this.selected.data);
        break;
      case 'message':
        this.renderMessageProperties(this.selected.data, this.selected.index);
        break;
      case 'note':
        this.renderNoteProperties(this.selected.data, this.selected.index);
        break;
      case 'controlStructure':
        this.renderControlStructureProperties(this.selected.data, this.selected.index);
        break;
    }
  }

  private renderParticipantProperties(participant: Participant): void {
    const title = this.createTitle('Participant Properties');
    this.element.appendChild(title);

    // Type
    this.element.appendChild(this.createSelect(
      'Type',
      participant.type,
      [
        { value: 'participant', label: 'Participant' },
        { value: 'actor', label: 'Actor' }
      ],
      (value) => {
        this.model.updateParticipant(participant.id, { type: value as 'participant' | 'actor' });
      }
    ));

    // ID
    this.element.appendChild(this.createInput(
      'ID',
      participant.id,
      (_value) => {
        // Note: Changing ID requires more complex handling
        console.warn('ID change not implemented');
      },
      true // disabled
    ));

    // Label
    this.element.appendChild(this.createInput(
      'Label',
      participant.label || '',
      (value) => {
        this.model.updateParticipant(participant.id, { label: value || undefined });
      }
    ));

    // Delete button
    this.element.appendChild(this.createDeleteButton(() => {
      this.model.removeParticipant(participant.id);
      this.setSelected(null);
    }));
  }

  private renderMessageProperties(message: Message, index: number): void {
    const title = this.createTitle('Message Properties');
    this.element.appendChild(title);

    // Arrow type
    this.element.appendChild(this.createSelect(
      'Arrow Type',
      message.arrow,
      [
        { value: '->>', label: 'Solid Arrow' },
        { value: '-->>', label: 'Dashed Arrow' },
        { value: '-)', label: 'Async' },
        { value: '-x', label: 'Delete (X)' },
        { value: '->', label: 'Solid Line' },
        { value: '-->', label: 'Dashed Line' }
      ],
      (value) => {
        this.model.updateStatement(index, { ...message, arrow: value as any });
      }
    ));

    // Text
    this.element.appendChild(this.createTextarea(
      'Message Text',
      message.text || '',
      (value) => {
        this.model.updateStatement(index, { ...message, text: value });
      }
    ));

    // Get all participants for dropdown
    const participants = this.model.getOrderedParticipants();
    const participantOptions = participants.map(p => ({
      value: p.id,
      label: p.label || p.id
    }));

    // Sender
    this.element.appendChild(this.createSelect(
      'From',
      message.sender,
      participantOptions,
      (value) => {
        this.model.updateStatement(index, { ...message, sender: value });
      }
    ));

    // Receiver
    this.element.appendChild(this.createSelect(
      'To',
      message.receiver,
      participantOptions,
      (value) => {
        this.model.updateStatement(index, { ...message, receiver: value });
      }
    ));

    // Delete button
    this.element.appendChild(this.createDeleteButton(() => {
      this.model.removeStatement(index);
      this.setSelected(null);
    }));
  }

  private renderNoteProperties(note: Note, index: number): void {
    const title = this.createTitle('Note Properties');
    this.element.appendChild(title);

    // Get all participants for dropdown
    const participants = this.model.getOrderedParticipants();
    const participantOptions = participants.map(p => ({
      value: p.id,
      label: p.label || p.id
    }));

    // Participant
    this.element.appendChild(this.createSelect(
      'Participant',
      note.participants[0] || '',
      participantOptions,
      (value) => {
        const statements = this.model.getStatements();
        const stmt = statements[index];
        if ('position' in stmt) {
          this.model.updateStatement(index, { ...stmt, participants: [value] });
        }
      }
    ));

    // Position
    this.element.appendChild(this.createSelect(
      'Position',
      note.position,
      [
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
        { value: 'over', label: 'Over' }
      ],
      (value) => {
        const statements = this.model.getStatements();
        const stmt = statements[index];
        if ('position' in stmt) {
          this.model.updateStatement(index, { ...stmt, position: value as any });
        }
      }
    ));

    // Text
    this.element.appendChild(this.createTextarea(
      'Note Text',
      note.text,
      (value) => {
        const statements = this.model.getStatements();
        const stmt = statements[index];
        if ('position' in stmt) {
          this.model.updateStatement(index, { ...stmt, text: value });
        }
      }
    ));

    // Delete button
    this.element.appendChild(this.createDeleteButton(() => {
      this.model.removeStatement(index);
      this.setSelected(null);
    }));
  }

  private createTitle(text: string): HTMLElement {
    const title = document.createElement('h3');
    title.textContent = text;
    title.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 16px;
      color: #333;
      border-bottom: 2px solid #2196f3;
      padding-bottom: 10px;
    `;
    return title;
  }

  private createInput(label: string, value: string, onChange: (value: string) => void, disabled: boolean = false): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 15px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      display: block;
      font-size: 12px;
      font-weight: bold;
      color: #666;
      margin-bottom: 5px;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.disabled = disabled;
    input.style.cssText = `
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
    `;
    input.oninput = () => onChange(input.value);

    container.appendChild(labelEl);
    container.appendChild(input);
    return container;
  }

  private createTextarea(label: string, value: string, onChange: (value: string) => void): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 15px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      display: block;
      font-size: 12px;
      font-weight: bold;
      color: #666;
      margin-bottom: 5px;
    `;

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.rows = 3;
    textarea.style.cssText = `
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      font-family: Arial, sans-serif;
      resize: vertical;
      box-sizing: border-box;
    `;
    textarea.oninput = () => onChange(textarea.value);

    container.appendChild(labelEl);
    container.appendChild(textarea);
    return container;
  }

  private createSelect(label: string, value: string, options: Array<{ value: string; label: string }>, onChange: (value: string) => void): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 15px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      display: block;
      font-size: 12px;
      font-weight: bold;
      color: #666;
      margin-bottom: 5px;
    `;

    const select = document.createElement('select');
    select.style.cssText = `
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
    `;

    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      option.selected = opt.value === value;
      select.appendChild(option);
    });

    select.onchange = () => onChange(select.value);

    container.appendChild(labelEl);
    container.appendChild(select);
    return container;
  }

  private renderControlStructureProperties(structure: any, index: number): void {
    const title = this.createTitle(`${structure.type.toUpperCase()} Properties`);
    this.element.appendChild(title);

    // Type-specific fields
    if (structure.type === 'loop') {
      // Loop label
      this.element.appendChild(this.createInput(
        'Loop Condition',
        structure.label || '',
        (value) => {
          const statements = this.model.getStatements();
          const stmt = statements[index];
          if ('type' in stmt && stmt.type === 'loop') {
            this.model.updateStatement(index, { ...stmt, label: value });
          }
        }
      ));
    } else if (structure.type === 'alt') {
      // Alt branches (if/else if/else)
      this.renderAltBranches(structure, index);
    } else if (structure.type === 'opt') {
      // Opt condition
      this.element.appendChild(this.createInput(
        'Condition',
        structure.condition || '',
        (value) => {
          const statements = this.model.getStatements();
          const stmt = statements[index];
          if ('type' in stmt && stmt.type === 'opt') {
            this.model.updateStatement(index, { ...stmt, condition: value });
          }
        }
      ));
    } else if (structure.type === 'par') {
      // Par branches (parallel execution)
      this.renderParBranches(structure, index);
    }

    // Delete button
    this.element.appendChild(this.createDeleteButton(() => {
      this.model.removeStatement(index);
      this.setSelected(null);
    }));
  }

  private renderAltBranches(structure: any, index: number): void {
    if (!structure.branches) return;

    const branchesContainer = document.createElement('div');
    branchesContainer.style.cssText = 'margin-bottom: 15px;';

    const branchesLabel = document.createElement('label');
    branchesLabel.textContent = 'Branches';
    branchesLabel.style.cssText = `
      display: block;
      font-size: 12px;
      font-weight: bold;
      color: #666;
      margin-bottom: 10px;
    `;
    branchesContainer.appendChild(branchesLabel);

    // Render each branch
    structure.branches.forEach((branch: any, branchIndex: number) => {
      const branchDiv = document.createElement('div');
      branchDiv.style.cssText = `
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 10px;
        margin-bottom: 10px;
      `;

      // Branch header
      const branchHeader = document.createElement('div');
      branchHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      `;

      const branchTitle = document.createElement('span');
      branchTitle.textContent = branchIndex === 0 ? 'If' : (branchIndex === structure.branches.length - 1 && !branch.condition ? 'Else' : 'Else If');
      branchTitle.style.cssText = `
        font-size: 11px;
        font-weight: bold;
        color: #999;
      `;

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '✕';
      deleteBtn.style.cssText = `
        background: none;
        border: none;
        color: #f44336;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        width: 20px;
        height: 20px;
      `;
      deleteBtn.onclick = () => {
        const statements = this.model.getStatements();
        const stmt = statements[index];
        if ('type' in stmt && stmt.type === 'alt' && (stmt as any).branches) {
          const updated = { ...stmt };
          (updated as any).branches = (updated as any).branches.filter((_: any, i: number) => i !== branchIndex);
          if ((updated as any).branches.length > 0) {
            this.model.updateStatement(index, updated);
            this.setSelected({ type: 'controlStructure', data: updated, index });
          }
        }
      };

      branchHeader.appendChild(branchTitle);
      if (structure.branches.length > 1) {
        branchHeader.appendChild(deleteBtn);
      }
      branchDiv.appendChild(branchHeader);

      // Condition input (not for final else)
      const isElse = branchIndex === structure.branches.length - 1 && !branch.condition;
      if (!isElse || branchIndex > 0) {
        const conditionInput = document.createElement('input');
        conditionInput.type = 'text';
        conditionInput.value = branch.condition || '';
        conditionInput.placeholder = branchIndex === 0 ? 'condition' : 'else if condition';
        conditionInput.style.cssText = `
          width: 100%;
          padding: 6px;
          border: 1px solid #ddd;
          border-radius: 3px;
          font-size: 13px;
          box-sizing: border-box;
        `;
        conditionInput.oninput = () => {
          const statements = this.model.getStatements();
          const stmt = statements[index];
          if ('type' in stmt && stmt.type === 'alt' && (stmt as any).branches) {
            const updated = { ...stmt };
            (updated as any).branches[branchIndex].condition = conditionInput.value;
            this.model.updateStatement(index, updated);
          }
        };
        branchDiv.appendChild(conditionInput);
      }

      branchesContainer.appendChild(branchDiv);
    });

    // Add branch button
    const addBranchBtn = document.createElement('button');
    addBranchBtn.textContent = '+ Add Else If';
    addBranchBtn.style.cssText = `
      width: 100%;
      padding: 8px;
      background: #4caf50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      margin-bottom: 5px;
    `;
    addBranchBtn.onclick = () => {
      const statements = this.model.getStatements();
      const stmt = statements[index];
      if ('type' in stmt && stmt.type === 'alt' && (stmt as any).branches) {
        const updated = { ...stmt };
        const newBranch = { condition: '', statements: [] };
        (updated as any).branches.push(newBranch);
        this.model.updateStatement(index, updated);
        this.setSelected({ type: 'controlStructure', data: updated, index });
      }
    };
    branchesContainer.appendChild(addBranchBtn);

    // Add else button (without condition)
    const addElseBtn = document.createElement('button');
    addElseBtn.textContent = '+ Add Else';
    addElseBtn.style.cssText = `
      width: 100%;
      padding: 8px;
      background: #2196f3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    addElseBtn.onclick = () => {
      const statements = this.model.getStatements();
      const stmt = statements[index];
      if ('type' in stmt && stmt.type === 'alt' && (stmt as any).branches) {
        const updated = { ...stmt };
        const newBranch = { condition: '', statements: [] };
        (updated as any).branches.push(newBranch);
        this.model.updateStatement(index, updated);
        this.setSelected({ type: 'controlStructure', data: updated, index });
      }
    };
    branchesContainer.appendChild(addElseBtn);

    this.element.appendChild(branchesContainer);
  }

  private renderParBranches(structure: any, index: number): void {
    if (!structure.branches) return;

    const branchesContainer = document.createElement('div');
    branchesContainer.style.cssText = 'margin-bottom: 15px;';

    const branchesLabel = document.createElement('label');
    branchesLabel.textContent = 'Parallel Branches';
    branchesLabel.style.cssText = `
      display: block;
      font-size: 12px;
      font-weight: bold;
      color: #666;
      margin-bottom: 10px;
    `;
    branchesContainer.appendChild(branchesLabel);

    // Render each branch
    structure.branches.forEach((branch: any, branchIndex: number) => {
      const branchDiv = document.createElement('div');
      branchDiv.style.cssText = `
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 10px;
        margin-bottom: 10px;
      `;

      // Branch header
      const branchHeader = document.createElement('div');
      branchHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      `;

      const branchTitle = document.createElement('span');
      branchTitle.textContent = `Branch ${branchIndex + 1}`;
      branchTitle.style.cssText = `
        font-size: 11px;
        font-weight: bold;
        color: #999;
      `;

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '✕';
      deleteBtn.style.cssText = `
        background: none;
        border: none;
        color: #f44336;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        width: 20px;
        height: 20px;
      `;
      deleteBtn.onclick = () => {
        const statements = this.model.getStatements();
        const stmt = statements[index];
        if ('type' in stmt && stmt.type === 'par' && (stmt as any).branches) {
          const updated = { ...stmt };
          (updated as any).branches = (updated as any).branches.filter((_: any, i: number) => i !== branchIndex);
          if ((updated as any).branches.length > 0) {
            this.model.updateStatement(index, updated);
            this.setSelected({ type: 'controlStructure', data: updated, index });
          }
        }
      };

      branchHeader.appendChild(branchTitle);
      if (structure.branches.length > 1) {
        branchHeader.appendChild(deleteBtn);
      }
      branchDiv.appendChild(branchHeader);

      // Label input
      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.value = branch.label || '';
      labelInput.placeholder = `Branch ${branchIndex + 1} label`;
      labelInput.style.cssText = `
        width: 100%;
        padding: 6px;
        border: 1px solid #ddd;
        border-radius: 3px;
        font-size: 13px;
        box-sizing: border-box;
      `;
      labelInput.oninput = () => {
        const statements = this.model.getStatements();
        const stmt = statements[index];
        if ('type' in stmt && stmt.type === 'par' && (stmt as any).branches) {
          const updated = { ...stmt };
          (updated as any).branches[branchIndex].label = labelInput.value;
          this.model.updateStatement(index, updated);
        }
      };
      branchDiv.appendChild(labelInput);

      branchesContainer.appendChild(branchDiv);
    });

    // Add branch button
    const addBranchBtn = document.createElement('button');
    addBranchBtn.textContent = '+ Add Parallel Branch';
    addBranchBtn.style.cssText = `
      width: 100%;
      padding: 8px;
      background: #4caf50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    addBranchBtn.onclick = () => {
      const statements = this.model.getStatements();
      const stmt = statements[index];
      if ('type' in stmt && stmt.type === 'par' && (stmt as any).branches) {
        const updated = { ...stmt };
        const newBranch = { label: '', statements: [] };
        (updated as any).branches.push(newBranch);
        this.model.updateStatement(index, updated);
        this.setSelected({ type: 'controlStructure', data: updated, index });
      }
    };
    branchesContainer.appendChild(addBranchBtn);

    this.element.appendChild(branchesContainer);
  }

  private createDeleteButton(onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    button.textContent = 'Delete';
    button.onclick = onClick;
    button.style.cssText = `
      width: 100%;
      padding: 10px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      margin-top: 20px;
    `;

    button.onmouseenter = () => {
      button.style.background = '#d32f2f';
    };

    button.onmouseleave = () => {
      button.style.background = '#f44336';
    };

    return button;
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
