import { describe, expect, it } from "vitest"
import {
  IdentifierWithTransformSchema,
  parseIdentifier,
} from "./parse-identifier.js" // Adjust path as needed

describe("parseIdentifier", () => {
  describe("Phone numbers (E.164)", () => {
    it("parses and transforms a valid E.164 phone number", () => {
      const input = "+14155552671"
      const result = parseIdentifier(input)

      expect(result).toEqual({
        identifierType: "PHONE",
        identifier: "+14155552671",
      })
    })

    it("parses valid international phone numbers", () => {
      const input = "+201000000000"
      const result = parseIdentifier(input)

      expect(result).toEqual({
        identifierType: "PHONE",
        identifier: "+201000000000",
      })
    })
  })

  describe("Email addresses", () => {
    it("parses and transforms a valid email", () => {
      const input = "user@example.com"
      const result = parseIdentifier(input)

      expect(result).toEqual({
        identifierType: "EMAIL",
        identifier: "user@example.com",
      })
    })

    it("lowercases email addresses", () => {
      const input = "USER.NAME@EXAMPLE.COM"
      const result = parseIdentifier(input)

      expect(result).toEqual({
        identifierType: "EMAIL",
        identifier: "user.name@example.com",
      })
    })
  })

  describe("Usernames", () => {
    it("parses and transforms a valid username", () => {
      const input = "john_doe"
      const result = parseIdentifier(input)

      expect(result).toEqual({
        identifierType: "USERNAME",
        identifier: "john_doe",
      })
    })

    it("allows usernames with dots, hyphens, and numbers", () => {
      const input = "user.name-123"
      const result = parseIdentifier(input)

      expect(result).toEqual({
        identifierType: "USERNAME",
        identifier: "user.name-123",
      })
    })

    it("accepts minimum allowed username length (3 characters)", () => {
      const input = "abc"
      const result = parseIdentifier(input)

      expect(result).toEqual({
        identifierType: "USERNAME",
        identifier: "abc",
      })
    })

    it("accepts maximum allowed username length (30 characters)", () => {
      const input = "a".repeat(30)
      const result = parseIdentifier(input)

      expect(result).toEqual({
        identifierType: "USERNAME",
        identifier: input,
      })
    })
  })

  describe("Trimming behavior", () => {
    it("trims surrounding whitespace before parsing", () => {
      const phoneResult = parseIdentifier("   +14155552671   ")
      expect(phoneResult).toEqual({
        identifierType: "PHONE",
        identifier: "+14155552671",
      })

      const emailResult = parseIdentifier("  USER@EXAMPLE.COM  ")
      expect(emailResult).toEqual({
        identifierType: "EMAIL",
        identifier: "user@example.com",
      })

      const usernameResult = parseIdentifier("   john_doe   ")
      expect(usernameResult).toEqual({
        identifierType: "USERNAME",
        identifier: "john_doe",
      })
    })
  })

  describe("Invalid inputs and error handling", () => {
    it("throws an error for usernames shorter than 3 characters", () => {
      expect(() => parseIdentifier("ab")).toThrow("Invalid identifier")
    })

    it("throws an error for usernames longer than 30 characters", () => {
      expect(() => parseIdentifier("a".repeat(31))).toThrow(
        "Invalid identifier"
      )
    })

    it("throws an error for invalid characters in username", () => {
      expect(() => parseIdentifier("user#123")).toThrow("Invalid identifier")
      expect(() => parseIdentifier("user 123")).toThrow("Invalid identifier")
    })

    it("throws an error for malformed emails", () => {
      expect(() => parseIdentifier("invalid-email@")).toThrow(
        "Invalid identifier"
      )
    })

    it("throws an error for malformed phone numbers", () => {
      // Fails E.164 (contains spaces) AND fails Username (contains + and spaces)
      expect(() => parseIdentifier("+1 555 555 5555")).toThrow(
        "Invalid identifier"
      )

      // Fails E.164 (contains letters) AND fails Username (contains +)
      expect(() => parseIdentifier("+1234abcd")).toThrow("Invalid identifier")
    })

    it("throws an error for empty or whitespace-only strings", () => {
      expect(() => parseIdentifier("")).toThrow("Invalid identifier")
      expect(() => parseIdentifier("   ")).toThrow("Invalid identifier")
    })

    it("attaches the Zod Error as the cause when throwing", () => {
      try {
        parseIdentifier("!!invalid!!")
        expect.fail("Should have thrown an error")
      } catch (err: any) {
        expect(err.message).toBe("Invalid identifier")
        expect(err.cause).toBeDefined()
        expect(err.cause.name).toBe("ZodError")
      }
    })
  })
})

describe("IdentifierWithTransformSchema", () => {
  it("can be parsed directly using safeParse", () => {
    const result = IdentifierWithTransformSchema.safeParse("+14155552671")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        identifierType: "PHONE",
        identifier: "+14155552671",
      })
    }
  })
})
