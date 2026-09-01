import { z } from "@avuny/zod";

export const getResourceByIdParamsSchema = z.object({
  id: z
    .uuid()
    .min(3)
    .openapi({
      param: {
        name: "id",
        in: "path",
      },
      example: "9f3c2e7a-6d4a-4f9e-b1c8-2a9d7e5b4f61",
    }),
});
