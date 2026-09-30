import { JwtService } from "../services/jwt.service.js"
import { IdentifierType } from "../repositories/types.js"
import {
  AuthSignUpDomainErrorCodes,
  AuthSignUpDomainErrorCodesType,
} from "../errors/errors.js" // Adjust import path if needed

export type IdentifierVerificationPayload = {
  sub: string
  identifierType: IdentifierType
  tokenType: "identifier_verification"
}

export type VerifyOtpParams = {
  jwtService: JwtService
  otpToken: string
  secret: Uint8Array
  expectedIdentifier: string
  expectedIdentifierType: IdentifierType
}

export type VerifyOtpResult =
  | { success: true }
  | { success: false; message: string; code: AuthSignUpDomainErrorCodesType }
// TODO: convert to class and share it with otp
export const verifyIdentifierOtpToken = async (
  params: VerifyOtpParams
): Promise<VerifyOtpResult> => {
  const {
    jwtService,
    otpToken,
    secret,
    expectedIdentifier,
    expectedIdentifierType,
  } = params

  try {
    const payload = await jwtService.verifyToken<IdentifierVerificationPayload>(
      otpToken,
      { secret }
    )

    // Make sure this JWT is actually an identifier-verification token.
    if (payload.tokenType !== "identifier_verification") {
      return {
        success: false,
        message: "Invalid verification token",
        code: AuthSignUpDomainErrorCodes.AUTH_SIGN_UP_INVALID_VERIFICATION_TOKEN,
      }
    }

    // Make sure the token verifies the same identifier
    if (payload.sub !== expectedIdentifier) {
      return {
        success: false,
        message: "Verification token does not match the identifier",
        code: AuthSignUpDomainErrorCodes.AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_MISMATCH,
      }
    }

    // Make sure the token was issued for the same identifier type.
    if (payload.identifierType !== expectedIdentifierType) {
      return {
        success: false,
        message: "Verification token does not match the identifier type",
        code: AuthSignUpDomainErrorCodes.AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_MISMATCH,
      }
    }

    return { success: true }
  } catch {
    return {
      success: false,
      message: "Invalid or expired verification token",
      code: AuthSignUpDomainErrorCodes.AUTH_SIGN_UP_INVALID_VERIFICATION_TOKEN,
    }
  }
}
