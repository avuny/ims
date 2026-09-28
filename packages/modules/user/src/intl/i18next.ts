import i18n from "i18next"

import authEn from "./locales/auth/en.json" with { type: "json" }
import authAr from "./locales/auth/ar.json" with { type: "json" }

i18n.init({
  fallbackLng: "en",
  lng: "en",

  resources: {
    en: {
      auth: authEn,
    },
    ar: {
      auth: authAr,
    },
  },

  ns: ["auth"],

  interpolation: {
    escapeValue: false,
  },
  keySeparator: ".",
})

export { i18n }
