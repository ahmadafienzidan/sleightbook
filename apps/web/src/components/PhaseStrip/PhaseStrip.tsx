import { useTranslation } from "react-i18next";

import type { IPhase } from "@sleightbook/shared/schemas/routine";

import { usePlayerStore } from "../../store/usePlayer";

interface PhaseStripProps {
  phases: IPhase[];
}

export const PhaseStrip = ({ phases }: PhaseStripProps) => {
  const { t } = useTranslation();
  const { phaseIndex, goToPhase } = usePlayerStore();

  return (
    <ol aria-label={t("visualizer.phases")} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
      {phases.map((phase, index) => {
        const isActive = index === phaseIndex;
        return (
          <li key={phase.id}>
            <button
              type="button"
              onClick={() => goToPhase(index)}
              aria-current={isActive ? "step" : undefined}
              className={`h-full w-full rounded-lg border p-2 text-left ${
                isActive
                  ? "border-gold-dim bg-gold-deep text-gold-2"
                  : "border-line bg-panel-2 text-muted hover:border-line-2"
              }`}
            >
              <span className="block text-xs">{String(index + 1).padStart(2, "0")}</span>
              <span className="block text-sm font-semibold">{phase.name}</span>
              <span className="block text-xs text-subtle">{phase.summary}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
};
