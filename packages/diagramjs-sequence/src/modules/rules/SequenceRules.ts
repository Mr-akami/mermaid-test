/**
 * SequenceRules - Defines rules for diagram operations
 */

import type { EventBus } from 'diagram-js';
// @ts-ignore - diagram-js modules don't have type definitions
import RulesModule from 'diagram-js/lib/features/rules';

export default class SequenceRules {
  static $inject = ['eventBus'];

  constructor(private eventBus: EventBus) {
    this.init();
  }

  private init(): void {
    this.eventBus.on('commandStack.shape.create.canExecute', 500, (context: any) => {
      return this.canCreate(context);
    });

    this.eventBus.on('commandStack.connection.create.canExecute', 500, (context: any) => {
      return this.canConnect(context);
    });

    this.eventBus.on('commandStack.connection.reconnect.canExecute', 500, (context: any) => {
      return this.canReconnect(context);
    });

    this.eventBus.on('commandStack.shape.move.canExecute', 500, (context: any) => {
      return this.canMove(context);
    });

    this.eventBus.on('commandStack.elements.delete.canExecute', 500, (context: any) => {
      return this.canDelete(context);
    });
  }

  private canCreate(context: any): boolean {
    const { shape, target } = context;

    // Can always create on root
    if (!target || target === target.parent) {
      return true;
    }

    // Blocks can contain other elements
    if (['loop', 'alt', 'opt', 'par', 'critical', 'break', 'rect', 'box'].includes(target.type)) {
      return true;
    }

    return false;
  }

  private canConnect(context: any): boolean {
    const { source, target } = context;

    // Must have both source and target
    if (!source || !target) {
      return false;
    }

    // Can only connect between participants and actors
    if ((source.type !== 'participant' && source.type !== 'actor') ||
        (target.type !== 'participant' && target.type !== 'actor')) {
      return false;
    }

    // Cannot connect to self
    if (source === target) {
      return false;
    }

    return true;
  }

  private canReconnect(context: any): boolean {
    const { connection, source, target } = context;

    if (connection.type !== 'message') {
      return false;
    }

    return this.canConnect({ source, target });
  }

  private canMove(context: any): boolean {
    const { shape } = context;

    // Participants and actors can be moved horizontally to change order
    if (shape.type === 'participant' || shape.type === 'actor') {
      return true;
    }

    // Notes and blocks can be moved
    if (shape.type === 'note' ||
        ['loop', 'alt', 'opt', 'par', 'critical', 'break', 'rect', 'box'].includes(shape.type)) {
      return true;
    }

    // Messages can be moved vertically to change order
    if (shape.type === 'message') {
      return true;
    }

    return false;
  }

  private canDelete(context: any): boolean {
    // All elements can be deleted
    return true;
  }
}

export const SequenceRulesModule = {
  __depends__: [
    RulesModule
  ],
  __init__: ['sequenceRules'],
  sequenceRules: ['type', SequenceRules]
};
