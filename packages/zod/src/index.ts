import { z } from "@hono/zod-openapi";

export type ZodLocale = "en" | "ar";

export const setZodLocale = (locale: ZodLocale) => {
  z.config(z.locales[locale]());
};

export { z };
