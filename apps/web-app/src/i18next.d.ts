import "i18next"
import { resources } from "./resources.ts"

type TranslationResources = {
  translation: typeof resources.en
}

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common"
    resources: TranslationResources
  }
}
