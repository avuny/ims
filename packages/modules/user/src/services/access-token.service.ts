import { fail, ok, Result } from "@avuny/utils"
import { AuthenticatedErrorCode } from "../errors/errors.js"
import { JwtService } from "./jwt.service.js"

export type AccessTokenPayload = {
  sub: string
}

export type VerifyAccessTokenResult = {
  userId: string
}

export class AccessTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: {
      accessTokenSecret: string
      accessTokenExpiresIn: number
    }
  ) {}

  // ---------------------------------------------------------------------------
  // Create Access Token
  // ---------------------------------------------------------------------------
  async create(params: { userId: string }): Promise<string> {
    return this.jwtService.createToken({
      secret: this.config.accessTokenSecret,
      subject: params.userId,
      expiresIn: `${this.config.accessTokenExpiresIn}s`,
    })
  }

  // ---------------------------------------------------------------------------
  // Verify Access Token
  // ---------------------------------------------------------------------------
  async verify(
    token: string
  ): Promise<Result<VerifyAccessTokenResult, AuthenticatedErrorCode>> {
    try {
      const payload = await this.jwtService.verifyToken<AccessTokenPayload>(
        token,
        { secret: this.config.accessTokenSecret }
      )

      if (!payload.sub) {
        return fail({
          error: AuthenticatedErrorCode.UNAUTHENTICATED,
          msg: "Access token is invalid",
        })
      }

      return ok({
        data: { userId: payload.sub },
        msg: "Access token is valid",
      })
    } catch {
      return fail({
        error: AuthenticatedErrorCode.UNAUTHENTICATED,
        msg: "Access token is invalid or expired",
      })
    }
  }
}
