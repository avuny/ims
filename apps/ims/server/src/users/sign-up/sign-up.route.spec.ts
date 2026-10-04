import { describe, it, expect, vi, beforeEach } from "vitest"
import { OpenAPIHono } from "@hono/zod-openapi"
import { signUpRoute } from "./sign-up.route.js"
import { signUpUseCase } from "./sign-up.usecase.js"

// 1. Mock the Use Case
vi.mock("./sign-up.usecase.js", () => ({
  signUpUseCase: vi.fn(),
}))

// 2. Mock Utils for Cookie Options
vi.mock("@avuny/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@avuny/utils")>()
  return {
    ...actual,
    refreshTokenCookieOpts: () => ({
      cookieName: "refresh_token",
      httpOnly: true,
    }),
  }
})

describe("Sign Up Route (/api/auth/sign-up)", () => {
  let app: OpenAPIHono

  beforeEach(() => {
    vi.clearAllMocks()

    app = new OpenAPIHono()

    app.use("*", async (c, next) => {
      c.set("lang", "en")
      await next()
    })

    // FIX 1: Mount the route at the correct base path
    app.route("/api/auth", signUpRoute)
  })

  it("should return 422 if the request body is missing required fields", async () => {
    const response = await app.request("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "invalid-email" }),
    })

    // FIX 2: Zod OpenAPI returns 422 on validation errors
    expect(response.status).toBe(422)
    expect(signUpUseCase).not.toHaveBeenCalled()
  })

  it("should handle domain errors (e.g. User Exists) and return correct HTTP status", async () => {
    vi.mocked(signUpUseCase).mockResolvedValueOnce({
      success: false,
      error: "AUTH_SIGN_UP_USER_EXIST",
      msg: "User already exists with this identifier",
    })

    const response = await app.request("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "John",
        identifier: "test@example.com",
        password: "Password123!",
      }),
    })

    expect(response.status).toBe(409)
    const body = await response.json()

    // FIX 3: Check against body.code instead of body.error
    expect(body.code).toBe("AUTH_SIGN_UP_USER_EXIST")
  })

  it("should return 201 Created, set the refresh token cookie, and return user data on success", async () => {
    const mockUser = {
      id: "123",
      name: "John",
      identifier: "test@example.com",
      identifierType: "EMAIL" as const,
    }
    const mockTokens = {
      accessToken: "access-456",
      refreshToken: "refresh-456",
    }

    vi.mocked(signUpUseCase).mockResolvedValueOnce({
      success: true,
      data: { user: mockUser, tokens: mockTokens },
      msg: "User signed up successfully",
    })

    const response = await app.request("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "John",
        identifier: "test@example.com",
        password: "Password123!",
      }),
    })

    expect(response.status).toBe(201)

    const setCookieHeader = response.headers.get("set-cookie")
    expect(setCookieHeader).toBeDefined()
    expect(setCookieHeader).toContain("refresh_token=refresh-456")

    const body = await response.json()
    expect(body.data.user).toEqual(mockUser)
    expect(body.data.tokens).toEqual(mockTokens)
  })
})
