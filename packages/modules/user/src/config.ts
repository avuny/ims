export const config = {
  app: {
    env: process.env.NODE_ENV ?? "development",
    port: parseInt(process.env.PORT ?? "4000", 10),
  },
  jwt: {
    issuer: process.env.JWT_ISSUER ?? "avuny-api",
    audience: process.env.JWT_AUDIENCE ?? "avuny-app",
    algorithm: (process.env.JWT_ALGORITHM ?? "HS256") as
      "HS256" | "HS384" | "HS512",
  },
  token: {
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET ?? "",
    accessTokenExpiresIn: parseInt(
      process.env.ACCESS_TOKEN_EXPIRES_IN ?? "900",
      10
    ),
    refreshTokenExpiresIn: parseInt(
      process.env.REFRESH_TOKEN_EXPIRES_IN ?? "2592000",
      10
    ),
  },
  auth: {
    identifierShouldBeVerified:
      process.env.IDENTIFIER_SHOULD_BE_VERIFIED === "true",
    // JwtService requires the secret as a Uint8Array
    otpTokenSecret: new TextEncoder().encode(
      process.env.OTP_TOKEN_SECRET ?? ""
    ),
  },
}
