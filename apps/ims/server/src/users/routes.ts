import { OpenAPIHono } from "@hono/zod-openapi"

import { signInRoute } from "./auth/sign-in/sign-in.route.js"
import { signUpRoute } from "./auth/sign-up/sign-up.route.js"
import { refreshTokenRoute } from "./auth/refresh-token/refresh-token.route.js"
import { signOutRoute } from "./auth/sign-out/sign-out.route.js"
import { isAutenticatedRoute } from "./auth/is-authenticated/is-authenticated.route.js"
export const app = new OpenAPIHono()

app.route("/", signInRoute)
app.route("/", signUpRoute)
app.route("/", refreshTokenRoute)
app.route("/", signOutRoute)
app.route("/", isAutenticatedRoute)
export { app as AuthRoutes }
