import { verify } from 'jsonwebtoken'
import { __provider__ } from './router'
import { Controller, Pinpack, RequestMethod } from './d'
import { one_or_many, PINS_METHODS } from './utils'
import { reply } from './response'

export function pin (
    path: string,
    ParentClass?: (new (...args: any[]) => any)
): any {
    const parent = ParentClass ? new ParentClass() : undefined
    if (ParentClass && !parent?.private_controller_key)
        throw new Error(`Parent class '${ParentClass.name}' is not assignable to parameter of Controller class`)

    return function <T extends Controller>
    (original_method: T, context: ClassDecoratorContext): Controller {
        const SubController: Controller = class extends original_method {
            name = context.name
            private_controller_key = true
            path = path
            full_path = [...parent?.full_path || '', path]
            parent = ParentClass
        }
        __provider__.push(new SubController())
        return SubController
    }
}

const pins_wrapper = (method: RequestMethod, path: string | string[]) => {
    return request_method_wrapper(method, one_or_many(path).many(''))
}
const request_method_wrapper = (request_method: RequestMethod, paths: string[]): any => {
    return function (original_method: any, context: ClassMethodDecoratorContext<Controller>) {
        function replacement_method ({ rec, rep, op }: Pinpack) {
            op.pin.log()
            const context = original_method.bind(this)
            context({ rec, rep, op })
        }

        context.addInitializer(function () {
            if (!this.methods) this.methods = []
            paths.forEach(path => {
                this.methods.push({
                    method: request_method,
                    name: context.name.toString(),
                    path: one_or_many(path).many(''),
                    parent: this,
                    foo: replacement_method,
                    data: { ...this.data } || {}
                })
            })
            this.data = {}
        })

        return replacement_method
    }
}

export const pins = Object.fromEntries(PINS_METHODS.map((item: RequestMethod) => {
    return [item, (...path: string[]) => pins_wrapper(item, path)]
    // eslint-disable-next-line no-unused-vars
})) as { [K in RequestMethod]: (...path: string[]) => any }

const data_method_wrapper = (name_dataset: 'params' | 'query' | 'body' | 'headers', keys: string[]): any => {
    return (original_method: any, context: ClassMethodDecoratorContext<Controller>) => {
        function replacement_method ({ rec, rep, op }: Pinpack) {
            const req_dataset = rec[name_dataset]
            const require = []
            const dataset = keys.map(item => {
                return [item, req_dataset[item]]
            }).filter(([key, value]) => {
                if (!value) {
                    require.push(key)
                    return false
                }
                return true
            })

            if (require.length !== 0) {
                return op.pin.res(
                    reply(`This endpoint require '${name_dataset}' with specific properties: ${require.join(', ')}`)
                        .error(true)
                )
            }

            op[name_dataset] = { ...op[name_dataset], ...Object.fromEntries(dataset) }
            const context = original_method.bind(this)
            context({ rec, rep, op })
        }
        context.addInitializer(function () {
            if (!this.data) this.data = {}
            this.data[name_dataset] = keys
        })

        return replacement_method
    }
}

export const need = {
    params: (keys: string[]): any => data_method_wrapper('params', keys),
    query: (keys: string[]): any => data_method_wrapper('query', keys),
    body: (keys: string[]): any => data_method_wrapper('body', keys),
    headers: (keys: string[]): any => data_method_wrapper('headers', keys)
}

export const auth = (error: boolean = true, jwt_secret?: string): any => {
    return function (original_method: any, context: ClassMethodDecoratorContext<Controller>) {
        function replacement_method ({ rec, rep, op }: Pinpack) {
            if (!rec.headers.authorization)
                return op.pin.res(
                    reply('This endpoint require \'header\' with specific properties: authorization')
                        .error(true)
                )
            // eslint-disable-next-line no-unused-vars
            const [prefix, token] = rec.headers.authorization.split(' ')
            try {
                const payload = verify(token, jwt_secret || op.auth.secret)
                op.auth.payload = payload
                op.auth.passed = true
            } catch (err) {
                if (error) {
                    return op.pin.res(reply(`${err.message} [${err.name}]`)
                        .error(true)
                        .status(401)
                        .data({ error_code: err.name }))
                } else {
                    op.auth.payload = null
                    op.auth.passed = false
                }
            }
            const context = original_method.bind(this)
            context({ rec, rep, options: op })
        }
        return replacement_method
    }
}
