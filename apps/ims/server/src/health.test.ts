import { describe, it, expect } from "vitest"
import { app } from "./routes.js"

describe("Health Route", () => {
  it("GET /health should return 200 with status 'ok' and a valid timestamp", async () => {
    // Act
    const response = await app.request("/api/health")

    // Assert HTTP Status & Headers
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toMatch(/^application\/json/)

    // Parse the JSON body
    const body = await response.json()

    // Assert body structure matches our Zod schema
    expect(body).toEqual(
      expect.objectContaining({
        status: "ok",
        timestamp: expect.any(String),
      })
    )

    // Validate that the returned timestamp is actually a valid ISO 8601 string
    const isValidDate = !isNaN(new Date(body.timestamp).getTime())
    expect(isValidDate).toBe(true)
  })

  it("should return 404 for an unknown route", async () => {
    // Act
    const response = await app.request("/unknown")

    // Assert
    expect(response.status).toBe(404)
  })
})
