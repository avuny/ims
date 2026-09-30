import { IUserRepository } from "../repositories/types.js"
import { ITokenService } from "./types.js"
import { JwtService } from "./jwt.service.js"
import { hashPassword, verifyPassword } from "../utils/password.util.js"
import { verifyIdentifierOtpToken } from "../utils/otp-token-verification.util.js"
import {
  AuthLoginDomainErrorCodes,
  AuthSignUpDomainErrorCodes,
} from "../errors/errors.js"
import { AuthDatabase } from "../repositories/auth-db.type.js"
import { parseIdentifier } from "../utils/parse-identifier.js"
import type { SignUpInput, SignInInput } from "@avuny/contracts"
type DB = AuthDatabase

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly jwtService: JwtService,
    private readonly identifierVerificationConfig: {
      identifierShouldBeVerified: boolean
      otpTokenSecret: Uint8Array
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

    // -------------------------------------------------------------------------
    // Validate existing identifier
    // -------------------------------------------------------------------------

    const existingUser = await this.userRepository.findByIdentifier({
      where: {
        identifier,
        type: identifierType,
      },
    })

    if (existingUser) {
      return {
        success: false as const,
        message: "User already exists with this identifier",
        code: AuthSignUpDomainErrorCodes.AUTH_SIGN_UP_USER_EXIST,
      }
    }

    // -------------------------------------------------------------------------
    // Verify identifier when required
    // -------------------------------------------------------------------------

    if (
      this.identifierVerificationConfig.identifierShouldBeVerified &&
      identifierType !== "USERNAME"
    ) {
      if (!otpToken) {
        return {
          success: false as const,
          message: "Identifier verification is required",
          code: AuthSignUpDomainErrorCodes.AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_REQUIRED,
        }
      }

      const verificationResult = await verifyIdentifierOtpToken({
        jwtService: this.jwtService,
        otpToken,
        secret: this.identifierVerificationConfig.otpTokenSecret,
        expectedIdentifier: identifier,
        expectedIdentifierType: identifierType,
      })

      if (!verificationResult.success) {
        return verificationResult
      }
    }

    // -------------------------------------------------------------------------
    // Create user
    // -------------------------------------------------------------------------

    const passwordHash = await hashPassword(data.password)

    const user = await this.userRepository.insert({
      data: {
        name: data.name,
        identifier,
        identifierType,
        passwordHash,
      },
    })

    // -------------------------------------------------------------------------
    // Issue authentication tokens
    // -------------------------------------------------------------------------

    const tokens = await this.tokenService.issue({
      userId: user.id,
    })

    return {
      success: true as const,
      user: {
        id: user.id,
        name: user.name,
        identifier: user.identifier,
        identifierType: user.identifierType,
      },
      tokens,
    }
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
    const { data, context } = params
    const { identifier, identifierType } = parseIdentifier(data.identifier)

    // -------------------------------------------------------------------------
    // Find user by identifier
    // -------------------------------------------------------------------------

    const user = await this.userRepository.findByIdentifier({
      where: {
        identifier,
        type: identifierType,
      },
    })

    if (!user) {
      return {
        success: false as const,
        message: "Incorrect credentials",
        code: AuthLoginDomainErrorCodes.AUTH_LOGIN_INCORRECT_CREDENTIALS,
      }
    }

    // -------------------------------------------------------------------------
    // Check if user has a password configured
    // -------------------------------------------------------------------------

    if (!user.passwordHash) {
      return {
        success: false as const,
        message: "User password is not set",
        code: AuthLoginDomainErrorCodes.AUTH_LOGIN_USER_PASSWORD_NOT_SET,
      }
    }

    // -------------------------------------------------------------------------
    // Verify password
    // -------------------------------------------------------------------------

    const isValidPassword = await verifyPassword(
      data.password,
      user.passwordHash
    )

    if (!isValidPassword) {
      return {
        success: false as const,
        message: "Incorrect credentials",
        code: AuthLoginDomainErrorCodes.AUTH_LOGIN_INCORRECT_CREDENTIALS,
      }
    }

    // -------------------------------------------------------------------------
    // Issue authentication tokens
    // -------------------------------------------------------------------------

    const tokens = await this.tokenService.issue({
      userId: user.id,
      userAgent: context?.userAgent,
      ipAddress: context?.ipAddress,
    })

    return {
      success: true as const,
      user: {
        id: user.id,
        name: user.name,
        identifier,
        identifierType,
        avatarUrl: user.avatarUrl,
      },
      tokens,
    }
  }
}
