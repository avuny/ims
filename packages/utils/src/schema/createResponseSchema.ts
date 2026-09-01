import { z } from "@avuny/zod";

/**
 * Wraps a given Zod schema into a response object format.
 * @param schema - The Zod schema to wrap in the 'data' field
 */
export const createResponseSchema = <T extends z._ZodType>(schema: T) => {
  return z.object({
    data: schema,
    success: z.literal(true),
  });
};
