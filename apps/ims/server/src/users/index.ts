import { db } from "@avuny/db"

import { config } from "../config.js"

import { createAuthContainer, IAuthService } from "@avuny/users"

// TODO
// const authContainer = createAuthContainer(db, {
//   jwt: {
//     issuer: config.jwt.issuer,
//     audience: config.jwt.audience,
//     algorithm: config.jwt.algorithm,
//   },

//   token: {
//     accessTokenSecret: config.token.accessTokenSecret,
//     accessTokenExpiresIn: config.token.accessTokenExpiresIn,
//     refreshTokenExpiresIn: config.token.refreshTokenExpiresIn,
//   },

//   auth: {
//     identifierShouldBeVerified: config.auth.identifierShouldBeVerified,
//     otpTokenSecret: config.auth.otpTokenSecret,
//   },
// })

// export const authService :IAuthService = authContainer.authService
