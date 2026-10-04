import { describe, it, expect, vi, beforeEach } from "vitest"
import { ok, fail } from "@avuny/utils"
import { AuthService } from "./auth.service.js"
import { JwtService } from "./jwt.service.js"
import { AccessTokenService } from "./access-token.service.js"
import { RefreshTokenService } from "./refresh-token.service.js"
import { UserRepository } from "../repositories/user.repository.js"
import { hashPassword, verifyPassword } from "../utils/password.util.js"
import { verifyIdentifierOtpToken } from "../utils/otp-token-verification.util.js"
import { parseIdentifier } from "../utils/parse-identifier.js"
import {
  AuthLoginErrorCode,
  AuthSignUpErrorCode,
  AuthenticatedErrorCode,
} from "../errors/errors.js"
import type { SignUpInput, SignInInput } from "@avuny/contracts"

// ---------------------------------------------------------------------------
// 1. Mock External Modules
// ---------------------------------------------------------------------------
vi.mock("@avuny/utils", () => ({
  // Mocks strictly aligned with Ok<T> and Fail<E> interfaces
  ok: vi.fn((payload) => ({ success: true, ...payload })),
  fail: vi.fn((payload) => ({ success: false, ...payload })),
}))

vi.mock("../utils/password.util.js", () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}))

vi.mock("../utils/otp-token-verification.util.js", () => ({
  verifyIdentifierOtpToken: vi.fn(),
}))

vi.mock("../utils/parse-identifier.js", () => ({
  parseIdentifier: vi.fn(),
}))

// ---------------------------------------------------------------------------
// 2. Setup Type-Strict Mocks
// ---------------------------------------------------------------------------
type MockUserRepository = {
  [K in keyof UserRepository]: ReturnType<typeof vi.fn>
}
type MockAccessTokenService = {
  [K in keyof AccessTokenService]: ReturnType<typeof vi.fn>
}
type MockRefreshTokenService = {
  [K in keyof RefreshTokenService]: ReturnType<typeof vi.fn>
}
type MockJwtService = { [K in keyof JwtService]: ReturnType<typeof vi.fn> }

describe("AuthService", () => {
  let authService: AuthService
  let userRepository: MockUserRepository
  let accessTokenService: MockAccessTokenService
  let refreshTokenService: MockRefreshTokenService
  let jwtService: MockJwtService

  const defaultConfig = { otpTokenSecret: "test-secret" }

  beforeEach(() => {
    vi.clearAllMocks()

    userRepository = {
      createTransaction: vi.fn(),
      findByIdentifier: vi.fn(),
      insert: vi.fn(),
      findById: vi.fn(),
    } as unknown as MockUserRepository

    accessTokenService = {
      create: vi.fn(),
      verify: vi.fn(),
    } as unknown as MockAccessTokenService

    refreshTokenService = {
      create: vi.fn(),
      verify: vi.fn(),
      revoke: vi.fn(),
      delete: vi.fn(),
      withTransaction: vi.fn(),
    } as unknown as MockRefreshTokenService

    jwtService = {} as unknown as MockJwtService

    authService = new AuthService(
      userRepository as unknown as UserRepository,
      accessTokenService as unknown as AccessTokenService,
      refreshTokenService as unknown as RefreshTokenService,
      jwtService as unknown as JwtService,
      defaultConfig
    )
  })

  // ---------------------------------------------------------------------------
  // withTransaction Tests
  // ---------------------------------------------------------------------------
  describe("withTransaction", () => {
    it("should execute callback successfully (Happy Path)", async () => {
      const mockResult = { custom: "data" }
      userRepository.createTransaction.mockResolvedValueOnce(mockResult)
      const callback = vi.fn()

      const result = await authService.withTransaction(callback)

      expect(userRepository.createTransaction).toHaveBeenCalledWith(callback)
      expect(result).toEqual(mockResult)
    })

    it("should throw an error with cause if transaction fails (Sad Path)", async () => {
      const mockError = new Error("DB Error")
      userRepository.createTransaction.mockRejectedValueOnce(mockError)
      const callback = vi.fn()

      await expect(authService.withTransaction(callback)).rejects.toThrowError(
        "Transaction failed"
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Sign Up Tests
  // ---------------------------------------------------------------------------
  describe("signUp", () => {
    const mockInput: SignUpInput = {
      name: "John Doe",
      identifier: "test@example.com",
      password: "Password123!",
    }
    const mockParsedIdentifier = {
      identifier: "test@example.com",
      identifierType: "EMAIL" as const,
    }

    beforeEach(() => {
      vi.mocked(parseIdentifier).mockReturnValue(mockParsedIdentifier)
    })

    it("should fail if user already exists (Sad Path)", async () => {
      userRepository.findByIdentifier.mockResolvedValueOnce({
        id: "existing-id",
      })

      await authService.signUp({ data: mockInput })

      expect(fail).toHaveBeenCalledWith(
        expect.objectContaining({
          error: AuthSignUpErrorCode.AUTH_SIGN_UP_USER_EXIST,
        })
      )
    })

    it("should fail if OTP verification is required but missing (Sad Path)", async () => {
      userRepository.findByIdentifier.mockResolvedValueOnce(null)

      await authService.signUp({ data: mockInput }) // Missing otpToken

      expect(fail).toHaveBeenCalledWith(
        expect.objectContaining({
          error:
            AuthSignUpErrorCode.AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_REQUIRED,
        })
      )
    })

    it("should fail if OTP verification result is unsuccessful (Sad Path)", async () => {
      userRepository.findByIdentifier.mockResolvedValueOnce(null)
      vi.mocked(verifyIdentifierOtpToken).mockResolvedValueOnce({
        success: false,
        message: "Verification token does not match the identifier type",
        code: AuthSignUpErrorCode.AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_MISMATCH,
      })

      await authService.signUp({ data: mockInput, otpToken: "123456" })

      expect(fail).toHaveBeenCalledWith(
        expect.objectContaining({
          error:
            AuthSignUpErrorCode.AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_MISMATCH,
          msg: "Verification token does not match the identifier type",
          meta: { identifier: mockInput.identifier },
        })
      )
    })

    it("should hash password, create user and return ok on success (Happy Path)", async () => {
      userRepository.findByIdentifier.mockResolvedValueOnce(null)
      vi.mocked(verifyIdentifierOtpToken).mockResolvedValueOnce({
        success: true,
      })
      vi.mocked(hashPassword).mockResolvedValueOnce("hashed-password-string")

      const mockCreatedUser = {
        id: "new-user-id",
        name: mockInput.name,
        identifier: mockParsedIdentifier.identifier,
        identifierType: mockParsedIdentifier.identifierType,
      }
      userRepository.insert.mockResolvedValueOnce(mockCreatedUser)

      const result = await authService.signUp({
        data: mockInput,
        otpToken: "123456",
      })

      expect(ok).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: "User registered successfully",
          data: { user: mockCreatedUser },
        })
      )
      // Result object is dynamically assembled from mock
      expect(result).toEqual(expect.objectContaining({ success: true }))
    })
  })

  // ---------------------------------------------------------------------------
  // Sign In Tests
  // ---------------------------------------------------------------------------
  describe("signIn", () => {
    const mockInput: SignInInput = {
      identifier: "test@example.com",
      password: "Password123!",
    }
    const mockParsedIdentifier = {
      identifier: "test@example.com",
      identifierType: "EMAIL" as const,
    }

    beforeEach(() => {
      vi.mocked(parseIdentifier).mockReturnValue(mockParsedIdentifier)
    })

    it("should fail if user is not found (Sad Path)", async () => {
      userRepository.findByIdentifier.mockResolvedValueOnce(null)

      await authService.signIn({ data: mockInput })

      expect(fail).toHaveBeenCalledWith(
        expect.objectContaining({
          error: AuthLoginErrorCode.AUTH_LOGIN_INCORRECT_CREDENTIALS,
        })
      )
    })

    it("should fail if user does not have a password configured (Sad Path)", async () => {
      userRepository.findByIdentifier.mockResolvedValueOnce({
        passwordHash: null,
      })

      await authService.signIn({ data: mockInput })

      expect(fail).toHaveBeenCalledWith(
        expect.objectContaining({
          error: AuthLoginErrorCode.AUTH_LOGIN_USER_PASSWORD_NOT_SET,
        })
      )
    })

    it("should return ok with user data on successful sign in (Happy Path)", async () => {
      const mockUser = {
        id: "user-id",
        name: "John Doe",
        passwordHash: "stored-hash",
        avatarUrl: "http://avatar.com/me.png",
      }
      userRepository.findByIdentifier.mockResolvedValueOnce(mockUser)
      vi.mocked(verifyPassword).mockResolvedValueOnce(true)

      const result = await authService.signIn({ data: mockInput })

      expect(ok).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: "User logged in successfully",
          data: {
            user: {
              id: mockUser.id,
              name: mockUser.name,
              identifier: mockParsedIdentifier.identifier,
              identifierType: mockParsedIdentifier.identifierType,
              avatarUrl: mockUser.avatarUrl,
            },
          },
        })
      )
      expect(result).toEqual(expect.objectContaining({ success: true }))
    })
  })

  // ---------------------------------------------------------------------------
  // generateTokens Tests
  // ---------------------------------------------------------------------------
  describe("generateTokens", () => {
    it("should issue both access and refresh tokens (Happy Path)", async () => {
      const mockParams = {
        userId: "user-123",
        context: { userAgent: "Chrome", ipAddress: "127.0.0.1" },
        familyId: "family-uuid",
      }
      accessTokenService.create.mockResolvedValueOnce("mock-access-token")
      refreshTokenService.create.mockResolvedValueOnce("mock-refresh-token")

      const result = await authService.generateTokens(mockParams)

      expect(accessTokenService.create).toHaveBeenCalledWith({
        userId: "user-123",
      })
      expect(refreshTokenService.create).toHaveBeenCalledWith({
        userId: "user-123",
        userAgent: "Chrome",
        ipAddress: "127.0.0.1",
        familyId: "family-uuid",
      })
      expect(ok).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: "Tokens generated successfully",
          data: {
            accessToken: "mock-access-token",
            refreshToken: "mock-refresh-token",
          },
        })
      )

      // Checking for the new 'success: true' shape
      expect(result).toEqual({
        success: true,
        msg: "Tokens generated successfully",
        data: {
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
        },
      })
    })
  })

  // ---------------------------------------------------------------------------
  // refreshToken Tests
  // ---------------------------------------------------------------------------
  describe("refreshToken", () => {
    const mockContext = { userAgent: "Firefox", ipAddress: "192.168.1.1" }

    it("should fail if token is missing (Sad Path)", async () => {
      await authService.refreshToken({ token: "", context: mockContext })

      expect(fail).toHaveBeenCalledWith(
        expect.objectContaining({
          error: AuthenticatedErrorCode.AUTH_REFRESH_TOKEN_INVALID,
        })
      )
    })

    it("should bubble up failure if refresh token verification fails (Sad Path)", async () => {
      // Adjusted mock shape to match your updated Fail<E> type
      const mockFailResult = {
        success: false,
        error: AuthenticatedErrorCode.AUTH_REFRESH_TOKEN_INVALID,
        msg: "Invalid token",
      }
      refreshTokenService.verify.mockResolvedValueOnce(mockFailResult)

      const result = await authService.refreshToken({
        token: "invalid-token",
        context: mockContext,
      })

      expect(refreshTokenService.verify).toHaveBeenCalledWith("invalid-token")
      expect(refreshTokenService.delete).not.toHaveBeenCalled()
      expect(result).toEqual(mockFailResult)
    })

    it("should delete old token and generate new ones if valid (Happy Path)", async () => {
      // Adjusted mock shape to match your updated Ok<T> type
      const storedToken = { userId: "user-123", familyId: "family-uuid" }
      refreshTokenService.verify.mockResolvedValueOnce({
        success: true,
        data: storedToken,
        msg: "Token valid",
      })
      refreshTokenService.delete.mockResolvedValueOnce(undefined)

      accessTokenService.create.mockResolvedValueOnce("new-access-token")
      refreshTokenService.create.mockResolvedValueOnce("new-refresh-token")

      const result = await authService.refreshToken({
        token: "valid-old-token",
        context: mockContext,
      })

      expect(refreshTokenService.verify).toHaveBeenCalledWith("valid-old-token")
      expect(refreshTokenService.delete).toHaveBeenCalledWith("valid-old-token")
      expect(accessTokenService.create).toHaveBeenCalledWith({
        userId: "user-123",
      })
      expect(refreshTokenService.create).toHaveBeenCalledWith({
        userId: "user-123",
        userAgent: "Firefox",
        ipAddress: "192.168.1.1",
        familyId: "family-uuid",
      })

      expect(result).toEqual({
        success: true,
        msg: "Tokens generated successfully",
        data: {
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
        },
      })
    })
  })

  // ---------------------------------------------------------------------------
  // signOut Tests
  // ---------------------------------------------------------------------------
  describe("signOut", () => {
    it("should fail if refresh token is missing (Sad Path)", async () => {
      await authService.signOut({ refreshToken: "" })
      expect(fail).toHaveBeenCalledWith(
        expect.objectContaining({
          error: AuthenticatedErrorCode.AUTH_REFRESH_TOKEN_INVALID,
        })
      )
    })

    it("should delete refresh token and return ok successfully (Happy Path)", async () => {
      refreshTokenService.delete.mockResolvedValueOnce(undefined)

      const result = await authService.signOut({ refreshToken: "valid-token" })

      expect(refreshTokenService.delete).toHaveBeenCalledWith("valid-token")
      expect(ok).toHaveBeenCalledWith(
        expect.objectContaining({ msg: "Signed out successfully" })
      )
      expect(result).toEqual(expect.objectContaining({ success: true }))
    })
  })

  // ---------------------------------------------------------------------------
  // getUser Tests
  // ---------------------------------------------------------------------------
  describe("getUser", () => {
    it("should fail if user is not found (Sad Path)", async () => {
      userRepository.findById.mockResolvedValueOnce(null)

      const result = await authService.getUser({ userId: "non-existent" })

      expect(fail).toHaveBeenCalledWith(
        expect.objectContaining({
          error: AuthenticatedErrorCode.UNAUTHENTICATED,
        })
      )
      expect(result).toEqual(expect.objectContaining({ success: false }))
    })

    it("should return ok with primary identifier mapped (Happy Path)", async () => {
      const mockUser = {
        id: "user-id",
        name: "John Doe",
        avatarUrl: "http://avatar.com",
        identifiers: [
          {
            identifier: "old@example.com",
            identifierType: "EMAIL",
            isPrimary: false,
          },
          {
            identifier: "new@example.com",
            identifierType: "EMAIL",
            isPrimary: true,
          },
        ],
      }
      userRepository.findById.mockResolvedValueOnce(mockUser)

      const result = await authService.getUser({ userId: "user-id" })

      expect(ok).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: "Authenticated user retrieved successfully",
          data: {
            id: mockUser.id,
            name: mockUser.name,
            identifier: "new@example.com",
            identifierType: "EMAIL",
            avatarUrl: mockUser.avatarUrl,
          },
        })
      )
      expect(result).toEqual(expect.objectContaining({ success: true }))
    })
  })
})
