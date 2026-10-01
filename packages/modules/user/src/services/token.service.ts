import { createHash, randomBytes } from "crypto"

import { fail, ok, Result } from "@avuny/utils"

import { AuthenticatedErrorCode } from "../errors/errors.js"
import { IRefreshTokenRepository } from "../repositories/types.js"
import { JwtService } from "./jwt.service.js"
import { AuthDatabase } from "../repositories/auth-db.type.js"
import { RefreshTokenRepositoy } from "../repositories/refresh-token.repository.js"

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
type DB = AuthDatabase
export class TokenService {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepositoy,
    private readonly jwtService: JwtService,
    private readonly config: {
      accessTokenSecret: string
      accessTokenExpiresIn: number
      refreshTokenExpiresIn: number
    }
  ) {}

  withTransaction = async <T>(callback: (tx: DB) => Promise<T>): Promise<T> => {
    try {
      return await this.refreshTokenRepository.createTransaction(callback)
    } catch (error) {
      throw new Error("Transaction failed", {
        cause: error,
      })
    }
  }

  // ---------------------------------------------------------------------------
  // Issue access + refresh tokens
  // ---------------------------------------------------------------------------

  issue = async (params: {
    userId: string
    userAgent?: string
    ipAddress?: string
    familyId?: string
    db?: DB
  }) => {
    const { userId, userAgent, ipAddress, familyId, db } = params

    // -------------------------------------------------------------------------
    // Refresh token
    // -------------------------------------------------------------------------

    const refreshToken = this.generateRefreshToken()

    const refreshTokenHash = this.hashToken(refreshToken)

    const refreshTokenExpiresAt = new Date(
      Date.now() + this.config.refreshTokenExpiresIn * 1000
    )

    await this.refreshTokenRepository.create({
      data: {
        userId,
        tokenHash: refreshTokenHash,
        familyId,
        userAgent,
        ipAddress,
        expiresAt: refreshTokenExpiresAt,
      },
    })

    // -------------------------------------------------------------------------
    // Access token
    // -------------------------------------------------------------------------

    const accessToken = await this.createAccessToken({
      userId,
    })

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.accessTokenExpiresIn,
    }
  }

  // ---------------------------------------------------------------------------
  // Verify access token
  // ---------------------------------------------------------------------------

  verifyAccessToken = async (
    token: string
  ): Promise<Result<VerifyAccessTokenResult, AuthenticatedErrorCode>> => {
    try {
      const payload = await this.jwtService.verifyToken<AccessTokenPayload>(
        token,
        {
          secret: this.config.accessTokenSecret,
        }
      )

      if (!payload.sub) {
        return fail({
          error: AuthenticatedErrorCode.UNAUTHENTICATED,
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
        error: AuthenticatedErrorCode.UNAUTHENTICATED,
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
        // -------------------------------------------------------------------
        // Find stored refresh token
        // -------------------------------------------------------------------

        const storedToken = await this.refreshTokenRepository.getByTokenHash({
          where: {
            tokenHash,
          },
          db: tx,
        })

        if (!storedToken) {
          return fail({
            error: AuthenticatedErrorCode.AUTH_REFRESH_TOKEN_INVALID,
            msg: "Refresh token is invalid",
          })
        }

        // -------------------------------------------------------------------
        // Validate token state
        // -------------------------------------------------------------------

        if (storedToken.revokedAt !== null) {
          return fail({
            error: AuthenticatedErrorCode.AUTH_REFRESH_TOKEN_INVALID,
            msg: "Refresh token has been revoked",
          })
        }

        if (storedToken.expiresAt <= new Date()) {
          return fail({
            error: AuthenticatedErrorCode.AUTH_REFRESH_TOKEN_INVALID,
            msg: "Refresh token has expired",
          })
        }

        // -------------------------------------------------------------------
        // Rotate refresh token
        // -------------------------------------------------------------------

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
  // Create access JWT
  // ---------------------------------------------------------------------------

  private createAccessToken = async (params: {
    userId: string
  }): Promise<string> => {
    return this.jwtService.createToken({
      secret: this.config.accessTokenSecret,
      subject: params.userId,
      expiresIn: `${this.config.accessTokenExpiresIn}s`,
    })
  }

  deleteRefreshToken = async (token: string) => {
    const tokenHash = this.hashToken(token)
    return await this.refreshTokenRepository.delete({ where: { tokenHash } })
  }

  // ---------------------------------------------------------------------------
  // Generate opaque refresh token
  // ---------------------------------------------------------------------------

  private generateRefreshToken(): string {
    return randomBytes(64).toString("base64url")
  }

  // ---------------------------------------------------------------------------
  // Hash refresh token before storing it in the database.
  // The raw token is kept only by the client (HttpOnly cookie), so a database
  // leak does not expose usable refresh tokens.
  // ---------------------------------------------------------------------------

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex")
  }
}
