import { z } from "@avuny/zod";

export const AuthorizationHeaderSchema = z.object({
  authorization: z
    .string()
    .regex(/^Bearer\s.+$/, "Authorization header must be Bearer token")
    .openapi({
      example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      description: "JWT access token in Bearer format",
    }),
});
