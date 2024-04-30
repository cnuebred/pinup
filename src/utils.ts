import { ComponentType, ComponentTypeMethod } from './d';

export const PINS_METHODS = ['get', 'post', 'delete', 'patch', 'put', 'option']

export const one_or_many = <T>(item: T | T[] | null) => ({
    map: (fn: (item: T[]) => T[]) => one_or_many(fn(one_or_many(item).value_of())),
    one: (separator: string = '') => typeof one_or_many(item).value_of()[0] == 'string' ? one_or_many(item).value_of().join(separator) : item[0],
    many: (other?: T) => one_or_many(item).empty() ? one_or_many([other]).value_of() : one_or_many(item).value_of(),
    value_of: () => item ? (!Array.isArray(item) ? [item] : item) : [],
    length: () => one_or_many(item).value_of().length,
    empty: () => one_or_many(item).length() == 0,
    inspect: () => `OneOrMany(${item})`
})

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

/**
 * Creates a path object from the given segments.
 *
 * @param {string[]} path - Array of path segments to join.
 * 
 * @returns {Object} An object with methods for working with paths.
 * 
 * Methods:
 * 
 *   .normalize():
 *     - Joins the provided segments into a single path.
 *     - Removes unnecessary slashes and relative path elements.
 *     - Ensures the resulting path begins with a leading slash ('/').
 *     - @returns {string} The normalized path as a single string.
 *     - Example:
 *       ```javascript
 *       const normalizedPath = $path('folder1', '../folder3/').normalize();
 *       console.log(normalizedPath); // Output: '/folder1/folder3'
 *       ```
 *
 *   .split():
 *     - Normalizes the path and splits it into segments.
 *     - Filters out empty segments.
 *     - @returns {string[]} An array of non-empty segments.
 *     - Example:
 *       ```javascript
 *       const segments = $path('/folder1/../folder3').split();
 *       console.log(segments); // Output: ['folder1', 'folder3']
 *       ```
 *
 *   .join(new_path, to_end = true):
 *     - Joins the current path with a new path.
 *     - If `to_end` is true, appends `new_path` to the current path.
 *     - If `to_end` is false, prepends `new_path` to the current path.
 *     - @param {string} new_path - The new path segment to join.
 *     - @param {boolean} [to_end=true] - Determines whether to append or prepend the new path.
 *     - @returns {string} The resulting combined path.
 *     - Example:
 *       ```javascript
 *       const joinedPath = $path('/folder1').join('folder2', true);
 *       console.log(joinedPath); // Output: '/folder1/folder2'
 *       ```
 *
 *   .to_string():
 *     - Converts the current path object to a raw string.
 *     - No normalization is applied.
 *     - @returns {string} The path as a raw string.
 *     - Example:
 *       ```javascript
 *       const rawPath = $path('folder1', 'folder2/').to_string();
 *       console.log(rawPath); // Output: 'folder1/folder2/'
 *       ```
 *
 */
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

export function colorCode(color?: ColorCode): string {
    switch (color) {
        case ColorCode.RED:
            return '\x1b[31m'; // ANSI kod dla czerwonego
        case ColorCode.GREEN:
            return '\x1b[32m'; // ANSI kod dla zielonego
        case ColorCode.YELLOW:
            return '\x1b[33m'; // ANSI kod dla żółtego
        case ColorCode.BLUE:
            return '\x1b[34m'; // ANSI kod dla niebieskiego
        case ColorCode.MAGENTA:
            return '\x1b[35m'; // ANSI kod dla magenty
        case ColorCode.CYAN:
            return '\x1b[36m'; // ANSI kod dla cyjanu
        case ColorCode.WHITE:
            return '\x1b[37m'; // ANSI kod dla białego
        default:
            return '\x1b[39m'; // ANSI kod dla domyślnego koloru
    }
}

export function colorize(text: string, color: ColorCode = ColorCode.DEFAULT): string {
    const startColor = colorCode(color);
    const resetColor = '\x1b[0m';
    return `${startColor}${text}${resetColor}`;
}