import { Build, Core } from '@cnuebred/hivecraft/dist/core'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import { lstatSync, readdirSync } from 'fs'
import { SignOptions, sign } from 'jsonwebtoken'
import path from 'path'
import { Pinpack } from './controller'
import { MethodFunctionOptions, MethodType, PinupOptionsType, PinupConfigType, ProviderType, ModuleType } from './d'
import { _pinres } from './response'

// eslint-disable-next-line no-extend-native
Date.prototype.format = function (this: Date, time: string): string {
  const add_zero = (text:string, size:number = 2) => ('0'.repeat(size) + text).slice(-size)
  time = time.replaceAll(/\$ms/gm, add_zero(this.getMilliseconds().toString()))
    .replaceAll(/\$s/gm, add_zero(this.getSeconds().toString()))
    .replaceAll(/\$m/gm, add_zero(this.getMinutes().toString()))
    .replaceAll(/\$h/gm, add_zero(this.getHours().toString()))
    .replaceAll(/\$D/gm, add_zero(this.getDate().toString()))
    .replaceAll(/\$M/gm, add_zero((this.getMonth() + 1).toString()))
    .replaceAll(/\$Y/gm, add_zero(this.getFullYear().toString(), 4))

  return time
}

export const __provider__: ProviderType = {
  __modules__: [],
  modules: []
}

const Just = <T>(pack: T) => ({
  map: (fn: <T>(pack: T) => typeof Just<T>) => Just(fn(pack)),
  value_of: () => !Array.isArray(pack) ? [pack] : pack,
  exist: () => pack ? Just(pack) : Just([]),
  inspect: () => `Just(${pack})`,
  type: 'just'
})

export class Pinup {
  #provider: ProviderType = __provider__
  pinup_config: PinupConfigType = {}
  setup_options: PinupOptionsType = {}
  template_views: {name:string, template: Build | null}[] = []
  app: express.Express

  constructor (app: express.Express, options: PinupConfigType = {}) {
    this.app = app
    this.pinup_config = options
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
    Just<string | string[]>(this.pinup_config.provider_dir)
      .exist()
      .value_of()
      .forEach(dir => {
        const get_components = (dir:string) => {
          readdirSync(dir, { recursive: true }).forEach((component_file) => {
            if (lstatSync(path.join(dir, component_file)).isDirectory()) { return get_components(path.join(dir, component_file)) }
            const component = require(path.resolve(path.join(dir, component_file)))
            if (component_file.endsWith('.view.ts')) {
              for (const [key, value] of Object.entries<Core['build']>(component)) {
                const template = {
                  name: key,
                  template: value(this.pinup_config.template_render_options) as null as Build
                }
                this.template_views.push(template)
              }
            }
          })
        }
        get_components(dir)
      })
  }

  private authorization_jwt (secret: string, expires_in: string | number | undefined = '1h') {
    const auth = {
      jwt_secret: secret,
      expires_in,
      passed: undefined,
      payload: null,
      sign: (payload: string | object | Buffer, secretOrPrivateKey?: null, options?: SignOptions & { algorithm: 'none' }) => {
        return sign(payload, secretOrPrivateKey || this.setup_options.auth.jwt_secret, { ...options, ...{ expiresIn: this.setup_options.auth.expires_in || '1h' } })
      }
    }
    Object.defineProperty(this.setup_options, 'auth', {
      get: () => {
        return auth
      }
    })
  }

  async setup () {
    for (const template of this.template_views) {
      template.template = await template.template
    }
    if (this.pinup_config?.auth?.secret) {
      this.authorization_jwt(this.pinup_config.auth.secret, this.pinup_config.auth.expires_in)
    }
    this.#provider.__modules__.forEach((module) => {
      module.methods.forEach((method: MethodType) => {
        this.#provider.modules.push({
          receive_method: method.method,
          name: method.name,
          parent: module,
          foo: method.foo.bind(module),
          path: [...module.full_path, ...method.path]
        })
      })
    })
    this.#provider.modules.forEach(module => {
      const endpoint_callback = (req:Request, res:Response, next:NextFunction) => {
        const { pinres, pinmodule, pintemplate, redirect, pinlog, pinrender } = this.options_method_extensions(req, res, module)
        const options: MethodFunctionOptions = {
          auth: this.setup_options.auth,
          query: {},
          body: {},
          params: {},
          headers: {},
          next,
          pinres,
          pinmodule,
          pinrender,
          redirect,
          pintemplate,
          pinlog
        }
        Object.defineProperty(options, 'auth', {
          get: () => {
            if (!this.setup_options.auth) {
              throw Error('You cannot use auth properties due they\'re disable. Type auth secret in Pinup options')
            }
            return this.setup_options.auth
          }
        })
        return module.foo({ rec: req, rep: res, op: options } as Pinpack)
      }
      this.app[module.receive_method](this.transform_path(module.path), endpoint_callback)
    })
  }

  options_method_extensions (req:Request, res:Response, module: ModuleType) {
    const path = this.transform_path(module.path)

    const pinres = (msg:string, error:boolean = false, options) => { res.status(options?.status || 200).json(_pinres(msg, error, { ...options, ...{ path } })) }
    const pinmodule = (name:string) => this.#provider.modules.find(item => item.name == name)
    const pintemplate = (name:string) => this.template_views.find(item => item.name == name)
    const pinrender = (name:string, replace: {[index:string]: string|number}) => {
      replace = Object.fromEntries(Object.entries(replace).map(item => {
        return [item[0], item[1].toString()]
      }))
      res.send(
        this.template_views.find(item => item.name == name).template.html(replace as {[index:string]: string})
      )
    }
    const redirect = (
      name:string,
      query: {[index:string]: string} = {},
      params: {[index:string]: string} = {}
    ) => {
      const create_query = () => Object.entries(query).map(([key, value]) => `${key}=${value}`).join('&')
      const create_params = (path:string) => {
        Object.entries(params).forEach(([key, value]) => {
          path = path.replace(`:${key}`, value)
        })
        return path
      }
      if (!pinmodule(name)) { throw new Error('This module doesn\'t exist') }

      res.redirect(create_params(this.transform_path((pinmodule(name).path))) + '?' + create_query())
    }
    const pinlog = () => {
      if (!this.pinup_config.request_logger) return ''
      const date = new Date()
      const parts = [
        date.format('[$h:$m:$s|$D.$M.$Y] '),
        module.receive_method,
        module.name,
        req.route.path,
        req.headers['user-agent'],
        `Auth: ${!!req.headers.authorization}`,
        ''
      ]
      const log = parts.join(' | ')
      console.log(log)
      return log
    }
    return {
      pinres, pinmodule, pintemplate, redirect, pinlog, pinrender
    }
  }

  async run (logger: boolean = true): Promise<void> {
    const start_time = performance.now()
    await this.setup()
    this.app.listen(this.pinup_config.port, () => {
      console.log(`Server build in ${Math.ceil((performance.now() - start_time)) / 1000}s`)
      console.log(`Server is running on ${this.pinup_config.port}`)
      console.log(`Authentication JWT ${this.setup_options?.auth?.jwt_secret ? 'enabled with' : 'disable'}  ${'*'.repeat(this.setup_options?.auth?.jwt_secret.length || 0)}`)
      if (logger) {
        this.pinup_config.request_logger = logger
        console.table(this.#provider.modules.map(item => {
          return {
            method: item.receive_method,
            name: item.name,
            path: item.path.filter(item => !!item).join('/')
          }
        }))
        console.table(this.template_views.map(item => {
          return {
            name: item.name,
            'template size': `${item.template.size / 1000}kB`
          }
        }))
      }
    })
  }
}
