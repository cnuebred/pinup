/* eslint-disable no-unused-vars */
/* eslint-disable no-use-before-define */
import express, { NextFunction, Request, Response } from 'express'
import { JwtPayload, SignOptions } from 'jsonwebtoken'
import { Reply } from './response'
import { $path, OneOrMany, PinComponent } from './utils'

declare global {
  export interface Date {
    format: (this: Date, format: string) => string
  }
}
export type Pinpack = {
  rec: Request
  rep: Response,
  op: MethodFunctionOptions
}

export type ComponentTypeMethod = {
  name: string,
  endpoint: string,
  path: string,
  method: RequestMethod
  parent: PinupController
  action: ({ rec, rep, op }: Pinpack) => any,
  data: {
    // eslint-disable-next-line no-unused-vars
    [index in RequestData]?: string[]
  }
}

export type ComponentType = {
  name: string,
  path: OneOrMany<string>,
  full_path: OneOrMany<string>,
  methods: ComponentTypeMethod[]
}

type book<T> = { [index: string]: T }
export type AuthType = {
  secret?: string
  expires_in?: string | number | undefined
  passed?: boolean,
  payload?: JwtPayload | null
  sign: (payload: string | object | Buffer, secretOrPrivateKey?: null, options?: SignOptions & { algorithm: 'none' }) => string

}
export type MethodFunctionOptions = {
  next: NextFunction
  self: ComponentTypeMethod
  pin: {
    res: (reply: Reply) => void
    log: (message?: string) => void
  }
  auth: AuthType
  params: book<string>
  headers: book<string>
  query: book<string>
  body: book<any>
}
export type Controller = { new(...args: any[]) } & PinupType

export type PinupType = {
  name: string
  path: string
  initializer: (app: express.Express) => void
  full_path: string
  data: {
    [K in RequestData]?: string[]
  }
  parent_name: string
  parent?: Controller
  methods: MethodType[]
}

export type MethodType = {
  method: string,
  data?: {
    [K in RequestData]?: string[]
  }
  name: string,
  parent: Controller
  path: string[],
  foo: ({ rec, rep, op }: Pinpack) => void
}

export type RequestMethod = 'get' | 'post' | 'patch' | 'delete' | 'put' | 'option'
export type RequestData = 'params' | 'query' | 'body' | 'headers'

// Response
export type Pinres = {
  error: boolean,
  msg: string,
  path: string,
  timestamp: number
  data: { [index: string]: any } | any[]
  status: number,
  type: string
}
export type PinresOptions = {
  data?: { [index: string]: any },
  path?: string,
  timestamp?: number
  status?: number
}
// Router
export type ModuleType = {
  method: string,
  name: string,
  parent: Controller
  foo: (arg: Pinpack) => any
  path: string[]
}

export type ProviderType = {
  __modules__: Controller[]
  modules: ModuleType[]
}

export type PinupConfigType = {
  port?: number
  provider_dir?: string | string[]
  static_path?: string,
  files_ext?: string[]
  ignore_dirs?: string[]
  responses?: string | string[]
  request_logger?: boolean,
  websocket_config?: PinupWsConfigType
  auth?: {
    secret?: string,
    expires_in?: string
  }
  logger?: (port) => string
}

export type PinupOptionsType = {
  auth?: AuthType
}

export type PinupWsConfigType = {

}


enum PinupControllerTypeEnum {
  DEFAULT,
  CUSTOM,
  VIEW,
  LOGIN,
  RESOLVER
}

export type CustomPinupController = new (...args: any[]) => PinupController

export abstract class PinupController {
    #parent: PinupController | null = null
    #children: PinupController[] = []
    #path: string = '/'
    #type: PinupControllerTypeEnum = PinupControllerTypeEnum.DEFAULT
    constructor() { }
    methods: MethodType[]
    
    get parent(): PinupController { return this.#parent }

    get type():PinupControllerTypeEnum { return this.#type }
    set type(value:PinupControllerTypeEnum) { this.#type = value }

    get path():string { return this.#path }
    set path(value: string) { this.#path = $path(value).normalize() }
    
    get full_path(): string { 
      if(this.parent)
        return $path(this.parent.full_path).join(this.path) 

      return this.path
     }
    get children(): PinupController[] { return this.#children }

    abstract $init(): void

    pin(child: CustomPinupController){
        const child_module = new child()
        child_module.#parent = this
        this.#children.push(child_module)
        return this
    }

    debug_show_statistic() {}
}