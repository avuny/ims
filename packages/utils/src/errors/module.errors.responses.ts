import { fail } from "../result.js"
import { ModuleErrorCode } from "./module.errors.js"

export const nameConflict = (msg: string, context?: any, caller?: string) => {
  return fail({
    error: ModuleErrorCode.MODULE_NAME_CONFLICT,
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
    error: ModuleErrorCode.MODULE_CREATION_LIMIT_EXCEEDED,
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
    error: ModuleErrorCode.USER_NO_PERMISSION,
    context,
    caller,
    msg,
  })
}
