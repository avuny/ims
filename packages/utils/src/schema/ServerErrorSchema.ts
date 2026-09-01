import { z } from "@avuny/zod";

export const ServerErrorSchema = z.object({
  success: z.literal(false),
  type: z.literal("server"),
  code: z.literal("SERVER_ERROR"),
  message: z.string(),
});
export const globalErrorResponses = {
  500: {
    description: "Internal server error",
    content: {
      "application/json": {
        schema: ServerErrorSchema,
      },
    },
  },
} as const;
