import { verify } from 'jsonwebtoken'
import { __provider__ } from './router'
import { Controller, MethodFunctionOptions, RequestMethod } from './d'
import { Request, Response } from 'express'

export type Pinpack = {
  rec: Request
  rep: Response,
  op: MethodFunctionOptions
}

export function pin<A extends Controller> (path: string, ParentClass?: A): any {
  const parent = ParentClass ? new ParentClass() : undefined
  return function (constructor: Controller) {
    const PinupController = constructor

    constructor.prototype.path = path
    constructor.prototype.full_path = [...parent?.full_path || '', path]
    constructor.prototype.parent = ParentClass

    __provider__.__modules__.push(new PinupController())
  }
}

export const auth = (error: boolean = true, jwt_secret?: string): any => {
  return function (target: any, name: string, descriptor: TypedPropertyDescriptor<any>) {
    const method = descriptor.value

    descriptor.value = function ({ rec, rep, op }: Pinpack) {
      // eslint-disable-next-line no-unused-vars
      const [prefix, token] = rec.headers.authorization.split(' ')
      try {
        const payload = verify(token, jwt_secret || op.auth.jwt_secret)
        op.auth.payload = payload
        op.auth.passed = true
      } catch (err) {
        if (error) {
          return op.pinres(
            `${err.message} [${err.name}]`,
            true,
            { status: 401, data: { error_code: err.name } })
        } else {
          op.auth.payload = null
          op.auth.passed = false
        }
      }
      const context = method.bind(this)
      context({ rec, rep, options: op })
    }
  }
}

const pins_wrapper = (method: RequestMethod, path: string = '') => {
  return request_method_wrapper(method, path.split('/'))
}

const request_method_wrapper = (request_method: RequestMethod, path: string[]): any => {
  return function (target: Controller, name: string, descriptor: PropertyDescriptor) {
    if (!target.methods) target.methods = []
    const method = descriptor.value

    descriptor.value = function ({ rec, rep, op }: Pinpack) {
      // console.log(rec)
      op.pinlog(rec)
      const context = method.bind(this)
      context({ rec, rep, op })
    }
    target.methods.push({ method: request_method, name, path, parent: target, foo: descriptor.value })
  }
}
// eslint-disable-next-line no-unused-vars
export const pins: { [K in RequestMethod]: (path?:string) => any } = {
  get: (path?: string) => pins_wrapper('get', path),
  post: (path?: string) => pins_wrapper('post', path),
  delete: (path?: string) => pins_wrapper('delete', path),
  patch: (path?: string) => pins_wrapper('patch', path),
  put: (path?: string) => pins_wrapper('put', path),
  option: (path?: string) => pins_wrapper('option', path)
}

const data_method_wrapper = (name_dataset: 'params' | 'query' | 'body' | 'headers', keys: string[]): any => {
  return (target: Controller, name: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value
    descriptor.value = function ({ rec, rep, op: options }: Pinpack) {
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
        return options.pinres(`This endpoint require '${name_dataset}' with specific properties: ${require.join(', ')}`, true)
      }

      options[name_dataset] = { ...options[name_dataset], ...Object.fromEntries(dataset) }
      const context = method.bind(this)
      context({ rec, rep, options })
    }
  }
}

export const need = {
  params: (keys: string[]): any => data_method_wrapper('params', keys),
  query: (keys: string[]): any => data_method_wrapper('query', keys),
  body: (keys: string[]): any => data_method_wrapper('body', keys),
  headers: (keys: string[]): any => data_method_wrapper('headers', keys)
}
