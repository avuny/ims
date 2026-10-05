import { describe, it, expect, vi, beforeEach } from "vitest"
import { ok } from "@avuny/utils"
import { signUpUseCase } from "./sign-up.usecase.js"
import { authService } from "../../auth.container.js"
import type { SignUpInput } from "@avuny/contracts"

// ---------------------------------------------------------------------------
// Mock External Modules & Container
// ---------------------------------------------------------------------------
vi.mock("@avuny/utils", () => ({
  ok: vi.fn((payload) => ({ success: true, ...payload })),
}))

vi.mock("../../auth.container.js", () => ({
  authService: {
    signUp: vi.fn(),
    generateTokens: vi.fn(),
  },
}))

describe("signUpUseCase", () => {
  const mockTokens = {
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
  }

  const mockParams = {
    data: {
      name: "Jane Doe",
      identifier: "jane@example.com",
      password: "Password123!",
    } satisfies SignUpInput,
    context: {
      userAgent: "Mozilla/5.0",
      ipAddress: "127.0.0.1",
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return early if authService.signUp fails (Sad Path)", async () => {
    // Arrange
    const mockFailResult = {
      success: false as const,
      error: "AUTH_SIGN_UP_USER_EXIST" as const,
      msg: "User already exists with this identifier",
    }
    vi.mocked(authService.signUp).mockResolvedValueOnce(mockFailResult)

    // Act
    const result = await signUpUseCase(mockParams)

    // Assert
    expect(authService.signUp).toHaveBeenCalledWith(mockParams)
    expect(authService.generateTokens).not.toHaveBeenCalled()
    expect(result).toEqual(mockFailResult)
  })

  it("should generate tokens and return registered user with tokens on success (Happy Path)", async () => {
    // Arrange
    const mockCreatedUser = {
      id: "user-456",
      name: "Jane Doe",
      identifier: "jane@example.com",
      identifierType: "EMAIL" as const,
    }

    const mockSignUpSuccess = {
      success: true as const,
      data: { user: mockCreatedUser },
      msg: "User registered successfully",
    }

    const mockGenerateTokensSuccess = {
      success: true as const,
      data: mockTokens,
      msg: "Tokens generated successfully",
    }

    vi.mocked(authService.signUp).mockResolvedValueOnce(mockSignUpSuccess)
    vi.mocked(authService.generateTokens).mockResolvedValueOnce(
      mockGenerateTokensSuccess
    )

    // Act
    const result = await signUpUseCase(mockParams)

    // Assert
    expect(authService.signUp).toHaveBeenCalledWith(mockParams)
    expect(authService.generateTokens).toHaveBeenCalledWith({
      userId: mockCreatedUser.id,
    })
    expect(ok).toHaveBeenCalledWith({
      data: {
        user: mockCreatedUser,
        tokens: mockTokens,
      },
      msg: "User signed up successfully",
    })
    expect(result).toEqual({
      success: true,
      data: {
        user: mockCreatedUser,
        tokens: mockTokens,
      },
      msg: "User signed up successfully",
    })
  })
})
