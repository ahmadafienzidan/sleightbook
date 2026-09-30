import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import type { TLanguage } from "../types/i18n.types";
import en from "./locales/en.json";
import id from "./locales/id.json";

export const LANGUAGES: readonly TLanguage[] = ["en", "id"];
export const LANGUAGE_STORAGE_KEY = "sleightbook.language";

const readStoredLanguage = (): TLanguage => {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === "id" ? "id" : "en";
  } catch {
    return "en";
  }
};

const initialLanguage = readStoredLanguage();

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, id: { translation: id } },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});
document.documentElement.lang = initialLanguage;

export const changeLanguage = (language: TLanguage): void => {
  void i18n.changeLanguage(language);
  document.documentElement.lang = language;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts for this session only.
  }
};

export { i18n };
