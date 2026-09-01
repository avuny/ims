import { z } from "@avuny/zod";

export const requestContextSchema = z.object({
  userId: z.string(),
  requestId: z.string(),
  lang: z.string(),
  organizationId: z.string(),
});
