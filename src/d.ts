/* eslint-disable no-unused-vars */
/* eslint-disable no-use-before-define */
import { NextFunction, Request, Response } from 'express'
import { JwtPayload, SignOptions } from 'jsonwebtoken'
import { CellRenderOptionsType } from '@cnuebred/hivecraft/dist/d'
import { Reply } from './response'
import { Component, OneOrMany } from './utils'

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
  endpoint: OneOrMany<string>,
  path: OneOrMany<string>,
  method: RequestMethod
  parent: Controller
  foo: ({ rec, rep, op }: Pinpack) => any,
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
  payload?: string | JwtPayload | null
  sign: (payload: string | object | Buffer, secretOrPrivateKey?: null, options?: SignOptions & { algorithm: 'none' }) => string

}
export type MethodFunctionOptions = {
  next: NextFunction
  self: ComponentTypeMethod
  pin: {
    res: (reply:Reply) => void
    module: (name: string) => Component
    log: () => void
    redirect: (
      name: string,
      query?: { [index: string]: string },
      params?: { [index: string]: string }
    ) => void
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
  full_path: string[]
  data: {
    [K in RequestData]?: string[]
  }
  parent?: Controller
  // eslint-disable-next-line no-use-before-define
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
  foo: (req: Request, res: Response, options: MethodFunctionOptions) => void
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
  ignore_dirs?: string[]
  template_dir?: string | string[]
  template_render_options?: CellRenderOptionsType
  responses?: string | string[]
  request_logger?: boolean
  auth?: {
    secret?: string,
    expires_in?: string
  }
  logger?: (port) => string
}

export type PinupOptionsType = {
  auth?: AuthType
}
