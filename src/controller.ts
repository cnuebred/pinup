import { JwtPayload, verify } from 'jsonwebtoken'
import { __provider__ } from './router'
import { AuthDecoratorArgType, Controller, CustomPinupController, MethodType, Pinpack, PinupControllerTypeEnum, RequestMethod } from './d'
import { $path, one_or_many, PINS_METHODS } from './utils'
import { pinreply } from './response'
import path from 'path'


export function pin(
    path: string,
    ParentClass?: (new (...args: any[]) => any)
): any {
    const parent = ParentClass ? new ParentClass() : undefined
    if (ParentClass && !parent?.private_controller_key)
        throw new Error(`Parent class '${ParentClass.name}' is not assignable to parameter of Controller class`)

    return function <T extends Controller>
        (OriginalMethod: T, context: ClassDecoratorContext): Controller {
        const om = new OriginalMethod()

        const SubController: Controller = class extends OriginalMethod {
            name = context.name
            private_controller_key = true
            path = path
            initializer = om.__init__
            full_path = [...parent?.full_path || '', path]
            parent_name = parent?.name
            parent = parent
        }
        __provider__.push(new SubController())
        return SubController
    }
}

const pins_wrapper = (method: RequestMethod, path: string | string[]) => {
    return {
        method,
        path: one_or_many(path).many('')
    }
}

export const pins = Object.fromEntries(PINS_METHODS.map((item: RequestMethod) => {
    return [item, (...path: string[]) => pins_wrapper(item, path)]
    // eslint-disable-next-line no-unused-vars
})) as { [K in RequestMethod]: (...path: string[]) => any }

const data_method_wrapper = (
    callback: ({req, res, options}: Pinpack) => {},
    name_dataset: 'params' | 'query' | 'body' | 'headers', 
    keys: string[], 
) => {
        return async ({ req, res, options }: Pinpack) => {
            const req_dataset = req[name_dataset]
            const require = []
            let dataset = keys.map(item => {
                return [item, req_dataset[item.startsWith('?') ? item.slice(1) : item]]
            }).filter(([key, value]) => {
                if (key.startsWith('?')) {
                    return true
                }
                if (!value) {
                    require.push(key)
                    return false
                }
                return true
            })

            if (require.length !== 0) {
                return options.pin.res(
                    pinreply({
                        msg: `This endpoint require '${name_dataset}' with specific properties: ${require.join(', ')}`,
                        status: 400,
                    })
                )
            }
            dataset = dataset.map(([key, value]) => {
                return [key.startsWith('?') ? key.slice(1) : key, value]
            })
            options[name_dataset] = { ...options[name_dataset], ...Object.fromEntries(dataset) }
            callback({ req, res, options })
    }
}

export const need = {
    params: (keys: string[]) => ({
        method: 'params',
        keys
    }),
    query: (keys: string[]) => ({
        method: 'query',
        keys
    }),
    body: (keys: string[]) => ({
        method: 'body',
        keys
    }),
    headers: (keys: string[]) => ({
        method: 'headers',
        keys
    }),
}



export const auth = (callback: ({ req, res, options }: Pinpack) => {}, auth_options: AuthDecoratorArgType) => {
        return async ({ req, res, options }: Pinpack) => {
            auth_options.data_source = auth_options.data_source || 'headers'
            auth_options.data_name = auth_options.data_name || 'authorization'

            const auth_data = req[auth_options.data_source]?.[auth_options.data_name]
            if (!auth_data && auth_options.should_end_with_error)
                return options.pin.res(
                    pinreply({
                        msg: `This endpoint require \'${
                            auth_options.data_source
                        }\' with specific properties: authorization`,
                        status: 400,
                        error: true
                    }
                    )
                )
            // eslint-disable-next-line no-unused-vars
            const auth = options.auth
            try {
                const [prefix, token] = auth_data.split(' ')
                const payload = verify(token, auth_options.jwt_secret || auth.secret)
                auth.payload = payload as JwtPayload
                auth.token_prefix = prefix as string
                auth.passed = true
            } catch (err) {
                if (auth_options.should_end_with_error) {
                    return options.pin.res(pinreply({
                        msg: `${err.message} [${err.name}]`,
                        error: true,
                        status: 401,
                        data: {
                            error_code: err.name
                        }
                    }
                    ))
                } else {
                    auth.token_prefix = null
                    auth.payload = null
                    auth.passed = false

                }
            }
            await callback({ req, res, options })
    }
}


export type MethodObject = {
    pins: { method: RequestMethod, path: string[] },
    need?: {
            method: "params" | "query" | "body" | "headers";
            keys: string[];
        }[],
    auth?: AuthDecoratorArgType
    callback: ({ req, res, options }: Pinpack) => {}
}
export abstract class PinupController {
    #parent: PinupController | null = null
    #children: PinupController[] = []
    #path: string = '/'
    static_dirs: string[][] = []
    #type: PinupControllerTypeEnum = PinupControllerTypeEnum.DEFAULT
    methods: MethodType[] = []
    constructor() {
        const methodsNames = Object.getOwnPropertyNames(Object.getPrototypeOf(this))

        for (let methodName of methodsNames) {
            if (methodName == 'constructor' || methodName == '$init')
                continue
            const methodParams: MethodObject = this[methodName]()
            let callback = methodParams.callback
            if(!methodParams.pins)
                throw `Method: ${methodName}, doesn't have request's method specified`

            if(methodParams.auth){
                callback = auth(callback, methodParams.auth)
            }

            for(let need of methodParams.need){
                callback = data_method_wrapper(
                    callback, need.method, need.keys
                )
            }
            console.log(methodParams)
            this.methods.push({
                method: methodParams.pins.method,
                data: methodParams.need,
                name: methodName,
                parent: this,
                path: methodParams.pins.path,
                foo: callback
            })
        }

    }
    get parent(): PinupController { return this.#parent }

    get type(): PinupControllerTypeEnum { return this.#type }
    set type(value: PinupControllerTypeEnum) { this.#type = value }

    get path(): string { return this.#path }
    set path(value: string) { this.#path = $path(value).normalize() }

    get full_path(): string {
        if (this.parent)
            return $path(this.parent.full_path).join(this.path)

        return this.path
    }
    get children(): PinupController[] { return this.#children }

    abstract $init(): void

    pin(child: CustomPinupController) {
        const child_module = new child()
        child_module.#parent = this
        this.#children.push(child_module)
        return this
    }

    files(_path: string, dir: string = '') {
        this.static_dirs.push([$path(this.full_path).join(dir), path.relative('./', _path)])
    }

    debug_show_statistic() { }
}