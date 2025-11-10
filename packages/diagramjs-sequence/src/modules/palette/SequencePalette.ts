/**
 * SequencePalette - Provides palette entries for creating sequence diagram elements
 */

import type Palette from 'diagram-js/lib/features/palette/Palette';
import type { PaletteEntry } from 'diagram-js/lib/features/palette/Palette';
import type { Canvas, EventBus, ElementFactory } from 'diagram-js';
// @ts-ignore - diagram-js modules don't have type definitions
import PaletteModule from 'diagram-js/lib/features/palette';
// @ts-ignore - diagram-js modules don't have type definitions
import CreateModule from 'diagram-js/lib/features/create';

const PARTICIPANT_WIDTH = 100;
const PARTICIPANT_HEIGHT = 40;
const ACTOR_WIDTH = 60;
const ACTOR_HEIGHT = 70;
const NOTE_WIDTH = 120;
const NOTE_HEIGHT = 60;

export default class SequencePalette {
  static $inject = ['palette', 'create', 'elementFactory', 'canvas', 'eventBus'];

  constructor(
    private palette: Palette,
    private create: any,
    private elementFactory: ElementFactory,
    private canvas: Canvas,
    private eventBus: EventBus
  ) {
    palette.registerProvider(500, this);
  }

  getPaletteEntries(element?: any): { [key: string]: PaletteEntry } {
    const entries: { [key: string]: PaletteEntry } = {};

    entries['create.participant'] = {
      group: 'elements',
      className: 'palette-entry-participant',
      title: 'Create Participant',
      action: {
        dragstart: this.createParticipant.bind(this),
        click: this.createParticipant.bind(this)
      }
    };

    entries['create.actor'] = {
      group: 'elements',
      className: 'palette-entry-actor',
      title: 'Create Actor',
      action: {
        dragstart: this.createActor.bind(this),
        click: this.createActor.bind(this)
      }
    };

    entries['create.note'] = {
      group: 'elements',
      className: 'palette-entry-note',
      title: 'Create Note',
      action: {
        dragstart: this.createNote.bind(this),
        click: this.createNote.bind(this)
      }
    };

    entries['create.loop'] = {
      group: 'blocks',
      className: 'palette-entry-loop',
      title: 'Create Loop Block',
      action: {
        dragstart: this.createBlock.bind(this, 'loop'),
        click: this.createBlock.bind(this, 'loop')
      }
    };

    entries['create.alt'] = {
      group: 'blocks',
      className: 'palette-entry-alt',
      title: 'Create Alt Block',
      action: {
        dragstart: this.createBlock.bind(this, 'alt'),
        click: this.createBlock.bind(this, 'alt')
      }
    };

    entries['create.opt'] = {
      group: 'blocks',
      className: 'palette-entry-opt',
      title: 'Create Opt Block',
      action: {
        dragstart: this.createBlock.bind(this, 'opt'),
        click: this.createBlock.bind(this, 'opt')
      }
    };

    entries['create.par'] = {
      group: 'blocks',
      className: 'palette-entry-par',
      title: 'Create Par Block',
      action: {
        dragstart: this.createBlock.bind(this, 'par'),
        click: this.createBlock.bind(this, 'par')
      }
    };

    return entries;
  }

  private createParticipant(event: Event): void {
    const shape = this.elementFactory.createShape({
      type: 'participant',
      width: PARTICIPANT_WIDTH,
      height: PARTICIPANT_HEIGHT,
      businessObject: {
        id: this.generateId('participant'),
        isActor: false,
        order: 0
      }
    });

    this.create.start(event, shape);
  }

  private createActor(event: Event): void {
    const shape = this.elementFactory.createShape({
      type: 'actor',
      width: ACTOR_WIDTH,
      height: ACTOR_HEIGHT,
      businessObject: {
        id: this.generateId('actor'),
        isActor: true,
        order: 0
      }
    });

    this.create.start(event, shape);
  }

  private createNote(event: Event): void {
    const shape = this.elementFactory.createShape({
      type: 'note',
      width: NOTE_WIDTH,
      height: NOTE_HEIGHT,
      businessObject: {
        id: this.generateId('note'),
        position: 'right',
        participants: [],
        text: 'Note text',
        order: 0
      }
    });

    this.create.start(event, shape);
  }

  private createBlock(blockType: string, event: Event): void {
    const shape = this.elementFactory.createShape({
      type: blockType,
      width: 200,
      height: 150,
      businessObject: {
        id: this.generateId(blockType),
        type: blockType,
        label: blockType,
        startOrder: 0,
        endOrder: 999
      }
    });

    this.create.start(event, shape);
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const SequencePaletteModule = {
  __depends__: [
    PaletteModule,
    CreateModule
  ],
  __init__: ['sequencePalette'],
  sequencePalette: ['type', SequencePalette]
};
