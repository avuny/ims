import { AuthService } from "./auth.service.js"
import { TokenService } from "./refresh-token.service.js"

export type IAuthService = InstanceType<typeof AuthService>

export type ITokenService = InstanceType<typeof TokenService>
