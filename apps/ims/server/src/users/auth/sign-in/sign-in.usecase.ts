import { SignInInput } from "@avuny/contracts"
import { authService } from "../../auth.container.js"
import { ok } from "@avuny/utils"

export const signInUseCase = async (params: {
  data: SignInInput
  context?: {
    userAgent?: string
    ipAddress?: string
  }
}) => {
  const userResult = await authService.signIn(params)
  if (!userResult.success) {
    return userResult
  }
  const tokensResult = await authService.generateTokens({
    userId: userResult.data.user.id,
  })
  return ok({
    data: {
      user: userResult.data.user,
      tokens: tokensResult.data,
    },
    msg: "User signed in successfully",
  })
}
