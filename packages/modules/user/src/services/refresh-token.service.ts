import { createHash, randomBytes } from "crypto"

import { SignJWT, jwtVerify, type JWTPayload } from "jose"

import type { Database } from "@avuny/db"
import { fail, ok, Result } from "@avuny/utils"
import {
  AuthenticatedCodesType,
  AuthenticatedErrorCodes,
} from "../errors/errors.js"
import { IRefreshTokenRepository } from "../repositories/types.js"

export type AccessTokenPayload = {
  sub: string
}

export type IssuedTokens = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export type VerifyAccessTokenResult = {
  userId: string
}

export class TokenService {
  constructor(
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly config: {
      accessTokenSecret: string
      accessTokenExpiresIn: number
      refreshTokenExpiresIn: number
      issuer: string
      audience: string
    }
  ) {}

  // ---------------------------------------------------------------------------
  // Issue access + refresh tokens
  // ---------------------------------------------------------------------------

  issue = async (params: {
    userId: string
    userAgent?: string
    ipAddress?: string
    familyId?: string
    db?: Database
  }) => {
    const { userId, userAgent, ipAddress, familyId, db } = params

    // -----------------------------------------------------------------------
    // Refresh token
    // -----------------------------------------------------------------------

    const refreshToken = this.generateRefreshToken()

    const refreshTokenHash = this.hashToken(refreshToken)

    const refreshTokenExpiresAt = new Date(
      Date.now() + this.config.refreshTokenExpiresIn * 1000
    )

    const storedRefreshToken = await this.refreshTokenRepository.create({
      data: {
        userId,
        tokenHash: refreshTokenHash,
        familyId,
        userAgent,
        ipAddress,
        expiresAt: refreshTokenExpiresAt,
      },
    })

    // -----------------------------------------------------------------------
    // Access token
    // -----------------------------------------------------------------------

    const accessToken = await this.createAccessToken({
      userId,
    })

    return { accessToken, refreshToken }
  }

  // ---------------------------------------------------------------------------
  // Verify access token
  // ---------------------------------------------------------------------------

  verifyAccessToken = async (
    token: string
  ): Promise<Result<VerifyAccessTokenResult, AuthenticatedCodesType>> => {
    try {
      const secret = new TextEncoder().encode(this.config.accessTokenSecret)

      const { payload } = await jwtVerify(token, secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      })

      if (!payload.sub) {
        return fail({
          error: AuthenticatedErrorCodes.UNAUTHENTICATED,
          msg: "Access token is invalid",
        })
      }

      return ok({
        data: {
          userId: payload.sub,
        },
        msg: "Access token is valid",
      })
    } catch {
      return fail({
        error: AuthenticatedErrorCodes.UNAUTHENTICATED,
        msg: "Access token is invalid or expired",
      })
    }
  }

  // ---------------------------------------------------------------------------
  // Refresh access + refresh tokens
  // ---------------------------------------------------------------------------

  refreshToken = async (params: {
    refreshToken: string
    userAgent?: string
    ipAddress?: string
  }) => {
    try {
      const { refreshToken, userAgent, ipAddress } = params

      // Never query DB using the raw refresh token.
      const tokenHash = this.hashToken(refreshToken)

      return await this.refreshTokenRepository.createTransaction(async (tx) => {
        // -----------------------------------------------------------------------
        // Find stored refresh token
        // -----------------------------------------------------------------------

        const storedToken = await this.refreshTokenRepository.getByTokenHash({
          where: {
            tokenHash,
          },
          db: tx,
        })

        if (!storedToken) {
          return fail({
            error: AuthenticatedErrorCodes.AUTH_REFRESH_TOKEN_INVALID,
            msg: "Refresh token is invalid",
          })
        }

        // -----------------------------------------------------------------------
        // Validate token state
        // -----------------------------------------------------------------------

        if (storedToken.revokedAt !== null) {
          return fail({
            error: AuthenticatedErrorCodes.AUTH_REFRESH_TOKEN_INVALID,
            msg: "Refresh token has been revoked",
          })
        }

        if (storedToken.expiresAt <= new Date()) {
          return fail({
            error: AuthenticatedErrorCodes.AUTH_REFRESH_TOKEN_INVALID,
            msg: "Refresh token has expired",
          })
        }

        // -----------------------------------------------------------------------
        // Rotate refresh token
        // -----------------------------------------------------------------------

        await this.refreshTokenRepository.revoke({
          where: {
            id: storedToken.id,
          },
          db: tx,
        })

        return this.issue({
          userId: storedToken.userId,
          familyId: storedToken.familyId,
          userAgent,
          ipAddress,
          db: tx,
        })
      })
    } catch (error) {
      return fail({
        error: error as Error,
        msg: "Failed to refresh tokens",
      })
    }
  }
  // ---------------------------------------------------------------------------
  // Create JWT
  // ---------------------------------------------------------------------------

  private createAccessToken = async (params: {
    userId: string
  }): Promise<string> => {
    const secret = new TextEncoder().encode(this.config.accessTokenSecret)

    return new SignJWT({})
      .setProtectedHeader({
        alg: "HS256",
        typ: "JWT",
      })
      .setSubject(params.userId)
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .setIssuedAt()
      .setExpirationTime(`${this.config.accessTokenExpiresIn}s`)
      .sign(secret)
  }

  // ---------------------------------------------------------------------------
  // Generate opaque refresh token
  // ---------------------------------------------------------------------------

  private generateRefreshToken(): string {
    return randomBytes(64).toString("base64url")
  }

  // ---------------------------------------------------------------------------
  // Hash refresh token
  // ---------------------------------------------------------------------------

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex")
  }
}
