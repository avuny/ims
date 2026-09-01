import { requestContextSchema } from "@avuny/utils";
import { Context, Env } from "hono";

export const getContext = (
  c: Context<
    Env,
    "/",
    {
      in: {
        header: {
          authorization: string;
        };
      };
      out: {
        header: {
          authorization: string;
        };
      };
    }
  >,
) => {
  const lang = c.get("lang");

  const userId = c.get("user").id;
  const requestId = c.get("requestId");
  const organizationId = c.get("organizationId");
  const context = requestContextSchema.parse({
    userId,
    requestId,
    organizationId,
    lang,
  });

  return context;
};
