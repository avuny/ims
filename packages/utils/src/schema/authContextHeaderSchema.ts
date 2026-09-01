import { z } from "@avuny/zod";

export const authContextHeaderSchema = z.object({
  authorization: z
    .string()
    .regex(/^Bearer\s.+$/, "Authorization header must be Bearer token")
    .openapi({
      example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      description: "JWT access token in Bearer format",
    }),

  "x-organization-id": z
    .string()
    .uuid("X-Organization-Id must be a valid UUID")
    .openapi({
      example: "550e8400-e29b-41d4-a716-446655440000",
      description: "Active organization UUID for the request",
    }),
});
