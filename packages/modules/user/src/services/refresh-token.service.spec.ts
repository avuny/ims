import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { ok, fail } from "@avuny/utils"
import { RefreshTokenService } from "./refresh-token.service.js"
import { RefreshTokenRepositoy } from "../repositories/refresh-token.repository.js"
import { AuthenticatedErrorCode } from "../errors/errors.js"

// ---------------------------------------------------------------------------
// 1. Mock External Modules
// ---------------------------------------------------------------------------
vi.mock("@avuny/utils", () => ({
  ok: vi.fn((payload) => ({ ok: true, ...payload })),
  fail: vi.fn((payload) => ({ ok: false, ...payload })),
}))

vi.mock("crypto", () => ({
  randomBytes: vi.fn(() => ({
    toString: vi.fn(() => "mock-random-token"),
  })),
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => "mock-hashed-token"),
  })),
}))

// ---------------------------------------------------------------------------
// 2. Setup Type-Strict Mocks for Dependencies
// ---------------------------------------------------------------------------
type MockRefreshTokenRepository = {
  [K in keyof RefreshTokenRepositoy]: ReturnType<typeof vi.fn>
}

describe("RefreshTokenService", () => {
  let refreshTokenService: RefreshTokenService
  let refreshTokenRepository: MockRefreshTokenRepository

  const mockConfig = {
    refreshTokenExpiresIn: 3600, // 1 hour in seconds
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers() // Freeze time for accurate Date assertions

    refreshTokenRepository = {
      createTransaction: vi.fn(),
      create: vi.fn(),
      getByTokenHash: vi.fn(),
      revoke: vi.fn(),
      delete: vi.fn(),
    } as unknown as MockRefreshTokenRepository

    refreshTokenService = new RefreshTokenService(
      refreshTokenRepository as unknown as RefreshTokenRepositoy,
      mockConfig
    )
  })

  afterEach(() => {
    vi.useRealTimers() // Restore time after each test
  })

  // ---------------------------------------------------------------------------
  // withTransaction Tests
  // ---------------------------------------------------------------------------
  describe("withTransaction", () => {
    it("should execute callback successfully (Happy Path)", async () => {
      // Arrange
      const mockResult = { success: true }
      refreshTokenRepository.createTransaction.mockResolvedValueOnce(mockResult)
      const callback = vi.fn()

      // Act
      const result = await refreshTokenService.withTransaction(callback)

      // Assert
      expect(refreshTokenRepository.createTransaction).toHaveBeenCalledWith(
        callback
      )
      expect(result).toEqual(mockResult)
    })

    it("should throw an error with cause if transaction fails (Sad Path)", async () => {
      // Arrange
      const mockError = new Error("DB Error")
      refreshTokenRepository.createTransaction.mockRejectedValueOnce(mockError)
      const callback = vi.fn()

      // Act & Assert
      await expect(
        refreshTokenService.withTransaction(callback)
      ).rejects.toThrowError("Transaction failed")
    })
  })

  // ---------------------------------------------------------------------------
  // Create Refresh Token
  // ---------------------------------------------------------------------------
  describe("create", () => {
    it("should generate, hash, set expiry, and store the token (Happy Path)", async () => {
      // Arrange
      const now = new Date("2024-01-01T00:00:00Z")
      vi.setSystemTime(now)

      const expectedExpiresAt = new Date(
        now.getTime() + mockConfig.refreshTokenExpiresIn * 1000
      )

      const params = {
        userId: "user-123",
        userAgent: "Mozilla/5.0",
        ipAddress: "127.0.0.1",
        familyId: "family-456",
        db: {} as any, // Mock DB context
      }

      // Act
      const result = await refreshTokenService.create(params)

      // Assert
      expect(result).toBe("mock-random-token")
      expect(refreshTokenRepository.create).toHaveBeenCalledWith({
        data: {
          userId: params.userId,
          tokenHash: "mock-hashed-token", // From mocked crypto
          familyId: params.familyId,
          userAgent: params.userAgent,
          ipAddress: params.ipAddress,
          expiresAt: expectedExpiresAt,
        },
        db: params.db,
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Verify Refresh Token State
  // ---------------------------------------------------------------------------
  describe("verify", () => {
    const mockToken = "some-raw-token"

    it("should fail if the token does not exist in the database (Sad Path)", async () => {
      // Arrange
      refreshTokenRepository.getByTokenHash.mockResolvedValueOnce(null)

      // Act
      await refreshTokenService.verify(mockToken)

      // Assert
      expect(refreshTokenRepository.getByTokenHash).toHaveBeenCalledWith({
        where: { tokenHash: "mock-hashed-token" }, // From mocked crypto
        db: undefined,
      })
      expect(fail).toHaveBeenCalledWith({
        error: AuthenticatedErrorCode.AUTH_REFRESH_TOKEN_INVALID,
        msg: "Refresh token is invalid",
      })
    })

    it("should fail if the token has been revoked (Sad Path)", async () => {
      // Arrange
      refreshTokenRepository.getByTokenHash.mockResolvedValueOnce({
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 10000), // Not expired
      })

      // Act
      await refreshTokenService.verify(mockToken)

      // Assert
      expect(fail).toHaveBeenCalledWith({
        error: AuthenticatedErrorCode.AUTH_REFRESH_TOKEN_INVALID,
        msg: "Refresh token has been revoked",
      })
    })

    it("should fail if the token is expired (Sad Path)", async () => {
      // Arrange
      const now = new Date("2024-01-01T12:00:00Z")
      vi.setSystemTime(now)

      refreshTokenRepository.getByTokenHash.mockResolvedValueOnce({
        revokedAt: null,
        expiresAt: new Date(now.getTime() - 1000), // Expired 1 second ago
      })

      // Act
      await refreshTokenService.verify(mockToken)

      // Assert
      expect(fail).toHaveBeenCalledWith({
        error: AuthenticatedErrorCode.AUTH_REFRESH_TOKEN_INVALID,
        msg: "Refresh token has expired",
      })
    })

    it("should return ok with stored token data if token is valid (Happy Path)", async () => {
      // Arrange
      const now = new Date("2024-01-01T12:00:00Z")
      vi.setSystemTime(now)

      const validStoredToken = {
        id: "token-id",
        revokedAt: null,
        expiresAt: new Date(now.getTime() + 10000), // Expires in the future
      }

      refreshTokenRepository.getByTokenHash.mockResolvedValueOnce(
        validStoredToken
      )

      // Act
      await refreshTokenService.verify(mockToken)

      // Assert
      expect(ok).toHaveBeenCalledWith({
        data: validStoredToken,
        msg: "Refresh token is valid",
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Revoke & Delete
  // ---------------------------------------------------------------------------
  describe("revoke", () => {
    it("should call revoke on the repository (Happy Path)", async () => {
      // Arrange
      refreshTokenRepository.revoke.mockResolvedValueOnce(undefined)
      const mockDb = {} as any

      // Act
      await refreshTokenService.revoke("token-id", mockDb)

      // Assert
      expect(refreshTokenRepository.revoke).toHaveBeenCalledWith({
        where: { id: "token-id" },
        db: mockDb,
      })
    })
  })

  describe("delete", () => {
    it("should hash the token and call delete on the repository (Happy Path)", async () => {
      // Arrange
      refreshTokenRepository.delete.mockResolvedValueOnce(undefined)

      // Act
      await refreshTokenService.delete("raw-token")

      // Assert
      expect(refreshTokenRepository.delete).toHaveBeenCalledWith({
        where: { tokenHash: "mock-hashed-token" },
      })
    })
  })
})
