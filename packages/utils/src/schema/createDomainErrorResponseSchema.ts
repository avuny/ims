import { z } from "@avuny/zod";

export const createDomainErrorResponseSchema = (errorCodes: string[]) => {
  return z.object({
    type: z.string("domain"),
    success: z.literal(false),
    code: z.enum(errorCodes),
    message: z.string(),
  });
};
