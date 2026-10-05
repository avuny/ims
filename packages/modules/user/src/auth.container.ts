import { RefreshTokenRepositoy } from "./repositories/refresh-token.repository.js"
import { UserRepository } from "./repositories/user.repository.js"

import { JwtService } from "./services/jwt.service.js"
import { AccessTokenService } from "./services/access-token.service.js"
import { RefreshTokenService } from "./services/refresh-token.service.js"
import { AuthService } from "./services/auth.service.js"
import { AuthDatabase } from "./repositories/auth-db.type.js"
import { createHonoAuthenticatedMiddleware } from "./middlewares/hono-authenticated-middleware.js"
type AuthConfig = {
  jwt: ConstructorParameters<typeof JwtService>[0]
  accessToken: ConstructorParameters<typeof AccessTokenService>[1]
  refreshToken: ConstructorParameters<typeof RefreshTokenService>[1]
  auth?: ConstructorParameters<typeof AuthService>[4]
}

export type AuthContainer = {
  authService: AuthService
  userRepository: UserRepository
  refreshTokenRepository: RefreshTokenRepositoy
  jwtService: JwtService
  accessTokenService: AccessTokenService
  refreshTokenService: RefreshTokenService
  honoAuthenticatedMiddleware: ReturnType<
    typeof createHonoAuthenticatedMiddleware
  >
}

export const createAuthContainer = (
  db: AuthDatabase,
  config: AuthConfig
): AuthContainer => {
  // 1. Repositories
  const userRepository = new UserRepository(db)
  const refreshTokenRepository = new RefreshTokenRepositoy(db)

  // 2. Base Services
  const jwtService = new JwtService(config.jwt)

  // 3. Domain Token Services
  const accessTokenService = new AccessTokenService(
    jwtService,
    config.accessToken
  )

  const refreshTokenService = new RefreshTokenService(
    refreshTokenRepository,
    config.refreshToken
  )

  // 4. Orchestrator Service
  // (Make sure the order of arguments matches your updated AuthService constructor)
  const authService = new AuthService(
    userRepository,
    accessTokenService,
    refreshTokenService,
    jwtService, // 4th argument
    config.auth // 5th argument
  )

  const honoAuthenticatedMiddleware = createHonoAuthenticatedMiddleware({
    tokensService: accessTokenService,
  })

  return {
    authService,
    userRepository,
    refreshTokenRepository,
    jwtService,
    accessTokenService,
    refreshTokenService,
    honoAuthenticatedMiddleware,
  }
}
