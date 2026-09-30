import { useTranslation } from "react-i18next";

import type { TView } from "@sleightbook/engine/types";

import { usePlayerStore } from "../../store/usePlayer";

const VIEWS: readonly TView[] = ["spectator", "secret"];

export const ViewToggle = () => {
  const { t } = useTranslation();
  const { view, setView } = usePlayerStore();

  return (
    <fieldset
      aria-label={t("visualizer.view")}
      className="inline-flex rounded-md border border-line p-0.5"
    >
      {VIEWS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={view === option}
          onClick={() => setView(option)}
          className={`rounded px-2.5 py-1 text-xs ${
            view === option ? "bg-gold-deep text-gold-2" : "text-muted hover:text-fg"
          }`}
        >
          {t(`visualizer.${option}`)}
        </button>
      ))}
    </fieldset>
  );
};
