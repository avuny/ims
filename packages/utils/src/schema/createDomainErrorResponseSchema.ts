import { z } from "@avuny/zod"

export const createDomainErrorResponseSchema = (ErrorCode: string[]) => {
  return z.object({
    type: z.string("domain"),
    success: z.literal(false),
    code: z.enum(ErrorCode),
    message: z.string(),
  })
}
