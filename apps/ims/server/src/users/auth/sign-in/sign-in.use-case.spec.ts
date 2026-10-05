import { describe, it, expect, vi, beforeEach } from "vitest"
import { ok } from "@avuny/utils"
import { signInUseCase } from "./sign-in.usecase.js"
import { authService } from "../../auth.container.js"
import type { SignInInput } from "@avuny/contracts"

// ---------------------------------------------------------------------------
// Mock External Modules & Container
// ---------------------------------------------------------------------------
vi.mock("@avuny/utils", () => ({
  ok: vi.fn((payload) => ({ success: true, ...payload })),
}))

vi.mock("../../auth.container.js", () => ({
  authService: {
    signIn: vi.fn(),
    generateTokens: vi.fn(),
  },
}))

describe("signInUseCase", () => {
  const mockTokens = {
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
  }

  const mockParams = {
    data: {
      identifier: "user@example.com",
      password: "Password123!",
    } satisfies SignInInput,
    context: {
      userAgent: "Mozilla/5.0",
      ipAddress: "127.0.0.1",
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return early if authService.signIn fails (Sad Path)", async () => {
    // Arrange
    const mockFailResult = {
      success: false as const,
      error: "AUTH_LOGIN_INCORRECT_CREDENTIALS" as const,
      msg: "Incorrect credentials" as const,
    }
    vi.mocked(authService.signIn).mockResolvedValueOnce(mockFailResult)

    // Act
    const result = await signInUseCase(mockParams)

    // Assert
    expect(authService.signIn).toHaveBeenCalledWith(mockParams)
    expect(authService.generateTokens).not.toHaveBeenCalled()
    expect(result).toEqual(mockFailResult)
  })

  it("should generate tokens and return user with tokens on success (Happy Path)", async () => {
    // Arrange
    const mockUser = {
      id: "user-123",
      name: "John Doe",
      identifier: "user@example.com",
      identifierType: "EMAIL" as const,
      avatarUrl: "https://avatar.com/john.png" as const,
    }

    const mockSignInSuccess = {
      success: true as const,
      data: { user: mockUser },
      msg: "User logged in successfully",
    }

    const mockGenerateTokensSuccess = {
      success: true as const,
      data: mockTokens,
      msg: "Tokens generated successfully",
    }

    vi.mocked(authService.signIn).mockResolvedValueOnce(mockSignInSuccess)
    vi.mocked(authService.generateTokens).mockResolvedValueOnce(
      mockGenerateTokensSuccess
    )

    // Act
    const result = await signInUseCase(mockParams)

    // Assert
    expect(authService.signIn).toHaveBeenCalledWith(mockParams)
    expect(authService.generateTokens).toHaveBeenCalledWith({
      userId: mockUser.id,
    })
    expect(ok).toHaveBeenCalledWith({
      data: {
        user: mockUser,
        tokens: mockTokens,
      },
      msg: "User signed in successfully",
    })
    expect(result).toEqual({
      success: true,
      data: {
        user: mockUser,
        tokens: mockTokens,
      },
      msg: "User signed in successfully",
    })
  })
})
