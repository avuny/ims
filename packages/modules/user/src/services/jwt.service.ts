import {
  jwtVerify,
  SignJWT,
  type JWTPayload,
  type JWTVerifyOptions,
} from "jose"

export interface JwtServiceConfig {
  issuer: string
  audience: string
  algorithm?: "HS256" | "HS384" | "HS512"
}

export interface CreateTokenOptions {
  secret: string
  payload?: JWTPayload
  expiresIn: string | number
  subject?: string
  issuer?: string
  audience?: string | string[]
}

export interface VerifyTokenOptions {
  secret: string
  issuer?: string
  audience?: string | string[]
}

export class JwtService {
  constructor(private readonly config: JwtServiceConfig) {}

  async createToken({
    secret,
    payload = {},
    expiresIn,
    subject,
    issuer = this.config.issuer,
    audience = this.config.audience,
  }: CreateTokenOptions): Promise<string> {
    const jwt = new SignJWT(payload)
      .setProtectedHeader({
        alg: this.config.algorithm ?? "HS256",
        typ: "JWT",
      })
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime(expiresIn)

    if (subject) {
      jwt.setSubject(subject)
    }

    return jwt.sign(new TextEncoder().encode(secret))
  }

  async verifyToken<T extends JWTPayload = JWTPayload>(
    token: string,
    {
      secret,
      issuer = this.config.issuer,
      audience = this.config.audience,
    }: VerifyTokenOptions
  ): Promise<T> {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        algorithms: [this.config.algorithm ?? "HS256"],
        issuer,
        audience,
      }
    )

    return payload as T
  }
}
