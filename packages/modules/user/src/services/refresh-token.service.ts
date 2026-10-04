import { createHash, randomBytes } from "crypto"
import { fail, ok, Result } from "@avuny/utils"
import { AuthenticatedErrorCode } from "../errors/errors.js"
import { AuthDatabase } from "../repositories/auth-db.type.js"
import { RefreshTokenRepositoy } from "../repositories/refresh-token.repository.js"

type DB = AuthDatabase

export class RefreshTokenService {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepositoy,
    private readonly config: {
      refreshTokenExpiresIn: number
    }
  ) {}

  async withTransaction<T>(callback: (tx: DB) => Promise<T>): Promise<T> {
    try {
      return await this.refreshTokenRepository.createTransaction(callback)
    } catch (error) {
      throw new Error("Transaction failed", { cause: error })
    }
  }

  // ---------------------------------------------------------------------------
  // Create (Issue) Refresh Token
  // ---------------------------------------------------------------------------
  async create(params: {
    userId: string
    userAgent?: string
    ipAddress?: string
    familyId?: string
    db?: DB
  }): Promise<string> {
    const { userId, userAgent, ipAddress, familyId, db } = params

    const refreshToken = this.generateRefreshToken()
    const refreshTokenHash = this.hashToken(refreshToken)
    const expiresAt = new Date(
      Date.now() + this.config.refreshTokenExpiresIn * 1000
    )

    await this.refreshTokenRepository.create({
      data: {
        userId,
        tokenHash: refreshTokenHash,
        familyId,
        userAgent,
        ipAddress,
        expiresAt,
      },
      db, // Pass the transaction context if provided
    })

    return refreshToken
  }

  // ---------------------------------------------------------------------------
  // Verify Refresh Token State
  // ---------------------------------------------------------------------------
  async verify(
    refreshToken: string,
    db?: DB
  ): Promise<Result<any, AuthenticatedErrorCode>> {
    // Note: Replace `any` with your stored token type from the repository
    const tokenHash = this.hashToken(refreshToken)

    const storedToken = await this.refreshTokenRepository.getByTokenHash({
      where: { tokenHash },
      db,
    })

    if (!storedToken) {
      return fail({
        error: AuthenticatedErrorCode.AUTH_REFRESH_TOKEN_INVALID,
        msg: "Refresh token is invalid",
      })
    }

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

    return ok({
      data: storedToken,
      msg: "Refresh token is valid",
    })
  }

  // ---------------------------------------------------------------------------
  // Revoke (Used during rotation)
  // ---------------------------------------------------------------------------
  async revoke(tokenId: string, db?: DB) {
    return await this.refreshTokenRepository.revoke({
      where: { id: tokenId },
      db,
    })
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  async delete(token: string) {
    const tokenHash = this.hashToken(token)
    return await this.refreshTokenRepository.delete({
      where: { tokenHash },
    })
  }

  // ---------------------------------------------------------------------------
  // Private Utilities
  // ---------------------------------------------------------------------------
  private generateRefreshToken(): string {
    return randomBytes(64).toString("base64url")
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex")
  }
}
