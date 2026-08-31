import { swaggerUI } from "@hono/swagger-ui"
import { OpenAPIHono } from "@hono/zod-openapi"
import { onError } from "./onError.js"

import { requestId } from "hono/request-id"
import healthRoute from "./health.route.js"

export const app = new OpenAPIHono().basePath("/api")

// routes here
app.use(requestId())

app.route("/", healthRoute)
app.onError(onError)

app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: { title: "IMS API", version: "1.0.0" },
})

app.get("/docs", swaggerUI({ url: "/api/openapi.json" }))
