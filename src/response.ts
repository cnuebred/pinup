import { Pinres } from './d'

/**
 * Funkcja `reply`
 *
 * Tworzy obiekt odpowiedzi z możliwością elastycznego ustawiania różnych właściwości, takich jak komunikat, status, ścieżka, dane, itp.
 * Funkcja obsługuje łańcuchowanie metod, co umożliwia wygodne modyfikacje obiektu odpowiedzi.
 * 
 * @param {string | Pinres} content - Zawartość odpowiedzi, która może być ciągiem znaków lub obiektem `Pinres`.
 * @returns Obiekt zawierający metody do ustawiania różnych właściwości odpowiedzi.
 */
export const reply = (content: string | Pinres = '') => ({
    value: () => typeof content == 'string'
        ? {
            msg: content || '',
            error: false,
            path: '/',
            timestamp: Date.now(),
            data: {},
            status: 200,
            type: 'json'
        }
        : content,

    /**
 * Ustawia status odpowiedzi.
 * 
 * @param {number} status - Kod statusu HTTP.
 * @returns Obiekt odpowiedzi z nowym statusem.
 */
    status: (status: number) => reply({ ...reply(content).value(), ...{ status } }),
    /**
* Ustawia flagę błędu w odpowiedzi.
* 
* @param {boolean} error - Flaga błędu.
* @returns Obiekt odpowiedzi z nową flagą błędu.
*/
    error: (error: boolean) => reply({ ...reply(content).value(), ...{ error } }),
    /**
 * Ustawia znacznik czasu w odpowiedzi.
 * 
 * @param {number} timestamp - Znacznik czasu w milisekundach.
 * @returns Obiekt odpowiedzi ze zaktualizowanym znacznikiem czasu.
 */
    timestamp: (timestamp: number) => reply({ ...reply(content).value(), ...{ timestamp } }),
    /**
 * Ustawia ścieżkę w odpowiedzi.
 * 
 * @param {string} path - Ścieżka odpowiedzi.
 * @returns Obiekt odpowiedzi z nową ścieżką.
 */
    path: (path: string) => reply({ ...reply(content).value(), ...{ path } }),
    /**
 * Ustawia dodatkowe dane w odpowiedzi.
 * 
 * @param {{ [index: string]: any } | any[]} data - Dane, które będą dołączone do odpowiedzi.
 * @returns Obiekt odpowiedzi z nowymi danymi.
 */
    data: (data: { [index: string]: any } | any[]) => reply({ ...reply(content).value(), ...{ data } }),
    /**
 * Ustawia typ odpowiedzi.
 * 
 * @param {string} type - Typ odpowiedzi (np. 'json' lub 'text').
 * @returns Obiekt odpowiedzi z nowym typem.
 */
    type: (type: string) => reply({ ...reply(content).value(), ...{ type } }),
    /**
 * Zwraca obiekt odpowiedzi jako ciąg znaków JSON.
 * 
 * @returns Obiekt odpowiedzi w formacie JSON.
 */
    inspect: () => JSON.stringify(reply(content).value()),
    /**
 * Modyfikuje obiekt odpowiedzi za pomocą funkcji zwrotnej.
 * 
 * @param {function} callback - Funkcja zwrotna do modyfikacji obiektu.
 * @returns Obiekt odpowiedzi po zastosowaniu funkcji zwrotnej.
 */
    map: (callback: (item: Pinres) => Pinres) => reply(callback(reply(content).value()))
})

export type Reply = ReturnType<typeof reply>
