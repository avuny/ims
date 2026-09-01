/**
 * Creates an enum-like object from the keys of a given object.
 *
 * Each key is mapped to itself as a string literal, producing
 * a fully type-safe, readonly enum representation.
 *
 * @template T - Source object whose keys will form the enum
 *
 * @example
 * const Errors = getEnum({
 *   NOT_FOUND: "Not found",
 *   UNAUTHORIZED: "Unauthorized",
 * });
 *
 * // Result:
 * // {
 * //   readonly NOT_FOUND: "NOT_FOUND",
 * //   readonly UNAUTHORIZED: "UNAUTHORIZED"
 * // }
 */
export type EnumFromKeys<T extends Record<string, unknown>> = {
  readonly [K in keyof T]: K;
};

/**
 * Utility type that removes `readonly` modifiers from all properties of `T`.
 *
 * Intended for internal, temporary mutation during object construction.
 * Should not be exposed as part of a public API.
 *
 * @template T - Target type to make mutable
 */
export type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

/**
 * Generates a frozen, enum-like object from the keys of the provided object.
 *
 * The returned object:
 * - Preserves literal key types
 * - Is fully readonly
 * - Has values equal to their corresponding keys
 *
 * This is useful for deriving strongly-typed error codes, event names,
 * or action constants from JSON or config objects.
 *
 * @template T - Source object whose keys will be converted into enum values
 * @param obj - An object whose keys define the enum
 * @returns A frozen, readonly enum-like object
 *
 * @example
 * import en from "./locales/en.json" with { type: "json" };
 *
 * const ErrorCodes = getEnum(en.errors);
 *
 * ErrorCodes.MODULE_NAME_CONFLICT;
 * // "MODULE_NAME_CONFLICT"
 */
export const getEnum = <const T extends Record<string, unknown>>(
  obj: T,
): EnumFromKeys<T> => {
  const result = {} as Mutable<EnumFromKeys<T>>;

  for (const key of Object.keys(obj) as Array<keyof T>) {
    result[key] = key;
  }

  return Object.freeze(result) as EnumFromKeys<T>;
};
