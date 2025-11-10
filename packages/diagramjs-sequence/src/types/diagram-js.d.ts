/**
 * Type definitions for diagram-js
 */

declare module 'diagram-js/lib/core' {
  export interface Module {
    __depends__?: Module[];
    __init__?: string[];
    [key: string]: any;
  }
}

declare module 'diagram-js' {
  import { Module } from 'diagram-js/lib/core';

  export interface DiagramOptions {
    canvas?: {
      container?: HTMLElement | string;
      width?: number;
      height?: number;
      deferUpdate?: boolean;
    };
    modules?: Module[];
    [key: string]: any;
  }

  export interface Point {
    x: number;
    y: number;
  }

  export interface Bounds {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export interface Element {
    id: string;
    type: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    parent?: Element;
    children?: Element[];
    labels?: Element[];
    businessObject?: any;
  }

  export interface Shape extends Element {
    incoming?: Connection[];
    outgoing?: Connection[];
    attachers?: Element[];
  }

  export interface Connection extends Element {
    source: Shape;
    target: Shape;
    waypoints?: Point[];
  }

  export interface Canvas {
    getRootElement(): Shape;
    addShape(shape: Shape | any, parent?: Shape, parentIndex?: number): Shape;
    addConnection(connection: Connection | any, parent?: Shape, parentIndex?: number): Connection;
    removeShape(shape: Shape | string): void;
    removeConnection(connection: Connection | string): void;
    getContainer(): HTMLElement;
    getGraphics(element: Element | string): SVGElement;
    viewbox(box?: { x: number; y: number; width: number; height: number; scale?: number }): any;
    zoom(newScale: number | 'fit-viewport', center?: Point | 'auto'): void;
    scroll(delta: Point): void;
  }

  export interface EventBus {
    on(event: string, priority?: number | Function, callback?: Function, that?: any): void;
    once(event: string, priority?: number | Function, callback?: Function, that?: any): void;
    off(event: string, callback?: Function): void;
    fire(event: string | any, payload?: any): any;
  }

  export interface ElementFactory {
    createRoot(attrs?: any): Shape;
    createShape(attrs: any): Shape;
    createConnection(attrs: any): Connection;
    createLabel(attrs: any): Shape;
    create(type: string, attrs: any): Element;
  }

  export interface ElementRegistry {
    add(element: Element, gfx?: SVGElement, secondaryGfx?: SVGElement): void;
    remove(element: Element | string): void;
    updateId(element: Element | string, newId: string): void;
    get(id: string): Element | undefined;
    filter(fn: (element: Element, gfx?: SVGElement) => boolean): Element[];
    find(fn: (element: Element, gfx?: SVGElement) => boolean): Element | undefined;
    getAll(): Element[];
    forEach(fn: (element: Element, gfx?: SVGElement) => void): void;
  }

  export interface GraphicsFactory {
    create(type: string, element: Element, parentNode?: SVGElement): SVGElement;
    update(type: string, element: Element, gfx: SVGElement): SVGElement;
    remove(element: Element): void;
  }

  export interface Modeling {
    createShape(shape: any, position: Point, target: Shape, targetIndex?: number, hints?: any): Shape;
    createConnection(source: Shape, target: Shape, connection: any, parent: Shape, hints?: any): Connection;
    removeShape(shape: Shape, hints?: any): void;
    removeConnection(connection: Connection, hints?: any): void;
    moveShape(shape: Shape, delta: Point, newParent?: Shape, newParentIndex?: number, hints?: any): void;
    updateProperties(element: Element, properties: any): void;
    updateWaypoints(connection: Connection, newWaypoints: Point[], hints?: any): void;
  }

  export interface CommandStack {
    execute(command: string, context: any): void;
    canExecute(command: string, context: any): boolean;
    undo(): void;
    redo(): void;
    clear(): void;
    canUndo(): boolean;
    canRedo(): boolean;
  }

  export default class Diagram {
    constructor(options?: DiagramOptions);
    get<T = any>(serviceName: string, strict?: boolean): T;
    invoke<T = any>(func: Function | any[], context?: any): T;
    destroy(): void;
    clear(): void;
    on(event: string, priority?: number | Function, callback?: Function, that?: any): void;
    off(event: string, callback?: Function): void;
    attachTo(parentNode: HTMLElement): void;
    detach(): void;
  }
}

declare module 'diagram-js/lib/features/palette/Palette' {
  import { EventBus, Canvas } from 'diagram-js';

  export interface PaletteProvider {
    getPaletteEntries(element?: any): { [key: string]: PaletteEntry };
  }

  export interface PaletteEntry {
    group?: string;
    className?: string;
    title?: string;
    imageUrl?: string;
    action?: {
      click?: (event: Event, autoActivate?: boolean) => void;
      dragstart?: (event: Event) => void;
    };
  }

  export default class Palette {
    constructor(eventBus: EventBus, canvas: Canvas);
    registerProvider(priority: number | PaletteProvider, provider?: PaletteProvider): void;
  }
}

declare module 'diagram-js/lib/features/context-pad/ContextPad' {
  import { EventBus } from 'diagram-js';

  export interface ContextPadProvider {
    getContextPadEntries(element: any): { [key: string]: ContextPadEntry };
  }

  export interface ContextPadEntry {
    group?: string;
    className?: string;
    title?: string;
    imageUrl?: string;
    action?: {
      click?: (event: Event, element: any) => void;
      dragstart?: (event: Event, element: any) => void;
    };
  }

  export default class ContextPad {
    constructor(eventBus: EventBus, overlays: any);
    registerProvider(priority: number | ContextPadProvider, provider?: ContextPadProvider): void;
  }
}

declare module 'diagram-js/lib/features/rules/Rules' {
  import { EventBus } from 'diagram-js';

  export interface RuleProvider {
    init(): void;
  }

  export default class Rules {
    constructor(eventBus: EventBus);
    allowed(action: string, context: any): boolean | null;
  }
}

declare module 'diagram-js/lib/command/CommandHandler' {
  import { Element } from 'diagram-js';

  export default class CommandHandler {
    canExecute(context: any): boolean;
    execute(context: any): Element[] | Element | void;
    revert(context: any): void;
    postExecute?(context: any): void;
  }
}
