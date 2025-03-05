![ok](https://imgur.com/suyNnZg.png)


Pinup - Creating REST APIs Made Easy
====================================
[![npm version](https://img.shields.io/npm/v/pinup.svg?logo=npm)](https://www.npmjs.com/package/pinup)
[![npm downloads](https://img.shields.io/npm/dw/pinup)](https://www.npmjs.com/package/pinup)


**Pinup** is a library that enables you to create simple and efficient REST APIs in TypeScript using the Express framework. The library provides a set of tools and decorators that allow you to define API endpoints in a modular and readable manner.

Installation
------------

To get started with the Pinup library, you can install it using the npm package manager:

    npm install pinup


Quick Start
-----------

Here's a simple example of using the Pinup library to create two API endpoints:
```typescript
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
    @pins.get()
    @need.query(['token'])
    @auth()
    get_list({ req, res, options }) {
        return options.pin.res(reply('ok'))
    }

    @pins.post('new')
    @need.params(['sector_id', 'name_secure'])
    @need.body(['list_item'])
    push_to_list() {
        console.log('push_to_list')
    }
}

export class Doggo extends PinupController {
    $init() {
        this.path = 'doggo'
        this.pin(Catto)
        this.files(path.resolve('./'), 'assets')
        this.debug_show_statistic()
    }
    @pins.get()
    @need.query(['token'])
    get_list({ rec, rep, options }: Pinpack) {
        options.pin.log('Here is log about how to get list')
        return options.pin.res(reply('ok'))
    }

    @pins.post('new')
    @need.params(['sector_id', 'name_secure'])
    @need.body(['list_item'])
    push_to_list({ rec, rep, options }: Pinpack) {
        console.log('push_to_list')
        return options.pin.res(reply('ok'))
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

### Decorators

*   `@pins.method('path')`: Decorator for HTTP methods (e.g., `@pins.get()`, `@pins.post('new')`) attaches handling functions to endpoints.
*   `@need.param(['param1', 'param2'])`: Requires specific parameters in requests for further processing (eg. `@need.query('page_number')`, `@need.body('data_scheme')`).
*   `@auth()`: Requires JWT authentication for accessing the endpoint.

### Class `Pinup`

The `Pinup` class is used for configuring and running the Express application.

*   `new Pinup(app: express.Express, config?: PinupConfigType)`: Creates a Pinup instance.
*   `run(print_setup_config?: boolean)`: Launches the Express server.

### Function `reply`

The `reply` Monad is responsible for creating and sending responses from endpoints.

*   `reply(content: string | Pinres)`: Creates a response instance.
*   Chainable Methods:
    *   `status(status: number)`: Sets the response status.
    *   `error(error: boolean)`: Sets the error flag.
    *   `timestamp(timestamp: number)`: Sets the timestamp.
    *   `path(path: string)`: Sets the response path.
    *   `data(data: { [index: string]: any })`: Adds data to the response.
    *   `map(callback: (item: Pinres) => Pinres)`: Maps the response using a provided function.

Usage Example
-------------


Contribution
------------

If you want to contribute to the Pinup project, go ahead! I have an open repository on GitHub where you can report issues and submit pull requests: [Pinup Repository on GitHub](https://github.com/cnuebred/pinup)


* * *
