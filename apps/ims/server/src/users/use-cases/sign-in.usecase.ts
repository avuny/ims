import { SignInInput } from "@avuny/contracts"
import { authService, tokenService } from "../index.js"

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
  const tokensResult = await tokenService.issue({
    userId: userResult.user.id,
  })
  return {
    user: userResult.user,
    tokens: tokensResult,
  }
}
