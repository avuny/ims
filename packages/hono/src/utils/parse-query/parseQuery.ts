import { isString } from "./typeGuards.js";

export const parseQuery = (query: any): any => {
  return JSON.parse(decodeURIComponent(isString(query) ? query : ""));
};
