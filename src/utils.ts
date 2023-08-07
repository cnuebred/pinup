import { ComponentType, ComponentTypeMethod } from './d';

export const PINS_METHODS = ['get', 'post', 'delete', 'patch', 'put', 'option']

export const one_or_many = <T>(item: T | T[] | null) => ({
    map: (fn: (item: T[]) => T[]) => one_or_many(fn(one_or_many(item).value_of())),
    one: (separator:string = '') => typeof one_or_many(item).value_of()[0] == 'string' ? one_or_many(item).value_of().join(separator) : item[0],
    many: (other?: T) => one_or_many(item).empty() ? one_or_many([other]).value_of() : one_or_many(item).value_of(),
    value_of: () => item ? (!Array.isArray(item) ? [item] : item) : [],
    length: () => one_or_many(item).value_of().length,
    empty: () => one_or_many(item).length() == 0,
    inspect: () => `OneOrMany(${item})`
})

export const pin_component = (component: ComponentType) => ({
    map: (fn: (item: ComponentType) => ComponentType) => pin_component(fn(component)),
    set_method: (method: ComponentTypeMethod) => component.methods.push(method),
    for_each_methods: (callback: (item: ComponentTypeMethod) => void) => component.methods.forEach(item => callback(item)),
    value_of: () => component,
    inspect: () => '{\n' + Object.entries(component).map(([key, value]) => `${key}: ${value}\n`) + '}'
})

export type PinComponent = ReturnType<typeof pin_component>
export type OneOrMany<T> = ReturnType<typeof one_or_many<T>>

export const format = function (date: Date, time: string): string {
    const add_zero = (text: string, size: number = 2) => ('0'.repeat(size) + text).slice(-size)
    time = time.replaceAll(/\$ms/gm, add_zero(date.getMilliseconds().toString()))
        .replaceAll(/\$s/gm, add_zero(date.getSeconds().toString()))
        .replaceAll(/\$m/gm, add_zero(date.getMinutes().toString()))
        .replaceAll(/\$h/gm, add_zero(date.getHours().toString()))
        .replaceAll(/\$D/gm, add_zero(date.getDate().toString()))
        .replaceAll(/\$M/gm, add_zero((date.getMonth() + 1).toString()))
        .replaceAll(/\$Y/gm, add_zero(date.getFullYear().toString(), 4))

    return time
}
