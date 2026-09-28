import type authEn from "./locales/auth/en.json"

type AuthMessages = typeof authEn

declare module "i18next" {
  interface CustomTypeOptions {
    resources: {
      auth: AuthMessages
    }
  }
}
