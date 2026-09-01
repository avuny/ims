import { ClientErrorStatusCode, ContentfulStatusCode } from "./http-status.js";
import { Result } from "./result.js";

export type ErrorMeta = {
  statusCode: ClientErrorStatusCode;
  responseMessage: string;
};

export function resultToResponse<T, E extends string>(
  result: Result<T, E>,
  errorMap?: Record<E, ErrorMeta>,
  successStatusCode = 200,
) {
  if (!result.success) {
    const errorCode = result.error;
    //
    const error = errorMap?.[errorCode];

    return {
      status: error?.statusCode || (successStatusCode as ContentfulStatusCode),
      body: {
        success: false as const,
        code: errorCode,
        message: error?.responseMessage,
      },
    };
  }

  return {
    status: successStatusCode as ContentfulStatusCode,
    body: { success: true as const, data: result.data },
  };
}

export function resultToErrorResponse<E extends string, S extends number>(
  error: E,
  errorMap: Record<E, { statusCode: S; responseMessage: string }>,
) {
  const meta = errorMap[error];

  return {
    status: meta.statusCode,
    body: {
      success: false as const,
      code: error,
      message: meta.responseMessage,
      type: "domain",
    },
  };
}

export function resultToSuccessResponse<T, S extends number>(
  data: T,
  status: S,
) {
  return {
    status,
    body: {
      success: true as const,
      data,
    },
  };
}
