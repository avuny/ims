import { RefreshTokenRepositoy } from "./refresh-token.repository.js"
import { UserRepository } from "./user.repository.js"

export type { IdentifierType } from "@avuny/db"

export type IUserRepository = InstanceType<typeof UserRepository>

export type IRefreshTokenRepository = InstanceType<typeof RefreshTokenRepositoy>
