/* eslint-disable no-use-before-define */
import { Build } from '@cnuebred/hivecraft/dist/core'
import { NextFunction, Request, Response } from 'express'
import { JwtPayload, SignOptions } from 'jsonwebtoken'
import { Pinpack } from './controller'
import { CellRenderOptionsType } from '@cnuebred/hivecraft/dist/d'

declare global {
    export interface Date{
        format: (this: Date, format: string) => string
    }
}

type book<T> = { [index: string]: T }
export type AuthType = {
  jwt_secret?: string
  expires_in?: string | number | undefined
  passed?: boolean,
  payload?: string | JwtPayload | null
  sign: (payload: string | object | Buffer, secretOrPrivateKey?: null, options?: SignOptions & { algorithm: 'none' }) => string

}
export type MethodFunctionOptions = {
  next: NextFunction
  pinres: (msg: string, error?: boolean, options?: PinresOptions) => void
  pinmodule: (name: string) => ModuleType
  pinlog: (req: Request) => void
  pintemplate: (name: string) => { name: string, template: Build }
  pinrender: (name: string, replace: {[index:string]: string | number }) => any
  redirect: (
    name: string,
    query?: { [index: string]: string },
    params?: { [index: string]: string }
  ) => void
  auth: AuthType
  params: book<string>
  headers: book<string>
  query: book<string>
  body: book<any>
}

export type PinupType = {
  path?: string
  full_path: string[]
  parent?: { new(...args: any[]) } & PinupType
  // eslint-disable-next-line no-use-before-define
  methods: MethodType[]
}

export type Controller = { new(...args: any[]) } & PinupType
export type MethodType = {
  method: string,
  name: string,
  parent: Controller
  path: string[],
  foo: (req: Request, res: Response, options: MethodFunctionOptions) => void
}

export type RequestMethod = 'get' | 'post' | 'patch' | 'delete' | 'put' | 'option'

// Response
export type Pinres = {
    error: boolean,
    msg: string,
    path?: string,
    timestamp?: number
    data?: { [index: string]: any }
    status?: number
}
export type PinresOptions = {
    data?: { [index: string]: any },
    path?: string,
    timestamp?: number
    status?: number
}
// Router
export type ModuleType = {
    receive_method: string,
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
