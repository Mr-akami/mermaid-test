/**
 * Type definitions for tiny-svg
 */

declare module 'tiny-svg' {
  export function attr(el: SVGElement, attrs: string): string | null;
  export function attr(el: SVGElement, attrs: { [key: string]: any }): void;
  export function attr(el: SVGElement, name: string, value: any): void;

  export function create(name: string, attrs?: { [key: string]: any }): SVGElement;
  export function append(parent: SVGElement, child: SVGElement): void;
  export function appendTo(child: SVGElement, parent: SVGElement): void;
  export function remove(element: SVGElement): void;
  export function clear(element: SVGElement): void;
  export function clone(element: SVGElement): SVGElement;

  export function classes(element: SVGElement): {
    add(className: string): void;
    remove(className: string): void;
    has(className: string): boolean;
    toggle(className: string): void;
  };

  export function innerSVG(element: SVGElement, svg?: string): string | void;
  export function transform(element: SVGElement, transform?: string): string | void;
}
