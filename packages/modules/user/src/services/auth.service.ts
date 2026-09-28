import { IdentifierType, IUserRepository } from "../repositories/types.js"
import { ITokenService } from "./types.js"
import { hashPassword } from "../utils/password.util.js"
export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private identifierShouldBeVerified: boolean
  ) {}

  signUp = async (params: {
    data: {
      name: string
      identifier: string
      identifierType: IdentifierType
      password: string
    }
  }) => {
    const { data } = params
    const existingUser = await this.userRepository.findByIdentifier({
      where: {
        identifier: data.identifier,
        type: data.identifierType,
      },
    })

    if (existingUser) {
      return {
        success: false,
        message: "User already exists with this identifier",
        code: "USER_EXISTS_ERROR",
      }
    }
    if (this.identifierShouldBeVerified && data.identifierType != "USERNAME") {
      // TODO
    }

    const passwordHash = await hashPassword(data.password)
    const user = await this.userRepository.insert({
      data: {
        name: data.name,
        identifier: data.identifier,
        identifierType: data.identifierType,
        passwordHash,
      },
    })
    const tokens = await this.tokenService.issue({ userId: user.id })

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        identifier: user.identifier,
        identifierType: user.identifierType,
      },
      tokens,
    }
  }
}
