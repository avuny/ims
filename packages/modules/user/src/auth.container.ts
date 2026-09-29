import { RefreshTokenRepositoy } from "./repositories/refresh-token.repository.js"
import { UserRepository } from "./repositories/user.repository.js"

import { JwtService } from "./services/jwt.service.js"
import { TokenService } from "./services/token.service.js"
import { AuthService } from "./services/auth.service.js"
import { AuthDatabase } from "./repositories/auth-db.type.js"

type AuthConfig = {
  jwt: ConstructorParameters<typeof JwtService>[0]
  token: ConstructorParameters<typeof TokenService>[2]
  auth: ConstructorParameters<typeof AuthService>[3]
}

export type AuthContainer = {
  authService: AuthService
  userRepository: UserRepository
  refreshTokenRepository: RefreshTokenRepositoy
  jwtService: JwtService
  tokenService: TokenService
}

export const createAuthContainer = (
  db: AuthDatabase,
  config: AuthConfig
): AuthContainer => {
  const userRepository = new UserRepository(db)

  const refreshTokenRepository = new RefreshTokenRepositoy(db)

  const jwtService = new JwtService(config.jwt)

  const tokenService = new TokenService(
    refreshTokenRepository,
    jwtService,
    config.token
  )

  const authService = new AuthService(
    userRepository,
    tokenService,
    jwtService,
    config.auth
  )

  return {
    authService,
    userRepository,
    refreshTokenRepository,
    jwtService,
    tokenService,
  }
}
