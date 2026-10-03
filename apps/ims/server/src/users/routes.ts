import { OpenAPIHono } from "@hono/zod-openapi"

import { signInRoute } from "./sign-in/sign-in.route.js"
export const app = new OpenAPIHono()

app.route("/", signInRoute)

export { app as AuthRoutes }
