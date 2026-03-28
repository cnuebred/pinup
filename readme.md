![ok](https://imgur.com/suyNnZg.png)

Pinup - Creating REST APIs Made Easy
====================================
[![npm version](https://img.shields.io/npm/v/pinup.svg?logo=npm)](https://www.npmjs.com/package/pinup)
[![npm downloads](https://img.shields.io/npm/dw/pinup)](https://www.npmjs.com/package/pinup)

**Pinup** is a library that enables you to create simple and efficient REST APIs in TypeScript using the Express framework. The library provides a set of tools that allow you to define API endpoints in a modular, readable, and object-oriented manner.

Installation
------------

To get started with the Pinup library, you can install it using the npm package manager:

```bash
npm install pinup
```

Quick Start
-----------

Here's a simple example of using the Pinup library to create API endpoints. Instead of decorators, Pinup now uses configuration objects returned directly from controller methods.

```typescript
import express from 'express'
import path from 'path'
import { Pinup, PinupController, pins, need, reply, Pinpack } from 'pinup'

const app = express()
const pinup = new Pinup(app, {
    port: 3300,
    auth: {
        secret: 'Sekretny-Pierug-2137'
    },
    logger: true,
    logger_file: './server.log'
})

export class Catto extends PinupController {
    $init() {
        this.path = 'catto'
        this.debug_show_statistic()
    }
    
    get_list() {
        return {
            pins: pins.get(),
            need: [need.query(['token'])],
            callback: async ({ req, res, options }: Pinpack) => {
                return options.pin.res(reply('ok'))
            }
        }
    }

    push_to_list() {
        return {
            pins: pins.post('new/:sector_id/:name_secure'),
            need: [
                need.params(['sector_id', 'name_secure']),
                need.body(['list_item'])
            ],
            auth: {
                should_end_with_error: true
            },
            callback: async ({ req, res, options }: Pinpack) => {
                console.log('push_to_list')
                return options.pin.res(reply('ok'))
            }
        }
    }
}

export class Doggo extends PinupController {
    $init() {
        this.path = 'doggo'
        this.pin(Catto)
        this.files(path.resolve('./'), 'assets')
        this.debug_show_statistic()
    }

    get_list() {
        return {
            pins: pins.get(),
            need: [need.query(['token'])],
            callback: async ({ req, res, options }: Pinpack) => {
                options.pin.log('Here is log about how to get list')
                return options.pin.res(reply('ok'))
            }
        }
    }

    push_to_list() {
        return {
            pins: pins.post('new'),
            need: [need.params(['sector_id', 'name_secure'])],
            callback: async ({ req, res, options }: Pinpack) => {
                console.log('push_to_list')
                return options.pin.res(reply('ok'))
            }
        }
    }
}

pinup.pin(Doggo)
pinup.run({
    print_setup_config: true
})
```

```bash
Pinup build in 3ms
Server is running on 3300
Try to open http://localhost:3300
Authentication JWT enabled with  ********************

HTTP Endpoints
┌─────────┬────────┬──────────────────┬────────────────┬───────────────────────┐
│ (index) │ method │ component        │ name           │ path                  │
├─────────┼────────┼──────────────────┼────────────────┼───────────────────────┤
│ 0       │ 'get'  │ 'Doggo'          │ 'get_list'     │ '.../doggo'           │
│ 1       │ 'post' │ 'Doggo'          │ 'push_to_list' │ '.../doggo/new'       │
│ 2       │ 'get'  │ 'Catto <- Doggo' │ 'get_list'     │ '.../doggo/catto'     │
│ 3       │ 'post' │ 'Catto <- Doggo' │ 'push_to_list' │ '.../doggo/catto/new' │
└─────────┴────────┴──────────────────┴────────────────┴───────────────────────┘
┌─────────┬────────────┬──────────────┬─────────────────┐
│ (index) │ controller │ local static │ mapped endpoint │
├─────────┼────────────┼──────────────┼─────────────────┤
│ 0       │ 'Doggo'    │ './'         │ '/doggo/assets' │
└─────────┴────────────┴──────────────┴─────────────────┘
```

Features
--------

### Controllers & Endpoints

In Pinup, controllers extend the `PinupController` class. To create an endpoint, define a method that returns a configuration object containing the following properties:

* **`pins`**: Defines the HTTP method and path (e.g., `pins.get()`, `pins.post('new')`).
* **`need`**: An array specifying required parameters in requests (e.g., `need.params(['id'])`, `need.query(['page'])`, `need.body(['data'])`). It automatically validates the incoming request.
* **`auth`**: An optional configuration object (e.g., `{ should_end_with_error: true }`) requiring JWT authentication for accessing the endpoint.
* **`callback`**: An async function `({ req, res, options }: Pinpack) => {}` containing the business logic. 

### Class `Pinup`

The `Pinup` class is used for configuring and running the Express application.

* `new Pinup(app: express.Express, config?: PinupConfigType)`: Creates a Pinup instance. Accepts options like port, auth secret, and logging preferences.
* `pin(ControllerClass)`: Registers a root controller to the application.
* `run(config: RunSetupConfig)`: Launches the Express server and optionally prints the setup config table to the console.

### Function `reply` (`pinreply`)

The `reply` function creates a flexible response object with customizable properties.

* `reply(content: string | Pinres)`: Accepts either a string (used as a default message) or a predefined `Pinres` object (allowing you to set custom `status`, `error`, `data`, etc.).
* It returns a response object with default values that can be safely passed to `options.pin.res()`.

Contribution
------------

If you want to contribute to the Pinup project, go ahead! I have an open repository on GitHub where you can report issues and submit pull requests: [Pinup Repository on GitHub](https://github.com/cnuebred/pinup)
