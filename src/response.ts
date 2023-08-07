import { Pinres } from './d'

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
    status: (status: number) => reply({ ...reply(content).value(), ...{ status } }),
    error: (error: boolean) => reply({ ...reply(content).value(), ...{ error } }),
    timestamp: (timestamp: number) => reply({ ...reply(content).value(), ...{ timestamp } }),
    path: (path: string) => reply({ ...reply(content).value(), ...{ path } }),
    data: (data: {[index: string]: any} | any[]) => reply({ ...reply(content).value(), ...{ data } }),
    type: (type: string) => reply({ ...reply(content).value(), ...{ type } }),
    inspect: () => JSON.stringify(reply(content).value()),
    map: (callback: (item: Pinres) => Pinres) => reply(callback(reply(content).value()))
})

export type Reply = ReturnType<typeof reply>
