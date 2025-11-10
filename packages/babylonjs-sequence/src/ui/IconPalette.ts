import type { Participant, Note } from '../models/types';
import { ParticipantType, NotePosition } from '../models/types';

export class IconPalette {
  private container: HTMLElement;
  public onParticipantCreate?: (participant: Participant) => void;
  public onNoteCreateMode?: () => void;
  public onMessageCreateMode?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="palette">
        <h3>Elements</h3>
        <div class="palette-items">
          <button class="palette-item" data-type="participant">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <rect x="10" y="15" width="40" height="30" fill="#E3F2FD" stroke="#1976D2" stroke-width="2"/>
              <text x="30" y="32" text-anchor="middle" font-size="12" fill="#000">Participant</text>
            </svg>
            <span>Participant</span>
          </button>

          <button class="palette-item" data-type="actor">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <circle cx="30" cy="15" r="6" fill="#E3F2FD" stroke="#1976D2" stroke-width="2"/>
              <line x1="30" y1="21" x2="30" y2="35" stroke="#1976D2" stroke-width="2"/>
              <line x1="20" y1="28" x2="40" y2="28" stroke="#1976D2" stroke-width="2"/>
              <line x1="30" y1="35" x2="23" y2="45" stroke="#1976D2" stroke-width="2"/>
              <line x1="30" y1="35" x2="37" y2="45" stroke="#1976D2" stroke-width="2"/>
              <text x="30" y="55" text-anchor="middle" font-size="10" fill="#000">Actor</text>
            </svg>
            <span>Actor</span>
          </button>

          <button class="palette-item" data-type="note">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <path d="M 10 15 L 10 45 L 50 45 L 50 25 L 40 15 Z" fill="#FFF9C4" stroke="#F57C00" stroke-width="2"/>
              <path d="M 40 15 L 40 25 L 50 25" fill="none" stroke="#F57C00" stroke-width="2"/>
              <line x1="15" y1="25" x2="35" y2="25" stroke="#F57C00" stroke-width="1"/>
              <line x1="15" y1="30" x2="40" y2="30" stroke="#F57C00" stroke-width="1"/>
              <line x1="15" y1="35" x2="35" y2="35" stroke="#F57C00" stroke-width="1"/>
              <text x="30" y="55" text-anchor="middle" font-size="10" fill="#000">Note</text>
            </svg>
            <span>Note</span>
          </button>

          <button class="palette-item" data-type="message">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <line x1="10" y1="30" x2="50" y2="30" stroke="#1976D2" stroke-width="3"/>
              <polygon points="50,30 42,26 42,34" fill="#1976D2"/>
              <text x="30" y="55" text-anchor="middle" font-size="10" fill="#000">Message</text>
            </svg>
            <span>Message</span>
          </button>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const items = this.container.querySelectorAll('.palette-item');

    items.forEach((item) => {
      item.addEventListener('click', () => {
        const type = item.getAttribute('data-type');
        if (type === 'participant' || type === 'actor') {
          this.createParticipant(type as 'participant' | 'actor');
        } else if (type === 'note') {
          this.createNote();
        } else if (type === 'message') {
          this.createMessage();
        }
      });
    });
  }

  private createParticipant(type: 'participant' | 'actor'): void {
    const name = prompt(`Enter ${type} name:`);
    if (!name) return;

    const participant: Participant = {
      id: name,
      type: type === 'actor' ? ParticipantType.ACTOR : ParticipantType.PARTICIPANT,
      label: name,
    };

    if (this.onParticipantCreate) {
      this.onParticipantCreate(participant);
    }
  }

  private createNote(): void {
    if (this.onNoteCreateMode) {
      this.onNoteCreateMode();
    }
    alert('Click on a lifeline to place the note');
  }

  private createMessage(): void {
    if (this.onMessageCreateMode) {
      this.onMessageCreateMode();
    }
    alert('Click on a lifeline, then click on another lifeline to create a message');
  }
}
