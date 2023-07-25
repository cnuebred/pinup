import { Pinres, PinresOptions } from './d'

export const _pinres = (msg, error, obj?: PinresOptions): Pinres => {
  return {
    error,
    msg,
    path: obj?.path || '/',
    timestamp: obj?.timestamp || Date.now(),
    data: obj?.data || {},
    status: obj?.status || 200
  }
}
