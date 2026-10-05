import { describe, it, expect, vi, beforeEach } from "vitest"
import { OpenAPIHono } from "@hono/zod-openapi"
import { signInRoute } from "./sign-in.route.js"
import { signInUseCase } from "./sign-in.usecase.js"

// 1. Mock the Use Case
vi.mock("./sign-in.usecase.js", () => ({
  signInUseCase: vi.fn(),
}))

// 2. Mock Utils for Cookie Options
vi.mock("@avuny/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@avuny/utils")>()
  return {
    ...actual,
    refreshTokenCookieOpts: () => ({
      cookieName: "refresh_token",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    }),
  }
})

describe("Sign In Route (/api/auth/sign-in)", () => {
  let app: OpenAPIHono

  beforeEach(() => {
    vi.clearAllMocks()

    app = new OpenAPIHono()

    app.use("*", async (c, next) => {
      c.set("lang", "en")
      await next()
    })

    // FIX 1: Mount the route at the correct base path
    app.route("/api/auth", signInRoute)
  })

  it("should return 422 if the request body fails Zod validation", async () => {
    const response = await app.request("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "test@example.com" }),
    })

    // FIX 2: Zod OpenAPI returns 422 on validation errors
    expect(response.status).toBe(422)
    expect(signInUseCase).not.toHaveBeenCalled()
  })

  it("should handle domain errors and return correct mapped HTTP status", async () => {
    vi.mocked(signInUseCase).mockResolvedValueOnce({
      success: false,
      error: "AUTH_LOGIN_INCORRECT_CREDENTIALS",
      msg: "Incorrect credentials",
    })

    const response = await app.request("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "test@example.com",
        password: "Password123!",
      }),
    })

    expect(response.status).toBe(401)
    const body = await response.json()

    // FIX 3: Check against body.code instead of body.error
    expect(body.code).toBe("AUTH_LOGIN_INCORRECT_CREDENTIALS")
  })

  it("should return 200, set the refresh token cookie, and return user data on success", async () => {
    const mockUser = {
      id: "123",
      name: "Test User",
      identifier: "test@example.com",
      identifierType: "EMAIL" as const,
      avatarUrl: null,
    }
    const mockTokens = {
      accessToken: "access-123",
      refreshToken: "refresh-123",
    }

    vi.mocked(signInUseCase).mockResolvedValueOnce({
      success: true,
      data: { user: mockUser, tokens: mockTokens },
      msg: "Success",
    })

    const response = await app.request("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "test@example.com",
        password: "Password123!",
      }),
    })

    expect(response.status).toBe(200)

    const setCookieHeader = response.headers.get("set-cookie")
    expect(setCookieHeader).toBeDefined()
    expect(setCookieHeader).toContain("refresh_token=refresh-123")
    expect(setCookieHeader).toContain("HttpOnly")

    const body = await response.json()
    expect(body.data.user).toEqual(mockUser)
    expect(body.data.tokens).toEqual(mockTokens)
  })
})
