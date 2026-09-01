import { z } from "@avuny/zod";
const jsonParser = z.string().transform((val, ctx) => {
  try {
    return JSON.parse(val);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid JSON",
    });
    return z.NEVER;
  }
});

export const findManyQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).default(10),
  filters: z.object({}).optional().default({}),
  orderBy: z.object({}).optional().default({}),
});

export const createFindManyQuerySchema = <
  F extends z._ZodType,
  O extends z._ZodType,
>({
  filtersSchema,
  orderBySchema,
}: {
  filtersSchema: F;
  orderBySchema?: O;
}) => {
  return z.object({
    page: z.coerce.number().int().min(0).default(0),
    pageSize: z.coerce.number().int().min(1).default(10),
    filters: z.object({}).optional().default({}),
    orderBy: z.object({}).optional().default({}),
  });
};
