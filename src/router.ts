import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import { lstatSync, readdirSync } from 'fs'
import path from 'path'
import { Reply, reply } from './response'
import { MethodType, PinupConfigType, Controller, RequestMethod, MethodFunctionOptions, AuthType, ComponentTypeMethod, Pinpack, PinupWsConfigType } from './d'
import { one_or_many, format, $path, colorize, ColorCode } from './utils'
import { SignOptions, sign } from 'jsonwebtoken'

// eslint-disable-next-line n/no-deprecated-api
import { parse } from 'url';
import { WebSocketServer } from 'ws';
import { PinupController } from './controller'

export const __provider__: Controller[] = []

const DEFAULT_PINUP_CONFIG: PinupConfigType = {
    port: 3000,
    static_path: '/',
    logger: true
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
    constructor(pinupws_config: PinupWsConfigType = {}) {
        this.pinupws_config = { ...DEFAULT_PINUPWS_CONFIG, ...pinupws_config }
    }

    setup(path: string, port: number) {
        this.path = path
        this.port = port
        this.wss = new WebSocketServer({ noServer: true });
    }
}

export class Pinup {
    #controllers: PinupController[] = []
    #websocket_list: PinupWss[] = []
    #config: PinupConfigType = {}
    static_dirs: string[][] = []
    app: express.Express

    constructor(app: express.Express, pinup_config: PinupConfigType = {}) {
        this.app = app
        this.#config = { ...DEFAULT_PINUP_CONFIG, ...pinup_config }
        this.app_express_middleware()
    }

    private app_express_middleware() {
        this.app.use(express.json())
        this.app.use(cors())
    }

    public pin(ModulePinupController: new (...args: any[]) => PinupController) {
        const module = new ModulePinupController()
        module.$init()
        this.static_dirs.push(...module.static_dirs)
        this.#controllers.push(module)
        const append_children = (children: PinupController[]) => {
            for (const child of children) {
                child.$init()
                this.static_dirs.push(...child.static_dirs)
                this.#controllers.push(child)
                append_children(child.children)
            }
        }
        append_children(module.children)
        this.add_static_dirs()
    }

    private authorization_jwt() {
        if (!this.#config?.auth?.secret) {
            throw Error('You cannot use auth properties due they\'re disable. Type auth secret in Pinup options')
        }
        const auth: AuthType = {
            secret: this.#config?.auth?.secret || 'secret',
            expires_in: this.#config?.auth?.expires_in || '1h',
            passed: undefined,
            payload: null,
            sign: (payload: string | object | Buffer, secretOrPrivateKey?: null, options?: SignOptions & { algorithm: 'none' }) => {
                return sign(payload, secretOrPrivateKey || auth.secret, { ...{ expiresIn: auth.expires_in || '1h' }, ...options })
            }
        }
        return auth
    }

    async setup() {
        for (const module of this.#controllers) {
            const endpoint_callback = (req: Request, res: Response, next: NextFunction, item: ComponentTypeMethod) => {
                const pin = this.pin_method_extensions(req, res, item)
                const options = {
                    auth: this.authorization_jwt(),
                    self: item,
                    query: {},
                    body: {},
                    params: {},
                    headers: {},
                    next,
                    pin
                }
                try {
                    if (this.#config.logger)
                        options.pin.log('LOG')

                    return item.action({ rec: req, rep: res, op: options } as Pinpack)
                } catch (err) {
                    return options.pin.res(reply(`Pinup Error: ${err.message}`).error(true).status(500))
                }
            }
            if (module.methods)
                for (const method of module.methods) {
                    const parsed_method: ComponentTypeMethod = {
                        name: method.name,
                        method: method.method as RequestMethod,
                        endpoint: $path(...method.path).normalize(),
                        path: $path(module.full_path, ...method.path).normalize(),
                        parent: module,
                        action: method.foo.bind(module),
                        data: method.data
                    }
                    this.app[parsed_method.method](
                        parsed_method.path,
                        (req: Request, res: Response, next: NextFunction) => endpoint_callback(req, res, next, parsed_method))
                }
        }
    }

    pin_method_extensions(req: Request, res: Response, item: ComponentTypeMethod) {
        return {
            res: (reply: Reply) => { res.status(reply.value().status).json(reply.path(item.path).value()) },
            log: (message?: string) => {
                const date = new Date()
                const date_format = format(date, '$D/$M/$Y|$h:$m:$s')
                const method = item.method
                const name = item.parent.constructor.name
                const path = req.route.path
                const auth = `(auth:${!!req.headers.authorization})`
                const time_string = `[${colorize(date_format, ColorCode.YELLOW)}]`
                const method_path_string = `{${colorize(method.toUpperCase(), ColorCode.GREEN)}, ${colorize(path, ColorCode.GREEN)}}`
                const data_formats = Object.keys(item.data)
                const log_localization = `[${colorize(name, ColorCode.CYAN)}.${colorize(item.name, ColorCode.MAGENTA)}, ${colorize(auth, ColorCode.RED)} ${data_formats}]`
                const log = `${time_string} ${log_localization} ${method_path_string} ${!!message ? colorize(message, ColorCode.BLUE) : ''}`
                console.log(log)
                return log
            }
        }
    }

    async run(logger: boolean = true): Promise<void> {
        const start_time = performance.now()
        await this.setup()
        const server = this.app.listen(this.#config.port, () => {
            console.log(`Server build in ${Math.ceil((performance.now() - start_time)) / 1000}s`)
            console.log(`Server is running on ${this.#config.port}`)
            console.log(`Authentication JWT ${this.#config?.auth?.secret ? 'enabled with' : 'disable'}  ${'*'.repeat(this.#config?.auth?.secret?.length || 0)}`)
            if (logger) {
                const methods = []
                const parent_name = (parent: Controller) => {
                    const names = []
                    while (parent?.constructor.name) {
                        names.push(parent.constructor.name)
                        parent = parent.parent
                    }
                    return names
                }
                this.#controllers.forEach(item => {
                    for (const method of item.methods) {
                        methods.push({
                            method: method.method,
                            component: parent_name(method.parent).join('<-'),
                            name: method.name,
                            path: '...' + $path(method.parent.full_path, ...method.path).normalize().slice(-70)
                        })
                    }
                })
                console.table(methods)
            }
        })

        this.#websocket_list.forEach(ws => {
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

    add_websocket(path: string = '/', callback: (wss: WebSocketServer) => void, port: number = null) {
        const wss = new PinupWss(this.#config?.ws_config)
        this.#websocket_list.push(wss)
        wss.setup(path, port)
        callback(wss.wss)
        return wss.wss
    }

    add_static_dirs() {
        this.static_dirs.forEach((dir) => {
            this.app.use(dir[0], express.static(path.resolve(dir[1]))
            )
        })
    }
}



