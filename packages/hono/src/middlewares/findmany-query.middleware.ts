import { Context, Next } from "hono"
import { parseQuery } from "../utils/parse-query/parseQuery.js"
import qs from "qs"

export const parseFindManyQuery = async (c: Context, next: Next) => {
  try {
    const _query = c.req.query()
    const query = qs.parse(_query) as Record<string, string>

    // Parse page and pageSize
    const page = parseInt(query.page ?? "", 10)
    const pageSize = parseInt(query.pageSize ?? "", 10)

    // Parse filters and orderBy
    const filters = query.filters ?? {}
    const orderBy = query.orderBy ?? {}

    // Validate page and pageSize
    if (isNaN(page) || page < 0) {
      return c.json(
        { error: "Invalid 'page'. Must be a positive integer." },
        400
      )
    }

    if (isNaN(pageSize) || pageSize < 1) {
      return c.json(
        { error: "Invalid 'pageSize'. Must be a positive integer." },
        400
      )
    }

    // Store in context
    c.set("findManyQuery", {
      page,
      pageSize,
      filters,
      orderBy,
    })

    await next()
  } catch (error) {
    console.error("Error in parseFindManyQuery middleware:", error)
    return c.json(
      { error: "An error occurred while parsing query parameters." },
      500
    )
  }
}
