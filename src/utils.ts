import { ComponentType, ComponentTypeMethod } from './router';

export const PINS_METHODS = ['get', 'post', 'delete', 'patch', 'put', 'option']

export interface OneOrMany<T> {
    map: (fn: <T>(item: T[]) => T[]) => OneOrMany<T>;
    value_of: () => T[];
    one: (separator?:string) => T;
    many: (other?: T) => T[];
    length: () => number;
    empty: () => boolean;
    inspect: () => string;
}
// eslint-disable-next-line no-redeclare
export const OneOrMany = <T>(item: T | T[] | null) => ({
    map: (fn: (item: T[]) => T[]) => OneOrMany(fn(OneOrMany(item).value_of())),
    one: (separator:string = '') => typeof OneOrMany(item).value_of()[0] == 'string' ? OneOrMany(item).value_of().join(separator) : item[0],
    many: (other?: T) => OneOrMany(item).empty() ? OneOrMany([other]).value_of() : OneOrMany(item).value_of(),
    value_of: () => item ? (!Array.isArray(item) ? [item] : item) : [],
    length: () => OneOrMany(item).value_of().length,
    empty: () => OneOrMany(item).length() == 0,
    inspect: () => `OneOrMany(${item})`
})

export interface Component {
    map(fn: (item: ComponentType) => ComponentType): Component;
    set_method(method: ComponentTypeMethod): number;
    for_each_methods(callback: (item: ComponentTypeMethod) => void): void
    value_of(): ComponentType;
    inspect(): string;
}
// eslint-disable-next-line no-redeclare
export const Component = (component: ComponentType) => ({
    map: (fn: (item: ComponentType) => ComponentType): Component => Component(fn(component)),
    set_method: (method: ComponentTypeMethod) => component.methods.push(method),
    for_each_methods: (callback: (item: ComponentTypeMethod) => void) => component.methods.forEach(item => callback(item)),
    value_of: () => component,
    inspect: () => '{\n' + Object.entries(component).map(([key, value]) => `${key}: ${value}\n`) + '}'
})
