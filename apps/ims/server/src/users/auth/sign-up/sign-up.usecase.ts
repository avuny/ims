import { SignUpInput } from "@avuny/contracts"
import { authService } from "../../auth.container.js"
import { ok } from "@avuny/utils"

export const signUpUseCase = async (params: {
  data: SignUpInput
  context?: {
    userAgent?: string
    ipAddress?: string
  }
}) => {
  // 1. Create the user
  const userResult = await authService.signUp(params)

  if (!userResult.success) {
    return userResult
  }

  // 2. Generate tokens for the newly created user
  const tokensResult = await authService.generateTokens({
    userId: userResult.data.user.id,
  })

  return ok({
    data: {
      user: userResult.data.user,
      tokens: tokensResult.data,
    },
    msg: "User signed up successfully",
  })
}
