/**
 * SequenceContextPad - Provides context menu actions for sequence diagram elements
 */

import type ContextPad from 'diagram-js/lib/features/context-pad/ContextPad';
import type { ContextPadEntry } from 'diagram-js/lib/features/context-pad/ContextPad';
import type { Shape, Connection, EventBus, ElementFactory } from 'diagram-js';
// @ts-ignore - diagram-js modules don't have type definitions
import ContextPadModule from 'diagram-js/lib/features/context-pad';
// @ts-ignore - diagram-js modules don't have type definitions
import ConnectModule from 'diagram-js/lib/features/connect';

export default class SequenceContextPad {
  static $inject = ['contextPad', 'connect', 'modeling', 'elementFactory', 'eventBus'];

  constructor(
    private contextPad: ContextPad,
    private connect: any,
    private modeling: any,
    private elementFactory: ElementFactory,
    private eventBus: EventBus
  ) {
    contextPad.registerProvider(500, this);
  }

  getContextPadEntries(element: Shape | Connection): { [key: string]: ContextPadEntry } {
    const entries: { [key: string]: ContextPadEntry } = {};

    // For participants and actors: allow connection
    if (element.type === 'participant' || element.type === 'actor') {
      entries['connect'] = {
        group: 'connect',
        className: 'context-pad-icon-connect',
        title: 'Create Message',
        action: {
          click: (event: Event) => {
            this.connect.start(event, element);
          },
          dragstart: (event: Event) => {
            this.connect.start(event, element);
          }
        }
      };

      entries['delete'] = {
        group: 'edit',
        className: 'context-pad-icon-delete',
        title: 'Delete Element',
        action: {
          click: () => {
            this.modeling.removeElements([element]);
          }
        }
      };

      // Convert participant <-> actor
      if (element.type === 'participant') {
        entries['convert-to-actor'] = {
          group: 'edit',
          className: 'context-pad-icon-actor',
          title: 'Convert to Actor',
          action: {
            click: () => {
              this.convertToActor(element as Shape);
            }
          }
        };
      } else {
        entries['convert-to-participant'] = {
          group: 'edit',
          className: 'context-pad-icon-participant',
          title: 'Convert to Participant',
          action: {
            click: () => {
              this.convertToParticipant(element as Shape);
            }
          }
        };
      }
    }

    // For messages
    if (element.type === 'message') {
      entries['delete'] = {
        group: 'edit',
        className: 'context-pad-icon-delete',
        title: 'Delete Message',
        action: {
          click: () => {
            this.modeling.removeElements([element]);
          }
        }
      };
    }

    // For notes and blocks
    if (element.type === 'note' ||
        ['loop', 'alt', 'opt', 'par', 'critical', 'break', 'rect', 'box'].includes(element.type)) {
      entries['delete'] = {
        group: 'edit',
        className: 'context-pad-icon-delete',
        title: 'Delete Element',
        action: {
          click: () => {
            this.modeling.removeElements([element]);
          }
        }
      };
    }

    return entries;
  }

  private convertToActor(element: Shape): void {
    const newBusinessObject = {
      ...element.businessObject,
      isActor: true
    };

    this.modeling.updateProperties(element, {
      type: 'actor',
      businessObject: newBusinessObject,
      width: 60,
      height: 70
    });
  }

  private convertToParticipant(element: Shape): void {
    const newBusinessObject = {
      ...element.businessObject,
      isActor: false
    };

    this.modeling.updateProperties(element, {
      type: 'participant',
      businessObject: newBusinessObject,
      width: 100,
      height: 40
    });
  }
}

export const SequenceContextPadModule = {
  __depends__: [
    ContextPadModule,
    ConnectModule
  ],
  __init__: ['sequenceContextPad'],
  sequenceContextPad: ['type', SequenceContextPad]
};
