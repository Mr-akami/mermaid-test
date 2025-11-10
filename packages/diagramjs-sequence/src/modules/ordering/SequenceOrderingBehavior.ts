/**
 * SequenceOrderingBehavior - Manages message ordering in the sequence diagram
 */

import type { EventBus } from 'diagram-js';

export default class SequenceOrderingBehavior {
  static $inject = ['eventBus', 'modeling'];

  constructor(
    private eventBus: EventBus,
    private modeling: any
  ) {
    this.init();
  }

  private init(): void {
    // Update order when messages are moved
    this.eventBus.on('shape.move.end', (event: any) => {
      const { shape } = event;

      if (shape.type === 'message') {
        this.updateMessageOrder(shape);
      }
    });
  }

  private updateMessageOrder(movedMessage: any): void {
    // Get all messages
    const root = movedMessage.parent || movedMessage;
    const messages = this.getAllMessages(root);

    // Sort by Y position
    messages.sort((a: any, b: any) => {
      const aY = a.waypoints ? a.waypoints[0].y : a.y;
      const bY = b.waypoints ? b.waypoints[0].y : b.y;
      return aY - bY;
    });

    // Update order
    messages.forEach((message: any, index: number) => {
      if (message.businessObject) {
        const newBusinessObject = {
          ...message.businessObject,
          order: index
        };

        this.modeling.updateProperties(message, {
          businessObject: newBusinessObject
        });
      }
    });
  }

  private getAllMessages(element: any): any[] {
    const messages: any[] = [];

    const traverse = (el: any) => {
      if (el.type === 'message') {
        messages.push(el);
      }

      if (el.children) {
        el.children.forEach((child: any) => traverse(child));
      }
    };

    traverse(element);
    return messages;
  }
}

export const SequenceOrderingBehaviorModule = {
  __init__: ['sequenceOrderingBehavior'],
  sequenceOrderingBehavior: ['type', SequenceOrderingBehavior]
};
