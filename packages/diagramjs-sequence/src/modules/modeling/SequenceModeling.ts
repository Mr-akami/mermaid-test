/**
 * SequenceModeling - Custom modeling behavior for sequence diagrams
 */

import type { EventBus, ElementFactory, Canvas } from 'diagram-js';
// @ts-ignore - diagram-js modules don't have type definitions
import ModelingModule from 'diagram-js/lib/features/modeling';

export default class SequenceModeling {
  static $inject = ['eventBus', 'elementFactory', 'canvas', 'modeling'];

  constructor(
    private eventBus: EventBus,
    private elementFactory: ElementFactory,
    private canvas: Canvas,
    private modeling: any
  ) {
    this.init();
  }

  private init(): void {
    // Listen to connection creation to create messages
    this.eventBus.on('commandStack.connection.create.postExecuted', (event: any) => {
      const { context } = event;
      const { connection, source, target } = context;

      console.log('Connection created:', connection);

      // Always set message properties for connections between participants/actors
      if ((source.type === 'participant' || source.type === 'actor') &&
          (target.type === 'participant' || target.type === 'actor')) {

        const businessObject = {
          id: connection.id || this.generateId('message'),
          sourceId: source.businessObject?.id || source.id,
          targetId: target.businessObject?.id || target.id,
          arrowType: '->>',
          text: '',
          order: this.getNextMessageOrder()
        };

        this.modeling.updateProperties(connection, {
          type: 'message',
          businessObject: businessObject
        });

        console.log('Message properties set:', businessObject);
      }
    });

    // Auto-create lifelines for participants and actors
    this.eventBus.on('shape.added', (event: any) => {
      const { element } = event;

      if (element.type === 'participant' || element.type === 'actor') {
        this.createLifeline(element);
      }
    });
  }

  private createLifeline(participant: any): void {
    const lifeline = this.elementFactory.createShape({
      type: 'lifeline',
      x: participant.x + (participant.width / 2),
      y: participant.y + participant.height,
      width: 2,
      height: 400,
      businessObject: {
        participantId: participant.id
      }
    });

    this.canvas.addShape(lifeline, this.canvas.getRootElement());
  }

  private getNextMessageOrder(): number {
    const root = this.canvas.getRootElement();
    let maxOrder = 0;

    if (root.children) {
      root.children.forEach((child: any) => {
        if (child.type === 'message' && child.businessObject?.order) {
          maxOrder = Math.max(maxOrder, child.businessObject.order);
        }
      });
    }

    return maxOrder + 1;
  }

  updateMessageArrowType(message: any, arrowType: string): void {
    const newBusinessObject = {
      ...message.businessObject,
      arrowType
    };

    this.modeling.updateProperties(message, {
      businessObject: newBusinessObject
    });
  }

  updateMessageText(message: any, text: string): void {
    const newBusinessObject = {
      ...message.businessObject,
      text
    };

    this.modeling.updateProperties(message, {
      businessObject: newBusinessObject
    });
  }

  updateParticipantLabel(participant: any, label: string): void {
    const newBusinessObject = {
      ...participant.businessObject,
      label
    };

    this.modeling.updateProperties(participant, {
      businessObject: newBusinessObject
    });
  }

  updateNoteText(note: any, text: string): void {
    const newBusinessObject = {
      ...note.businessObject,
      text
    };

    this.modeling.updateProperties(note, {
      businessObject: newBusinessObject
    });
  }

  updateBlockLabel(block: any, label: string): void {
    const newBusinessObject = {
      ...block.businessObject,
      label
    };

    this.modeling.updateProperties(block, {
      businessObject: newBusinessObject
    });
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const SequenceModelingModule = {
  __depends__: [
    ModelingModule
  ],
  __init__: ['sequenceModeling'],
  sequenceModeling: ['type', SequenceModeling]
};
