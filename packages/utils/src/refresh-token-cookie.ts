type RefreshTokenCookieOpts = {
  cookieName?: string
  path?: string
  httpOnly?: boolean
  secure?: boolean
  sameSite?: "lax" | "strict" | "none"
  maxAge?: number
}

export const refreshTokenCookieOpts = (opts: RefreshTokenCookieOpts = {}) => ({
  cookieName: opts.cookieName ?? "refreshToken",
  path: opts.path ?? "/",
  httpOnly: opts.httpOnly ?? true,
  secure: opts.secure ?? process.env.NODE_ENV === "production",
  sameSite:
    opts.sameSite ?? (process.env.NODE_ENV === "production" ? "lax" : "strict"),
  maxAge: opts.maxAge ?? 60 * 60 * 24 * 15, // 15 days
})
