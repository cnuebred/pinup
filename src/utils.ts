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

/**
 * Funkcja `one_or_many` umożliwia manipulację pojedynczym elementem, tablicą elementów lub wartością null, 
 * dostarczając metody takie jak map, one, many, value_of, length, empty, oraz inspect.
 * 
 * @param {T | T[] | null} item - Element, tablica elementów lub null, które mają być przetwarzane.
 * @returns {object} Obiekt zawierający metody do manipulacji i dostępu do wartości.
 */
export const one_or_many = <T>(item: T | T[] | null) => ({
    /**
     * Metoda `map` pozwala na przetworzenie wartości przechowywanej, stosując dostarczoną funkcję.
     * 
     * @param {(item: T[]) => T[]} fn - Funkcja, która zostanie zastosowana do przetworzenia elementów.
     * @returns {object} Nowy obiekt one_or_many z przetworzonymi wartościami.
     */
    map: (fn: (item: T[]) => T[]) => one_or_many(fn(one_or_many(item).value_of())),

    /**
     * Metoda `one` zwraca pierwszy element jako ciąg znaków. Jeśli elementy to ciągi, łączy je opcjonalnie zadanym separatorem.
     * 
     * @param {string} separator - Separator użyty do połączenia elementów, gdy są one ciągami znaków.
     * @returns {string | T} Pierwszy element lub połączone ciągi znaków.
     */
    one: (separator: string = '') => typeof one_or_many(item).value_of()[0] == 'string' ? one_or_many(item).value_of().join(separator) : item[0],

    /**
     * Metoda `many` zwraca tablicę wartości. Jeśli wartość jest pusta, może zwrócić tablicę z opcjonalnie dostarczonym elementem.
     * 
     * @param {T} other - Opcjonalny element do zwrócenia, gdy tablica jest pusta.
     * @returns {T[]} Tablica z wartościami lub tablica z opcjonalnym elementem.
     */
    many: (other?: T) => one_or_many(item).empty() ? one_or_many([other]).value_of() : one_or_many(item).value_of(),

    /**
     * Metoda `value_of` zwraca tablicę zawierającą elementy, niezależnie od ich początkowego formatu (pojedynczy element, tablica, lub null).
     * 
     * @returns {T[]} Tablica elementów.
     */
    value_of: () => item ? (!Array.isArray(item) ? [item] : item) : [],

    /**
     * Metoda `length` zwraca liczbę elementów w tablicy.
     * 
     * @returns {number} Liczba elementów.
     */
    length: () => one_or_many(item).value_of().length,

    /**
     * Metoda `empty` sprawdza, czy w tablicy nie ma elementów.
     * 
     * @returns {boolean} True, jeśli tablica jest pusta.
     */
    empty: () => one_or_many(item).length() == 0,

    /**
     * Metoda `inspect` zapewnia reprezentację tekstową obiektu, co jest użyteczne dla debugowania.
     * 
     * @returns {string} Tekstowa reprezentacja obiektu.
     */
    inspect: () => `OneOrMany(${item})`
})


export type OneOrMany<T> = ReturnType<typeof one_or_many>

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
 * Funkcja `$path` pozwala na manipulowanie ścieżkami plików, oferując metody takie jak `normalize`, `split`, `join`, i `to_string`.
 * 
 * @param {...string[]} path - Tablica zawierająca segmenty ścieżki, które zostaną przetworzone.
 * @returns {object} Obiekt z metodami do manipulowania i dostępu do informacji o ścieżce.
 */
export const $path = (...path: string[]) => ({
    /**
     * Metoda `normalize` służy do normalizacji ścieżki, usuwając niepotrzebne znaki i redukując wielokrotne slash'e do jednego.
     * 
     * @returns {string} Normalizowana ścieżka z jednym początkowym slashem i bez powtarzających się slashy.
     */
    normalize: () => {
        let path_mut = path.join('/') // Łączy elementy tablicy path w jeden ciąg, rozdzielając je slash'em.
        if (!path_mut) return '' // Jeżeli ścieżka jest pusta, zwraca pusty ciąg znaków.
        // Usuwa wszystkie niepotrzebne slash'e na początku i końcu, oraz redukuje ścieżkę do niezbędnego formatu.
        path_mut = path_mut.replaceAll(/^(\.*\/*)(.+?)(\/*)$/gm, '$2')
        path_mut = `/${path_mut}` // Dodaje jeden początkowy slash.
        path_mut = path_mut.replaceAll(/\/{2,}/gm, '/') // Redukuje wszystkie powtórzenia slash'y do jednego.
        return path_mut
    },

    /**
     * Metoda `split` dzieli znormalizowaną ścieżkę na segmenty.
     * 
     * @returns {string[]} Tablica zawierająca segmenty ścieżki po podziale.
     */
    split: () => $path(...path).normalize().split('/').filter(item => item != ''),

    /**
     * Metoda `join` pozwala na dodanie nowej ścieżki do istniejącej, z opcją dodania na koniec lub na początek.
     * 
     * @param {string} new_path - Nowa ścieżka do dodania.
     * @param {boolean} to_end - Określa, czy nowa ścieżka powinna być dodana na końcu (domyślnie true).
     * @returns {string} Znormalizowana i połączona ścieżka zgodnie z zadaną opcją.
     */
    join: (new_path: string, to_end: boolean = true) =>
        to_end ? $path(...path).normalize() + $path(new_path).normalize() :
            $path(new_path).normalize() + $path(...path).normalize(),

    /**
     * Metoda `to_string` konwertuje oryginalne segmenty ścieżki na ciąg znaków, rozdzielając segmenty slash'em.
     * 
     * @returns {string} Ciąg znaków reprezentujący ścieżkę.
     */
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