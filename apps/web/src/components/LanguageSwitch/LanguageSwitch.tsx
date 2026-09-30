import type { ChangeEvent } from "react";

import { useTranslation } from "react-i18next";

import { changeLanguage, LANGUAGES } from "../../i18n/i18n";

export const LanguageSwitch = () => {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) =>
    changeLanguage(event.target.value === "id" ? "id" : "en");

  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span>{t("language.label")}</span>
      <select
        value={i18n.resolvedLanguage ?? "en"}
        onChange={handleLanguageChange}
        className="rounded-md border border-line bg-panel-2 px-2 py-1 text-sm text-fg"
      >
        {LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {t(`language.${language}`)}
          </option>
        ))}
      </select>
    </label>
  );
};
