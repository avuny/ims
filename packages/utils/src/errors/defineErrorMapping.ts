import { ErrorMeta } from "../response.js";

export const defineErrorMapping = <K extends string>(
  mapping: Record<K, ErrorMeta>,
) => {
  return mapping;
};
