import { i18n } from "./i18next.js";
export const trans = ({ lang }: { lang: "en" | "ar" }) => {
  const translation = i18n.getFixedT(lang);
  return translation;
};
