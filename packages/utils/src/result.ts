export type Ok<T> = {
  success: true
  data: T
  msg: string
  meta?: {}
}

export type Fail<E = string> = {
  success: false
  error: E
  msg: string
  meta?: {}
}

export type Result<T, E = string> = Ok<T> | Fail<E>

/**
 * Result constructors
 * Prevents boolean widening and enforces correctness
 */
export const ok = <T>({
  data,
  msg,
  meta,
  context,
  caller,
}: {
  data: T
  msg: string
  meta?: {}
  context?: any
  caller?: string
}): Ok<T> => {
  return {
    success: true,
    data,
    msg,
    meta,
  }
}

export const fail = <E>({
  error,
  msg,
  meta,
  context,
  caller,
}: {
  error: E
  msg: string
  meta?: {}
  context?: any
  caller?: string
}): Fail<E> => {
  return {
    success: false,
    error,
    msg,
    meta,
  }
}
