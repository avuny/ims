import { IdentifierType, IUserRepository } from "../repositories/types.js"
import { ITokenService } from "./types.js"
import { JwtService } from "./jwt.service.js"
import { hashPassword, verifyPassword } from "../utils/password.util.js"
import { verifyIdentifierOtpToken } from "../utils/otp-token-verification.util.js"
import {
  AuthLoginDomainErrorCodes,
  AuthSignUpDomainErrorCodes,
} from "../errors/errors.js" // Adjust import path if needed

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

  signUp = async (params: {
    data: {
      name: string
      identifier: string
      identifierType: IdentifierType
      password: string
      otpToken?: string
    }
    context?: { userAgent?: string; ipAddress?: string }
  }) => {
    const { data } = params

    // -------------------------------------------------------------------------
    // Validate existing identifier
    // -------------------------------------------------------------------------

    const existingUser = await this.userRepository.findByIdentifier({
      where: {
        identifier: data.identifier,
        type: data.identifierType,
      },
    })

    if (existingUser) {
      return {
        success: false,
        message: "User already exists with this identifier",
        code: AuthSignUpDomainErrorCodes.AUTH_SIGN_UP_USER_EXIST,
      }
    }

    // -------------------------------------------------------------------------
    // Verify identifier when required
    // -------------------------------------------------------------------------

    if (
      this.identifierVerificationConfig.identifierShouldBeVerified &&
      data.identifierType !== "USERNAME"
    ) {
      if (!data.otpToken) {
        return {
          success: false,
          message: "Identifier verification is required",
          code: AuthSignUpDomainErrorCodes.AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_REQUIRED,
        }
      }

      // Call the extracted utility function
      const verificationResult = await verifyIdentifierOtpToken({
        jwtService: this.jwtService,
        otpToken: data.otpToken,
        secret: this.identifierVerificationConfig.otpTokenSecret,
        expectedIdentifier: data.identifier,
        expectedIdentifierType: data.identifierType,
      })

      // If verification fails, return the exact error block it generated
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
        identifier: data.identifier,
        identifierType: data.identifierType,
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
      success: true,
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
    data: {
      identifier: string
      identifierType?: IdentifierType
      password: string
    }
    context?: { userAgent?: string; ipAddress?: string }
  }) => {
    const { data, context } = params

    // -------------------------------------------------------------------------
    // Find user by identifier
    // -------------------------------------------------------------------------

    const user = await this.userRepository.findByIdentifier({
      where: {
        identifier: data.identifier,
        type: data.identifierType,
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
    // Check if user has a password configured (e.g. social login users)
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
        identifer: data.identifier,
        identifierType: data.identifierType,
        avatarUrl: user.avatarUrl,
      },
      tokens,
    }
  }
}
