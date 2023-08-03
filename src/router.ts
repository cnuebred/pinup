import { Build } from '@cnuebred/hivecraft/dist/core'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import { lstatSync, readdirSync } from 'fs'
import path from 'path'
import { Reply } from './response'
import { MethodType, PinupConfigType, Controller, RequestMethod, MethodFunctionOptions, AuthType, ComponentTypeMethod, Pinpack } from './d'
import { Component, OneOrMany } from './utils'
import { SignOptions, sign } from 'jsonwebtoken'

// eslint-disable-next-line no-extend-native
Date.prototype.format = function (this: Date, time: string): string {
    const add_zero = (text: string, size: number = 2) => ('0'.repeat(size) + text).slice(-size)
    time = time.replaceAll(/\$ms/gm, add_zero(this.getMilliseconds().toString()))
        .replaceAll(/\$s/gm, add_zero(this.getSeconds().toString()))
        .replaceAll(/\$m/gm, add_zero(this.getMinutes().toString()))
        .replaceAll(/\$h/gm, add_zero(this.getHours().toString()))
        .replaceAll(/\$D/gm, add_zero(this.getDate().toString()))
        .replaceAll(/\$M/gm, add_zero((this.getMonth() + 1).toString()))
        .replaceAll(/\$Y/gm, add_zero(this.getFullYear().toString(), 4))

    return time
}
// const Just = <T>(pack: T) => ({
//     map: (fn: <T>(pack: T) => typeof Just<T>) => Just(fn(pack)),
//     value_of: () => !Array.isArray(pack) ? [pack] : pack,
//     exist: () => pack ? Just(pack) : Just([]),
//     inspect: () => `Just(${pack})`,
//     type: 'just'
// })

export const __provider__: Controller[] = []

export const get_all_modules = (dirs: string | string[], callback: (relative_path: string) => void, filetype: string = '.ts') => {
    OneOrMany(dirs).value_of().forEach(dir => {
        dir = path.resolve(dir)
        const dir_content = readdirSync(dir, { recursive: true })
        dir_content.forEach(item => {
            const relative_path = path.join(dir, item)
            if (lstatSync(relative_path).isDirectory())
                return get_all_modules([relative_path], callback, filetype)
            if (!item.endsWith('.ts')) return null

            callback(path.resolve(relative_path))
        })
    })
}

const DEFAULT_PINUP_CONFIG: PinupConfigType = {
    port: 3000,
    provider_dir: path.resolve(''),
    request_logger: true
}

export class Pinup {
    #provider: Controller[] = __provider__ // private
    components: Component[] = [] // private
    templates: Build[] = []
    pinup_config: PinupConfigType = {}
    app: express.Express

    constructor (app: express.Express, pinup_config: PinupConfigType = {}) {
        this.app = app
        this.pinup_config = { ...DEFAULT_PINUP_CONFIG, ...pinup_config }
        this.pre_setup()
        this.require_middleware()
    }

    private pre_setup () {
        this.app.use(express.json())
        this.app.use(cors())
    }

    private transform_path (component_path: string[]) {
        component_path = component_path.filter(item => !!item)
        return `/${component_path.join('/')}`
    }

    private require_middleware () {
        const callback = (path) => {
            const component = require(path)
            if (path.endsWith('.view.ts'))
                Object.values(component).forEach((item: Build) => {
                    this.templates.push(item)
                })
        }

        get_all_modules(this.pinup_config.provider_dir, callback, '.ts')
    }

    private authorization_jwt () {
        const auth: AuthType = {
            secret: this.pinup_config?.auth?.secret || 'secret',
            expires_in: this.pinup_config?.auth?.expires_in || '1h',
            passed: undefined,
            payload: null,
            sign: (payload: string | object | Buffer, secretOrPrivateKey?: null, options?: SignOptions & { algorithm: 'none' }) => {
                return sign(payload, secretOrPrivateKey || auth.secret, { ...{ expiresIn: auth.expires_in || '1h' }, ...options })
            }
        }
        return auth
    }

    setup () {
        this.#provider.forEach((module) => {
            const component = Component({
                name: module.name,
                path: OneOrMany(module.path),
                full_path: OneOrMany(module.full_path),
                methods: []
            })
            this.components.push(component)
            module.methods.forEach((method: MethodType) => {
                component.set_method({
                    name: method.name,
                    method: method.method as RequestMethod,
                    endpoint: OneOrMany(method.path),
                    path: OneOrMany([...module.full_path, ...method.path].filter(item => !!item)),
                    parent: module,
                    foo: method.foo.bind(module),
                    data: method.data
                })
            })
        })
        this.components.forEach((component: Component) => {
            const endpoint_callback = (req: Request, res: Response, next: NextFunction, item:ComponentTypeMethod) => {
                const { pin } = this.pin_method_extensions(req, res, item)
                const options: MethodFunctionOptions = {
                    auth: this.authorization_jwt(),
                    self: item,
                    query: {},
                    body: {},
                    params: {},
                    headers: {},
                    next,
                    pin
                }
                Object.defineProperty(options, 'auth', {
                    get: () => {
                        if (!this.pinup_config?.auth?.secret) {
                            throw Error('You cannot use auth properties due they\'re disable. Type auth secret in Pinup options')
                        }
                        return this.pinup_config.auth
                    }
                })
                return item.foo({ rec: req, rep: res, op: options } as Pinpack)
            }
            component.for_each_methods(item => {
                this.app[item.method](
                    this.transform_path(item.path.value_of()),
                    (req:Request, res:Response, next:NextFunction) => endpoint_callback(req, res, next, item))
            })
        })
    }

    pin_method_extensions (req: Request, res: Response, item:ComponentTypeMethod) {
        const pin = {
            res: (reply: Reply) => { res.status(reply.value().status).json(reply.path(item.path.one('/')).value()) },
            module: (name: string) => this.components.find((item: Component) => item.value_of().name == name),
            redirect: (
                name: string,
                query: { [index: string]: string } = {},
                params: { [index: string]: string } = {}
            ) => {
                const create_query = () => Object.entries(query).map(([key, value]) => `${key}=${value}`).join('&')
                const create_params = (path: string) => {
                    Object.entries(params).forEach(([key, value]) => {
                        path = path.replace(`:${key}`, value)
                    })
                    return path
                }
                if (!pin.module(name)) { throw new Error('This module doesn\'t exist') }

                res.redirect(create_params(this.transform_path((pin.module(name).value_of().path.value_of()))) + '?' + create_query())
            },
            log: () => {
                if (!this.pinup_config.request_logger) return ''
                const date = new Date()
                const parts = [
                    date.format('[$h:$m:$s|$D.$M.$Y] '),
                    item.method,
                    item.name,
                    req.route.path,
                    req.headers['user-agent'],
                    `Auth: ${!!req.headers.authorization}`,
                    ''
                ]
                const log = parts.join('\t|')
                console.log(log)
                return log
            }
        }

        return { pin }
    }

    async run (logger: boolean = true): Promise < void> {
        const start_time = performance.now()
        await this.setup()
        this.app.listen(this.pinup_config.port, () => {
            console.log(`Server build in ${Math.ceil((performance.now() - start_time)) / 1000}s`)
            console.log(`Server is running on ${this.pinup_config.port}`)
            console.log(`Authentication JWT ${this.pinup_config?.auth?.secret ? 'enabled with' : 'disable'}  ${'*'.repeat(this.pinup_config?.auth?.secret?.length || 0)}`)
            if (logger) {
                this.pinup_config.request_logger = logger
                const methods = []
                this.components.forEach(item => {
                    item.for_each_methods(method => {
                        methods.push({
                            method: method.method,
                            name: method.name,
                            path: method.path.one('/')
                        })
                    })
                })
                console.table(methods)
            }
        })
    }
}
