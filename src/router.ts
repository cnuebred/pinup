import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import { lstatSync, readdirSync } from 'fs'
import path from 'path'
import { Reply } from './response'
import { MethodType, PinupConfigType, Controller, RequestMethod, MethodFunctionOptions, AuthType, ComponentTypeMethod, Pinpack, PinupWsConfigType } from './d'
import { pin_component, one_or_many, format, PinComponent } from './utils'
import { SignOptions, sign } from 'jsonwebtoken'

// eslint-disable-next-line n/no-deprecated-api
import { parse } from 'url';
import { WebSocketServer } from 'ws';

export const __provider__: Controller[] = []

const DEFAULT_PINUP_CONFIG: PinupConfigType = {
    port: 3000,
    provider_dir: path.resolve(''),
    static_path: '/',
    request_logger: true
}
const DEFAULT_PINUPWS_CONFIG: PinupWsConfigType = {
    port: 3000,
    request_logger: true
}

export class PinupWss {
    pinupws_config: PinupWsConfigType
    path: string
    port: number
    wss: WebSocketServer
    constructor (pinupws_config: PinupWsConfigType = {}) {
        this.pinupws_config = { ...DEFAULT_PINUPWS_CONFIG, ...pinupws_config }
    }

    setup (path: string, port: number) {
        this.path = path
        this.port = port
        this.wss = new WebSocketServer({ noServer: true });
    }
}

export class Pinup {
    #provider: Controller[] = __provider__ // private
    components: PinComponent[] = [] // private
    websocket_list: PinupWss[] = []
    pinup_config: PinupConfigType = {}
    component_paths: string[] = []
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
        component_path = component_path.map(item => {
            if (item.startsWith('/'))
                item = item.slice(1)
            if (item.endsWith('/'))
                item = item.slice(0, -1)
            return item
        }).filter(item => !!item)
        return `/${component_path.join('/')}`
    }

    private get_all_modules = (dirs: string | string[], callback: (relative_path: string) => void, filetype: string = '.ts') => {
        one_or_many(dirs).many().forEach(dir => {
            const inside_dir = readdirSync(dir).map(item => {
                if (!(['node_modules', ...(this.pinup_config?.ignore_dirs || [])])
                    .includes(item))
                    return path.resolve(path.join(dir, item))
                return null
            }).filter(item => !!item)
            inside_dir.forEach(dir_elements => {
                dir = path.resolve(dir_elements)
                if (lstatSync(dir).isDirectory())
                    return this.get_all_modules([dir], callback, filetype)
                if (!dir.endsWith(filetype)) return null

                callback(path.resolve(dir))
            })
        })
    }

    private async require_middleware () {
        const callback = async (component_path) => {
            const path_dirname = path.dirname(component_path)
            if (!this.component_paths.includes(path_dirname))
                this.component_paths.push(path_dirname)
            require(component_path)
        }

        this.get_all_modules(this.pinup_config.provider_dir, callback, '.ts')
    }

    private authorization_jwt () {
        if (!this.pinup_config?.auth?.secret) {
            throw Error('You cannot use auth properties due they\'re disable. Type auth secret in Pinup options')
        }
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

    async setup () {
        for (const module of this.#provider) {
            if (module.initializer) await module.initializer(this.app)
            const component = pin_component({
                name: module.name,
                path: one_or_many(module.path),
                full_path: one_or_many(module.full_path),
                methods: []
            })
            this.components.push(component)
            if (module.methods)
                module.methods.forEach((method: MethodType) => {
                    component.set_method({
                        name: method.name,
                        method: method.method as RequestMethod,
                        endpoint: one_or_many(method.path),
                        path: one_or_many([...module.full_path, ...method.path].filter(item => !!item)),
                        parent: module,
                        foo: method.foo.bind(module),
                        data: method.data
                    })
                })
        }
        this.components.forEach((component: PinComponent) => {
            const endpoint_callback = (req: Request, res: Response, next: NextFunction, item: ComponentTypeMethod) => {
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
                return item.foo({ rec: req, rep: res, op: options } as Pinpack)
            }
            component.for_each_methods(item => {
                this.app[item.method](
                    this.transform_path(item.path.value_of()),
                    (req: Request, res: Response, next: NextFunction) => endpoint_callback(req, res, next, item))
            })
        })
    }

    pin_method_extensions (req: Request, res: Response, item: ComponentTypeMethod) {
        const pin = {
            res: (reply: Reply) => { res.status(reply.value().status).json(reply.path(item.path.one('/')).value()) },
            module: (name: string) => this.components.find((item: PinComponent) => item.value_of().name == name),
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
                    format(date, '[$h:$m:$s|$D.$M.$Y] '),
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

    async run (logger: boolean = true): Promise<void> {
        const start_time = performance.now()
        await this.setup()
        const server = this.app.listen(this.pinup_config.port, () => {
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
                            component: method.parent.name,
                            name: method.name,
                            path: this.transform_path(method.path.value_of())
                        })
                    })
                })
                console.table(methods)
            }
        })

        this.websocket_list.forEach(ws => {
            server.on('upgrade', (request, socket, head) => {
                const { pathname } = parse(request.url)
                if (pathname == ws.path)
                    ws.wss.handleUpgrade(request, socket, head, socket => {
                        ws.wss.emit('connection', request, socket)
                    })
                else
                    socket.destroy()
            })
        })
    }

    add_websocket (path: string = '/', callback: (wss: WebSocketServer) => void, port: number = null) {
        const wss = new PinupWss(this.pinup_config?.websocket_config)
        this.websocket_list.push(wss)
        wss.setup(path, port)
        callback(wss.wss)
        return wss.wss
    }

    add_static_path_of_components (add_static_path: string = '', static_dir_path?: (item: path.ParsedPath) => string) {
        this.component_paths.forEach(item => {
            this.add_static_path(path.join(path.relative('./', item), add_static_path), !static_dir_path ? null : static_dir_path(path.parse(item)))
        })
    }

    add_static_path (files_path: string, static_dir?: string) {
        this.app.use(
            static_dir || this.pinup_config.static_path,
            express.static(path.resolve(files_path))
        )
    }
}
