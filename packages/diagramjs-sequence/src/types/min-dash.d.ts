/**
 * Type definitions for min-dash
 */

declare module 'min-dash' {
  export function assign<T extends object>(target: T, ...sources: any[]): T;
  export function bind<T extends Function>(fn: T, context: any): T;
  export function debounce<T extends Function>(fn: T, timeout: number): T;
  export function every<T>(collection: T[] | { [key: string]: T }, iterator: (item: T, key: string | number) => boolean): boolean;
  export function filter<T>(collection: T[] | { [key: string]: T }, iterator: (item: T, key: string | number) => boolean): T[];
  export function find<T>(collection: T[] | { [key: string]: T }, iterator: (item: T, key: string | number) => boolean): T | undefined;
  export function forEach<T>(collection: T[] | { [key: string]: T }, iterator: (item: T, key: string | number) => void): void;
  export function isArray(obj: any): obj is any[];
  export function isDefined(obj: any): boolean;
  export function isFunction(obj: any): obj is Function;
  export function isNil(obj: any): obj is null | undefined;
  export function isNumber(obj: any): obj is number;
  export function isObject(obj: any): obj is object;
  export function isString(obj: any): obj is string;
  export function isUndefined(obj: any): obj is undefined;
  export function keys(obj: object): string[];
  export function map<T, U>(collection: T[] | { [key: string]: T }, iterator: (item: T, key: string | number) => U): U[];
  export function merge<T extends object>(target: T, ...sources: any[]): T;
  export function omit<T extends object>(obj: T, keys: string[]): Partial<T>;
  export function pick<T extends object>(obj: T, keys: string[]): Partial<T>;
  export function reduce<T, U>(collection: T[] | { [key: string]: T }, iterator: (result: U, item: T, key: string | number) => U, initialValue: U): U;
  export function size(collection: any[] | object): number;
  export function sortBy<T>(collection: T[], iterator: string | ((item: T) => any)): T[];
  export function throttle<T extends Function>(fn: T, interval: number): T;
  export function uniqueBy<T>(collection: T[], iterator: string | ((item: T) => any)): T[];
  export function values<T>(obj: { [key: string]: T }): T[];
  export function without<T>(array: T[], ...values: T[]): T[];
}
