import { Pinres } from './d'

/**
 * `pinreply` function
 *
 * Creates a flexible response object with customizable properties such as message, status, path, data, etc.
 * Accepts either a string or an object of type `Pinres` as input. If a string is passed, it's used as the default message.
 * If an object is passed, its properties are spread into the returned object, allowing for flexible pre-definition.
 *
 * Useful for building structured API responses. Supports method chaining when extended.
 *
 * @param {string | Pinres} content - Response content, either a message string or a predefined `Pinres` object.
 * @returns {Pinres} A response object with default values that can be overridden by the input.
 */
export const pinreply = (content: string | Pinres): Pinres => {
   return {
      msg: typeof content == 'string' ? content : '',
      error: false,
      path: '/',
      timestamp: Date.now(),
      data: {},
      status: 200,
      type: 'json',
      ...(typeof content == 'object' ? content : {})
   }
}

export type Reply = ReturnType<typeof pinreply>
