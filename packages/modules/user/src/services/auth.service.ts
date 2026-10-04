import { ok, fail, Result } from "@avuny/utils"
import { JwtService } from "./jwt.service.js"
import { hashPassword, verifyPassword } from "../utils/password.util.js"
import { verifyIdentifierOtpToken } from "../utils/otp-token-verification.util.js"
import {
  AuthLoginErrorCode,
  AuthSignUpErrorCode,
  AuthenticatedErrorCode,
} from "../errors/errors.js"
import { AuthDatabase } from "../repositories/auth-db.type.js"
import { parseIdentifier } from "../utils/parse-identifier.js"
import type { SignUpInput, SignInInput } from "@avuny/contracts"
import { UserRepository } from "../repositories/user.repository.js"
import { AccessTokenService } from "./access-token.service.js"
import { RefreshTokenService } from "./refresh-token.service.js"

type DB = AuthDatabase

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly accessTokenService: AccessTokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly jwtService: JwtService,
    private readonly identifierVerificationConfig?: {
      otpTokenSecret?: string
    }
  ) {}

  withTransaction = async <T>(callback: (tx: DB) => Promise<T>): Promise<T> => {
    try {
      return await this.userRepository.createTransaction(callback)
    } catch (error) {
      throw new Error("Transaction failed", {
        cause: error,
      })
    }
  }

  // ---------------------------------------------------------------------------
  // Sign Up
  // ---------------------------------------------------------------------------
  signUp = async (params: {
    data: SignUpInput
    context?: {
      userAgent?: string
      ipAddress?: string
    }
    otpToken?: string
  }) => {
    const { data, otpToken } = params
    const { identifier, identifierType } = parseIdentifier(data.identifier)

    const existingUser = await this.userRepository.findByIdentifier({
      where: { identifier, type: identifierType },
    })

    if (existingUser) {
      return fail({
        error: AuthSignUpErrorCode.AUTH_SIGN_UP_USER_EXIST,
        msg: "User already exists with this identifier",
        meta: { identifier },
      })
    }

    if (
      this.identifierVerificationConfig?.otpTokenSecret &&
      identifierType !== "USERNAME"
    ) {
      if (!otpToken) {
        return fail({
          error:
            AuthSignUpErrorCode.AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_REQUIRED,
          msg: "Identifier verification is required",
          meta: { identifier },
        })
      }

      const verificationResult = await verifyIdentifierOtpToken({
        jwtService: this.jwtService,
        otpToken,
        secret: this.identifierVerificationConfig.otpTokenSecret,
        expectedIdentifier: identifier,
        expectedIdentifierType: identifierType,
      })

      if (!verificationResult.success) {
        return fail({
          error:
            verificationResult.code ||
            AuthSignUpErrorCode.AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_REQUIRED,
          msg: verificationResult.message || "Identifier verification failed",
          meta: { identifier },
        })
      }
    }

    const passwordHash = await hashPassword(data.password)

    const user = await this.userRepository.insert({
      data: {
        name: data.name,
        identifier,
        identifierType,
        passwordHash,
        setPrimaryIdentifier: true,
      },
    })

    return ok({
      data: {
        user: {
          id: user.id,
          name: user.name,
          identifier: user.identifier,
          identifierType: user.identifierType,
        },
      },
      msg: "User registered successfully",
    })
  }

  // ---------------------------------------------------------------------------
  // Sign In
  // ---------------------------------------------------------------------------
  signIn = async (params: {
    data: SignInInput
    context?: {
      userAgent?: string
      ipAddress?: string
    }
  }) => {
    const { data } = params
    const { identifier, identifierType } = parseIdentifier(data.identifier)

    const user = await this.userRepository.findByIdentifier({
      where: { identifier, type: identifierType },
    })

    if (!user) {
      return fail({
        error: AuthLoginErrorCode.AUTH_LOGIN_INCORRECT_CREDENTIALS,
        msg: "Incorrect credentials",
        meta: { identifier },
      })
    }

    if (!user.passwordHash) {
      return fail({
        error: AuthLoginErrorCode.AUTH_LOGIN_USER_PASSWORD_NOT_SET,
        msg: "User password is not set",
        meta: { identifier },
      })
    }

    const isValidPassword = await verifyPassword(
      data.password,
      user.passwordHash
    )

    if (!isValidPassword) {
      return fail({
        error: AuthLoginErrorCode.AUTH_LOGIN_INCORRECT_CREDENTIALS,
        msg: "Incorrect credentials",
        meta: { identifier },
      })
    }

    return ok({
      data: {
        user: {
          id: user.id,
          name: user.name,
          identifier,
          identifierType,
          avatarUrl: user.avatarUrl,
        },
      },
      msg: "User logged in successfully",
    })
  }

  // ---------------------------------------------------------------------------
  // Token Management
  // ---------------------------------------------------------------------------
  generateTokens = async (params: {
    userId: string
    context?: {
      userAgent?: string
      ipAddress?: string
    }
    familyId?: string
  }) => {
    const accessToken = await this.accessTokenService.create({
      userId: params.userId,
    })

    const refreshToken = await this.refreshTokenService.create({
      userId: params.userId,
      userAgent: params.context?.userAgent,
      ipAddress: params.context?.ipAddress,
      familyId: params.familyId,
    })

    return ok({
      data: { accessToken, refreshToken },
      msg: "Tokens generated successfully",
    })
  }

  refreshToken = async (params: {
    token?: string
    context?: {
      userAgent?: string
      ipAddress?: string
    }
  }) => {
    if (!params.token) {
      return fail({
        error: AuthenticatedErrorCode.AUTH_REFRESH_TOKEN_INVALID,
        msg: "Refresh token is required",
      })
    }

    // 1. Verify existing refresh token
    const verification = await this.refreshTokenService.verify(params.token)

    // Using .success instead of .ok based on the fixed Result types
    if (!verification.success) {
      return verification // Bubbles up the Fail<E> type safely
    }

    const storedToken = verification.data

    // 2. Delete/Revoke the used refresh token to prevent reuse (Rotation)
    await this.refreshTokenService.delete(params.token)

    // 3. Generate new token pair, preserving the token family if implemented
    return await this.generateTokens({
      userId: storedToken.userId,
      context: params.context,
      familyId: storedToken.familyId,
    })
  }

  signOut = async ({ refreshToken }: { refreshToken: string }) => {
    if (!refreshToken) {
      return fail({
        error: AuthenticatedErrorCode.AUTH_REFRESH_TOKEN_INVALID,
        msg: "Refresh token is required",
      })
    }

    await this.refreshTokenService.delete(refreshToken)

    return ok({
      data: null, // Depending on your strictness, you can omit data or pass null/undefined
      msg: "Signed out successfully",
    })
  }

  // ---------------------------------------------------------------------------
  // Get Authenticated User
  // ---------------------------------------------------------------------------
  getUser = async ({ userId }: { userId: string }) => {
    const user = await this.userRepository.findById({ where: { id: userId } })

    if (!user) {
      return fail({
        error: AuthenticatedErrorCode.UNAUTHENTICATED,
        msg: "User not found",
      })
    }

    const identifier = user.identifiers.find(
      (identifier) => identifier.isPrimary
    )

    return ok({
      data: {
        id: user.id,
        name: user.name,
        identifier: identifier?.identifier,
        identifierType: identifier?.identifierType,
        avatarUrl: user.avatarUrl,
      },
      msg: "Authenticated user retrieved successfully",
    })
  }
}
