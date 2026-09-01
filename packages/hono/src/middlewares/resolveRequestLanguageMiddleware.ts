import type { MiddlewareHandler } from "hono";

export const resolveRequestLanguageMiddleware: MiddlewareHandler = async (
  c,
  next,
) => {
  const lang =
    c.req.header("x-lang")?.toLowerCase() ||
    c.req.header("accept-language")?.split(",")[0]?.toLowerCase() ||
    "en";

  c.set("lang", lang);

  await next();
};
