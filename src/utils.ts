export const PINS_METHODS = ['get', 'post', 'delete', 'patch', 'put', 'option']

export enum ColorCode {
    RED,
    GREEN,
    YELLOW,
    BLUE,
    MAGENTA,
    CYAN,
    WHITE,
    DEFAULT
}

export const one_or_many = <T>(item: T | T[] | null) => ({
    map: (fn: (item: T[]) => T[]) => one_or_many(fn(one_or_many(item).value_of())),
    one: (separator: string = '') => typeof one_or_many(item).value_of()[0] == 'string' ?
        one_or_many(item).value_of().join(separator) : item[0],

    many: (other?: T) => one_or_many(item).empty() ?
        one_or_many([other]).value_of() : one_or_many(item).value_of(),

    value_of: () => item ? (!Array.isArray(item) ? [item] : item) : [],
    length: () => one_or_many(item).value_of().length,
    empty: () => one_or_many(item).length() == 0,
    inspect: () => `OneOrMany(${item})`
})


export type OneOrMany<T> = ReturnType<typeof one_or_many>

export const format = function (date: Date, time: string): string {
    const add_zero = (text: string, size: number = 2) => {
        return ('0'.repeat(size) + text).slice(-size)
    }

    time = time.replaceAll(/\$ms/gm, add_zero(date.getMilliseconds().toString()))
        .replaceAll(/\$s/gm, add_zero(date.getSeconds().toString()))
        .replaceAll(/\$m/gm, add_zero(date.getMinutes().toString()))
        .replaceAll(/\$h/gm, add_zero(date.getHours().toString()))
        .replaceAll(/\$D/gm, add_zero(date.getDate().toString()))
        .replaceAll(/\$M/gm, add_zero((date.getMonth() + 1).toString()))
        .replaceAll(/\$Y/gm, add_zero(date.getFullYear().toString(), 4))

    return time
}

export const $path = (...path: string[]) => ({
    normalize: () => {
        let path_mut = path.join('/')
        if (!path_mut) return ''
        path_mut = path_mut.replaceAll(/^(\.*\/*)(.+?)(\/*)$/gm, '$2')
        path_mut = `/${path_mut}`
        path_mut = path_mut.replaceAll(/\/{2,}/gm, '/')
        return path_mut
    },
    split: () => $path(...path).normalize().split('/').filter(item => item != ''),
    join: (new_path: string, to_end: boolean = true) =>
        to_end ? $path(...path).normalize() + $path(new_path).normalize() :
            $path(new_path).normalize() + $path(...path).normalize(),
    to_string: () => path.join('/').toString()
})



export function colorCode(color?: ColorCode): string {
    switch (color) {
        case ColorCode.RED:
            return '\x1b[31m';
        case ColorCode.GREEN:
            return '\x1b[32m';
        case ColorCode.YELLOW:
            return '\x1b[33m';
        case ColorCode.BLUE:
            return '\x1b[34m';
        case ColorCode.MAGENTA:
            return '\x1b[35m';
        case ColorCode.CYAN:
            return '\x1b[36m';
        case ColorCode.WHITE:
            return '\x1b[37m';
        default:
            return '\x1b[39m';
    }
}

export function colorize(text: string, color: ColorCode = ColorCode.DEFAULT): string {
    const startColor = colorCode(color);
    const resetColor = '\x1b[0m';
    return `${startColor}${text}${resetColor}`;
}
