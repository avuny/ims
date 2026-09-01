import { fail } from "../result.js"
import { ModuleErrorCodes } from "./module.errors.js"

export const nameConflict = (msg: string, context?: any, caller?: string) => {
  return fail({
    error: ModuleErrorCodes.MODULE_NAME_CONFLICT,
    context,
    caller,
    msg,
  })
}

export const creationLimitExceeded = (
  msg: string,
  context?: any,
  caller?: string
) => {
  return fail({
    error: ModuleErrorCodes.MODULE_CREATION_LIMIT_EXCEEDED,
    context,
    caller,
    msg,
  })
}
export const userNoPermission = (
  msg: string,
  context?: any,
  caller?: string
) => {
  return fail({
    error: ModuleErrorCodes.USER_NO_PERMISSION,
    context,
    caller,
    msg,
  })
}
