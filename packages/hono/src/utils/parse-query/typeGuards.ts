export const isString = (value: any): value is string =>
  typeof value === "string";

export const isNumber = (value: any): value is number =>
  typeof value === "number";

export const isBoolean = (value: any): value is boolean =>
  typeof value === "boolean";

export const isUndefined = (value: any): value is undefined =>
  typeof value === "undefined";

export const isNull = (value: any): value is null => value === null;

export const isSymbol = (value: any): value is symbol =>
  typeof value === "symbol";

export const isObject = (value: any): value is object =>
  value !== null && typeof value === "object";

export const isFunction = (value: any): value is Function =>
  typeof value === "function";

export const isArray = <T = any>(value: any): value is T[] =>
  Array.isArray(value);

export const isDate = (value: any): value is Date => value instanceof Date;

export const isPromise = <T = any>(value: any): value is Promise<T> =>
  value instanceof Promise;

export const isBigInt = (value: any): value is bigint =>
  typeof value === "bigint";

export const isRegExp = (value: any): value is RegExp =>
  value instanceof RegExp;

export const isMap = <K = any, V = any>(value: any): value is Map<K, V> =>
  value instanceof Map;

export const isSet = <T = any>(value: any): value is Set<T> =>
  value instanceof Set;

export const isIterable = <T = any>(value: any): value is Iterable<T> =>
  Symbol.iterator in Object(value);
