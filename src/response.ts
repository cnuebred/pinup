import { Pinres } from './d'

export interface Reply {
    value: () => Pinres
    status: (status: number) => Reply
    error: (error: boolean) => Reply
    timestamp: (timestamp: number) => Reply
    path: (path: string) => Reply
    data: (data: { [index: string]: any } | any[]) => Reply;
    inspect: () => string
    map: (callback: (item: Pinres) => Pinres) => Reply;
  }

// eslint-disable-next-line no-redeclare, no-unused-vars
export const Reply = (content: string | Pinres = '') => ({
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
    status: (status: number) => Reply({ ...Reply(content).value(), ...{ status } }),
    error: (error: boolean) => Reply({ ...Reply(content).value(), ...{ error } }),
    timestamp: (timestamp: number) => Reply({ ...Reply(content).value(), ...{ timestamp } }),
    path: (path: string) => Reply({ ...Reply(content).value(), ...{ path } }),
    data: (data: {[index: string]: any} | any[]) => Reply({ ...Reply(content).value(), ...{ data } }),
    type: (type: string) => Reply({ ...Reply(content).value(), ...{ type } }),
    inspect: () => JSON.stringify(Reply(content).value()),
    map: (callback: (item: Pinres) => Pinres) => Reply(callback(Reply(content).value()))
})
