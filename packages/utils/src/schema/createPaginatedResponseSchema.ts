import { z } from "@avuny/zod";
import { createResponseSchema } from "./createResponseSchema.js";

export const createPaginatedResponseSchema = <T extends z._ZodType>(
  listSchema: T,
) =>
  createResponseSchema(
    z.object({
      list: listSchema,
      totalCount: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
    }),
  );
