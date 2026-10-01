import { ok, fail } from "@avuny/utils"
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
import { TokenService } from "./token.service.js"

type DB = AuthDatabase

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
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

    // Validate existing identifier
    const existingUser = await this.userRepository.findByIdentifier({
      where: {
        identifier,
        type: identifierType,
      },
    })

    if (existingUser) {
      return fail({
        error: AuthSignUpErrorCode.AUTH_SIGN_UP_USER_EXIST,
        msg: "User already exists with this identifier",
        meta: { identifier },
      })
    }

    // Verify identifier when required
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

    // Create user
    const passwordHash = await hashPassword(data.password)

    const user = await this.userRepository.insert({
      data: {
        name: data.name,
        identifier,
        identifierType,
        passwordHash,
        setPrimaryIdentifier: true, // Set the first identifier as primary
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

    // Find user by identifier
    const user = await this.userRepository.findByIdentifier({
      where: {
        identifier,
        type: identifierType,
      },
    })

    if (!user) {
      return fail({
        error: AuthLoginErrorCode.AUTH_LOGIN_INCORRECT_CREDENTIALS,
        msg: "Incorrect credentials",
        meta: { identifier },
      })
    }

    // Check if user has a password configured
    if (!user.passwordHash) {
      return fail({
        error: AuthLoginErrorCode.AUTH_LOGIN_USER_PASSWORD_NOT_SET,
        msg: "User password is not set",
        meta: { identifier },
      })
    }

    // Verify password
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
  // Sign Out
  // ---------------------------------------------------------------------------

  signOut = async ({ refreshToken }: { refreshToken: string }) => {
    if (!refreshToken) {
      return fail({
        error: AuthenticatedErrorCode.AUTH_REFRESH_TOKEN_INVALID,
        msg: "Refresh token is required",
      })
    }

    return await this.tokenService.deleteRefreshToken(refreshToken)
  }

  // ---------------------------------------------------------------------------
  // Refresh Token
  // ---------------------------------------------------------------------------

  refreshToken = async ({ token }: { token?: string }) => {
    if (!token) {
      return fail({
        error: AuthenticatedErrorCode.AUTH_REFRESH_TOKEN_INVALID,
        msg: "Refresh token is required",
      })
    }

    // TODO: extract verify refresh token logic to a separate function in tokenService
    // and make this function use it and resposible for only generating new tokens and returning them

    return await this.tokenService.refreshToken({ refreshToken: token })
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
