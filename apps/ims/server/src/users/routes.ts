import { OpenAPIHono } from "@hono/zod-openapi"

import { signInRoute } from "./sign-in/sign-in.route.js"
import { signUpRoute } from "./sign-up/sign-up.route.js"
export const app = new OpenAPIHono()

app.route("/", signInRoute)
app.route("/", signUpRoute)

export { app as AuthRoutes }
