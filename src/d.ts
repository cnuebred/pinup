/* eslint-disable no-unused-vars */
/* eslint-disable no-use-before-define */
import express, { NextFunction, Request, Response } from 'express'
import { JwtPayload, SignOptions } from 'jsonwebtoken'
import { Reply } from './response'
import { $path, OneOrMany } from './utils'
import { PinupController } from './controller'

declare global {
  export interface Date {
    format: (this: Date, format: string) => string
  }
}
export type Pinpack = {
  rec: Request
  rep: Response,
  options: MethodFunctionOptions
}

export type ComponentTypeMethod = {
  name: string,
  endpoint: string,
  path: string,
  method: RequestMethod
  parent: PinupController
  action: ({ rec, rep, options }: Pinpack) => any,
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
    log: (message: string, to_file?:boolean) => void
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
  foo: ({ rec, rep, options }: Pinpack) => void
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
  static_path?: string,
  logger?: boolean,
  logger_file?: string,
  ws_config?: PinupWsConfigType
  auth?: {
    secret?: string,
    expires_in?: string
  }
}

export type PinupOptionsType = {
  auth?: AuthType
}

export type PinupWsConfigType = {

}

export type RunSetupConfig = {
  print_setup_config:boolean
}

export enum PinupControllerTypeEnum {
  DEFAULT,
  CUSTOM,
  VIEW,
  LOGIN,
  RESOLVER
}

export type CustomPinupController = new (...args: any[]) => PinupController

