import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import path from 'path'
import { Reply, reply } from './response'
import { PinupConfigType, Controller, RequestMethod, AuthType, ComponentTypeMethod, Pinpack, PinupWsConfigType, RunSetupConfig } from './d'
import { format, $path, colorize, ColorCode } from './utils'
import { SignOptions, sign } from 'jsonwebtoken'

// eslint-disable-next-line n/no-deprecated-api
import { parse } from 'url';
import { WebSocket, WebSocketServer, Server as WsServer } from 'ws';
import { PinupController } from './controller'
import { IncomingMessage, STATUS_CODES } from 'http'
import { Server } from 'http'
import { appendFile, appendFileSync } from 'fs'

export const __provider__: Controller[] = []

const DEFAULT_PINUP_CONFIG: PinupConfigType = {
    port: 3000,
    static_path: '/',
    logger: true
}
const DEFAULT_PINUPWS_CONFIG: PinupWsConfigType = {
    port: 3000,
    logger: true
}

//TODO!!!
export class PinupWss {
    #servers: Map<string, WebSocketServer> = new Map();
    #paths: Map<string, string[]> = new Map();
    config: PinupWsConfigType
    path: string
    port: number
    wss: WebSocketServer
    constructor(config: PinupWsConfigType = {}) {
        this.config = { ...DEFAULT_PINUPWS_CONFIG, ...config }
    }

    add_server(name: string, config: PinupWsConfigType = {}): void {
        if (this.#servers.has(name)) {
            throw new Error(`Server with name ${name} already exists.`);
        }
        const server_config = { noServer: true, ...config };
        const new_server = new WsServer(server_config);
        this.#servers.set(name, new_server);
        this.#paths.set(name, []);
    }
    add_endpoint(server_name: string, path: string, handler: (ws: WebSocket, req: IncomingMessage) => void): void {
        const server = this.#servers.get(server_name);
        if (!server) {
            throw new Error(`Server named ${server_name} does not exist.`);
        }
        this.#paths.get(server_name).push(path)
        server.on('connection', (ws, req) => {
            if (req.url === path) {
                handler(ws, req);
            }
        });
    }
    remove_server(name: string): void {
        if (!this.#servers.has(name)) {
            throw new Error(`Server with name ${name} does not exist.`);
        }
        this.#servers.delete(name);
    }
    print_list_of_websocket(): void {
        const table = []
        this.#paths.forEach((paths, server) => {
            paths.forEach(path => {
                table.push({
                    server: server,
                    endpoint: path
                })
            })
        })
        if (table.length != 0) {
            console.log(colorize('WebSocket Endpoints', ColorCode.BLUE))
            console.table(table)
        }
    }
    attach_to_http_server(httpServer: Server): void {
        this.#servers.forEach((server, name) => {
            httpServer.on('upgrade', (request, socket, head) => {
                if (server.shouldHandle(request)) {
                    server.handleUpgrade(request, socket, head, (ws) => {
                        server.emit('connection', ws, request);
                    });
                }
            });
        });
    }

}

export class Pinup {
    #controllers: PinupController[] = []
    #config: PinupConfigType = {}
    static_dirs: string[][] = []
    app: express.Express
    websocket: PinupWss = new PinupWss()

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

    async #setup() {
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
                const start = performance.now()
                try {
                    const callback = item.action({ rec: req, rep: res, op: options } as Pinpack)
                    const end = (performance.now() - start)

                    if (this.#config.logger)
                        options.pin.log(`LOG +${end.toPrecision(3)}ms`, !!this.#config.logger_file)
                    return callback
                } catch (err) {
                    const end = (performance.now() - start)
                    if (this.#config.logger)
                        options.pin.log(`LOG +${end.toPrecision(3)}ms`, !!this.#config.logger_file)
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

    private pin_method_extensions(req: Request, res: Response, item: ComponentTypeMethod) {
        return {
            res: (reply: Reply) => { res.status(reply.value().status).json(reply.path(item.path).value()) },
            log: (message: string, to_file: boolean = false) => {
                const date = new Date()
                const date_format = format(date, '$D/$M/$Y|$h:$m:$s')
                const method = colorize(item.method.toUpperCase(), ColorCode.GREEN)
                const parent_name = colorize(item.parent.constructor.name, ColorCode.CYAN)
                const child_name = colorize(item.name, ColorCode.MAGENTA)
                const path = colorize(req.route.path, ColorCode.GREEN)
                const auth = !!req.headers.authorization ? 'auth' : ''
                const time_string = `[${colorize(date_format, ColorCode.YELLOW)}]\t`
                const data_formats = auth + Object.keys(item.data)
                const log_localization = `${parent_name}.${child_name}\t`
                const method_path_string = `{${method} - ${data_formats}, ${path}}\t`
                const log = `${time_string} ${log_localization} ${method_path_string} ${colorize(message, ColorCode.BLUE)}`

                if (to_file && this.#config.logger_file) {
                    appendFile(this.#config.logger_file,
                        log.replaceAll(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '') + '\n',
                        (err) => {
                            if (err) throw err;
                        })
                }

                console.log(log)
                return log
            }
        }
    }


    async run(config: RunSetupConfig): Promise<void> {
        const start_time = performance.now()
        await this.#setup()
        const server = this.app.listen(this.#config.port, () => {
            console.log(`Pinup build in ${colorize(Math.ceil((performance.now() - start_time)).toString() + 'ms', ColorCode.GREEN)}`)
            console.log(`Server is running on ${colorize(this.#config.port.toString(), ColorCode.GREEN)}`)
            console.log(`Try to open ${colorize('http://localhost:' + this.#config.port.toString(), ColorCode.CYAN)}`)
            console.log(`Authentication JWT ${this.#config?.auth?.secret ? 'enabled with' : 'disable'}  ${colorize('*'.repeat(this.#config?.auth?.secret?.length || 0), ColorCode.RED)}`)
            console.log()
            if (config.print_setup_config) {
                const methods = []
                const static_dirs = []
                const parent_name = (parent: Controller) => {
                    const names = []
                    while (parent?.constructor.name) {
                        names.push(parent.constructor.name)
                        parent = parent.parent
                    }
                    return names
                }
                this.#controllers.forEach(item => {
                    for (const paths of item.static_dirs) {
                        static_dirs.push({
                            controller: item.constructor.name,
                            'local static': './' + paths[1],
                            'mapped endpoint': paths[0]
                        })
                    }

                    for (const method of item.methods) {
                        methods.push({
                            method: method.method,
                            component: parent_name(method.parent).slice(0, 4).join(' <- '),
                            name: method.name,
                            path: '...' + $path(method.parent.full_path, ...method.path).normalize().slice(-70),
                        })
                    }
                })
                if (methods.length != 0) {
                    console.log(colorize('HTTP Endpoints', ColorCode.BLUE))
                    console.table(methods)
                }
                if (static_dirs.length != 0) {
                    console.log(colorize('Static Endpoints', ColorCode.BLUE))
                    console.table(static_dirs)
                }
                console.log()
                this.websocket.print_list_of_websocket()
            }
        })

        this.websocket.attach_to_http_server(server)
        // this.#websocket_list.forEach(ws => {
        //     server.on('upgrade', (request, socket, head) => {
        //         const { pathname } = parse(request.url)
        //         if (pathname == ws.path)
        //             ws.wss.handleUpgrade(request, socket, head, socket => {
        //                 ws.wss.emit('connection', request, socket)
        //             })
        //         else
        //             socket.destroy()
        //     })
        // })
    }

    // add_websocket(path: string = '/', callback?: (wss: WebSocketServer) => void, port: number = null) {
    //     const wss = new PinupWss(this.#config?.ws_config)
    //     this.#websocket_list.push(wss)
    //     wss.setup(path, port)
    //     callback(wss.wss)
    //     return wss.wss
    // }

    add_static_dirs() {
        this.static_dirs.forEach((dir) => {
            this.app.use(dir[0], express.static(path.resolve(dir[1]))
            )
        })
    }
}



