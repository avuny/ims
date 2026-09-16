import { describe, expect, it } from "vitest"
import app from "./health.route.js"

describe("Health API", () => {
  describe("GET /health", () => {
    it("returns a healthy response", async () => {
      const response = await app.request("/health")

      expect(response.status).toBe(200)

      await expect(response.json()).resolves.toMatchObject({
        status: "ok",
        timestamp: expect.any(String),
      })
    })

    it("returns a valid ISO timestamp", async () => {
      const response = await app.request("/health")

      const body = await response.json()

      expect(body.timestamp).toBeDefined()
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
    })

    it("returns the expected content type", async () => {
      const response = await app.request("/health")

      expect(response.headers.get("content-type")).toMatch(/application\/json/)
    })
  })

  describe("GET /openapi.json", () => {
    it("returns the OpenAPI document", async () => {
      const response = await app.request("/openapi.json")

      expect(response.status).toBe(200)

      const document = await response.json()

      expect(document).toMatchObject({
        openapi: "3.0.0",
        info: {
          version: "1.0.0",
          title: "Health Check API",
        },
      })
    })

    it("documents the health endpoint", async () => {
      const response = await app.request("/openapi.json")

      const document = await response.json()

      expect(document.paths["/health"]).toBeDefined()
      expect(document.paths["/health"].get).toBeDefined()
    })

    it("documents the 200 response", async () => {
      const response = await app.request("/openapi.json")

      const document = await response.json()

      expect(document.paths["/health"].get.responses["200"]).toMatchObject({
        description: "Service is healthy",
      })
    })

    it("documents the health response schema", async () => {
      const response = await app.request("/openapi.json")

      const document = await response.json()

      const schema =
        document.paths["/health"].get.responses["200"].content[
          "application/json"
        ].schema

      expect(schema).toMatchObject({
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["ok"],
          },
          timestamp: {
            type: "string",
            format: "date-time",
          },
        },
        required: ["status", "timestamp"],
      })
    })
  })
})
