import { describe, it, expect, vi, beforeEach } from "vitest"
import { ok, fail } from "@avuny/utils"
import {
  AccessTokenService,
  AccessTokenPayload,
} from "./access-token.service.js"
import { JwtService } from "./jwt.service.js"
import { AuthenticatedErrorCode } from "../errors/errors.js"

// ---------------------------------------------------------------------------
// 1. Mock External Modules
// ---------------------------------------------------------------------------
vi.mock("@avuny/utils", () => ({
  ok: vi.fn((payload) => ({ ok: true, ...payload })),
  fail: vi.fn((payload) => ({ ok: false, ...payload })),
}))

// ---------------------------------------------------------------------------
// 2. Setup Type-Strict Mocks for Dependencies
// ---------------------------------------------------------------------------
type MockJwtService = {
  [K in keyof JwtService]: ReturnType<typeof vi.fn>
}

describe("AccessTokenService", () => {
  let accessTokenService: AccessTokenService
  let jwtService: MockJwtService

  const mockConfig = {
    accessTokenSecret: "super-secret-key",
    accessTokenExpiresIn: 900, // 15 minutes
  }

  beforeEach(() => {
    vi.clearAllMocks()

    jwtService = {
      createToken: vi.fn(),
      verifyToken: vi.fn(),
    } as unknown as MockJwtService

    accessTokenService = new AccessTokenService(
      jwtService as unknown as JwtService,
      mockConfig
    )
  })

  // ---------------------------------------------------------------------------
  // Create Access Token
  // ---------------------------------------------------------------------------
  describe("create", () => {
    it("should call jwtService.createToken with mapped config (Happy Path)", async () => {
      // Arrange
      const mockUserId = "user-123"
      const expectedToken = "signed.jwt.token"
      jwtService.createToken.mockResolvedValueOnce(expectedToken)

      // Act
      const result = await accessTokenService.create({ userId: mockUserId })

      // Assert
      expect(jwtService.createToken).toHaveBeenCalledWith({
        secret: mockConfig.accessTokenSecret,
        subject: mockUserId,
        expiresIn: `${mockConfig.accessTokenExpiresIn}s`,
      })
      expect(result).toBe(expectedToken)
    })
  })

  // ---------------------------------------------------------------------------
  // Verify Access Token
  // ---------------------------------------------------------------------------
  describe("verify", () => {
    const mockToken = "some.jwt.token"

    it("should fail if verifyToken throws an error - token is invalid/expired (Sad Path)", async () => {
      // Arrange
      const mockError = new Error("TokenExpiredError")
      jwtService.verifyToken.mockRejectedValueOnce(mockError)

      // Act
      await accessTokenService.verify(mockToken)

      // Assert
      expect(jwtService.verifyToken).toHaveBeenCalledWith(mockToken, {
        secret: mockConfig.accessTokenSecret,
      })
      expect(fail).toHaveBeenCalledWith({
        error: AuthenticatedErrorCode.UNAUTHENTICATED,
        msg: "Access token is invalid or expired",
      })
    })

    it("should fail if verifyToken succeeds but payload has no 'sub' property (Sad Path)", async () => {
      // Arrange
      const invalidPayload = { other: "data" } // Missing 'sub'
      jwtService.verifyToken.mockResolvedValueOnce(invalidPayload)

      // Act
      await accessTokenService.verify(mockToken)

      // Assert
      expect(fail).toHaveBeenCalledWith({
        error: AuthenticatedErrorCode.UNAUTHENTICATED,
        msg: "Access token is invalid",
      })
    })

    it("should return ok with mapped userId if token is valid and has 'sub' (Happy Path)", async () => {
      // Arrange
      const validPayload: AccessTokenPayload = { sub: "user-123" }
      jwtService.verifyToken.mockResolvedValueOnce(validPayload)

      // Act
      await accessTokenService.verify(mockToken)

      // Assert
      expect(ok).toHaveBeenCalledWith({
        data: { userId: "user-123" },
        msg: "Access token is valid",
      })
    })
  })
})
