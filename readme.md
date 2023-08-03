 Pinup - Creating REST APIs Made Easy

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
import express from 'express';
import { Pinup, Pinpack, Reply, pin, pins, need } from 'pinup'

const app = express();
const pinup = new Pinup(app);

@pin('dogs')
export class DogController {
    @pins.get()
    getDogs({ op }: Pinpack) {
        const dogs = ['Bulldog', 'Poodle', 'Labrador']
        return op.pin.res(Reply().data(dogs))
    }

    @pins.get(':id')
    @need.params(['id'])
    getDogById({ op }: Pinpack) {
        const dogId = op.params.id
        const dog = { id: dogId, breed: 'Bulldog' }
        return op.pin.res(Reply().data(dog))
    }
}

pinup.run();
```
Features
--------

### Decorators

*   `@pin('endpoint')`: Creates a new controller handling endpoints at the specified `endpoint`.
*   `@pins.method('path')`: Decorator for HTTP methods (e.g., `@pins.get()`, `@pins.post('new')`) attaches handling functions to endpoints.
*   `@need.param(['param1', 'param2'])`: Requires specific parameters in requests for further processing.
*   `@auth()`: Requires JWT authentication for accessing the endpoint.

### Class `Pinup`

The `Pinup` class is used for configuring and running the Express application.

*   `new Pinup(app: express.Express, config?: PinupConfigType)`: Creates a Pinup instance.
*   `setup()`: Configures endpoints and controller paths.
*   `run(logger?: boolean)`: Launches the Express server.

### Class `Reply`

The `Reply` class is responsible for creating and sending responses from endpoints.

*   `Reply(content: string | Pinres)`: Creates a response instance.
*   Chainable Methods:
    *   `status(status: number)`: Sets the response status.
    *   `error(error: boolean)`: Sets the error flag.
    *   `timestamp(timestamp: number)`: Sets the timestamp.
    *   `path(path: string)`: Sets the response path.
    *   `data(data: { [index: string]: any })`: Adds data to the response.
    *   `map(callback: (item: Pinres) => Pinres)`: Maps the response using a provided function.

Usage Example
-------------
```typescript
import express from 'express';
import { Pinup, Pinpack, Reply, pin, pins, need } from 'pinup'

const app = express();
const pinup = new Pinup(app);

@pin('items')
export class ItemController {
  @pins.get()
	getItems() {
		const items = ['item1', 'item2', 'item3']
		return Reply().data(items)
	}

  @pins.get(':id')
  @need.params(['id'])
  getItemById({ op }: Pinpack) {
  	const itemId = op.params.id
  	const item = { id: itemId, name: 'Sample Item' }
  	return op.pin.res(Reply().data(item))
  }
}

pinup.run();
``` 

In the above example, a controller handling endpoints '/items' and '/items/:id' is created. The `@pins.get()` and `@pins.get(':id')` decorators specify supported HTTP methods and paths.

Contribution
------------

If you want to contribute to the Pinup project, go ahead! I have an open repository on GitHub where you can report issues and submit pull requests: [Pinup Repository on GitHub](https://github.com/cnuebred/pinup)


* * *
