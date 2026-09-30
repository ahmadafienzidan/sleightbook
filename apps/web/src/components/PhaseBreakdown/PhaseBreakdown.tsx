import { useTranslation } from "react-i18next";

import type { IPhase } from "@sleightbook/shared/schemas/routine";

import { usePlayerStore } from "../../store/usePlayer";
import { Panel } from "../Panel/Panel";

interface PhaseBreakdownProps {
  phases: IPhase[];
}

export const PhaseBreakdown = ({ phases }: PhaseBreakdownProps) => {
  const { t } = useTranslation();
  const { phaseIndex, view, goToPhase } = usePlayerStore();

  return (
    <Panel title={t("breakdown.title")}>
      <ol
        aria-label={t("breakdown.title")}
        className="relative space-y-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line-2"
      >
        {phases.map((phase, index) => {
          const isActive = index === phaseIndex;
          return (
            <li
              key={phase.id}
              aria-current={isActive ? "step" : undefined}
              className="relative pl-7"
            >
              <span
                aria-hidden="true"
                className={`absolute left-0.5 top-1.5 h-3 w-3 rounded-full border-2 border-panel ${isActive ? "bg-gold" : "bg-line-2"}`}
              />
              <h3 className="text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => goToPhase(index)}
                  className={`text-left hover:text-gold-2 ${isActive ? "text-gold-2" : "text-fg"}`}
                >
                  {phase.name}
                </button>
              </h3>
              <p className="text-sm text-muted">
                {view === "secret" ? phase.explanation : phase.spectatorText}
              </p>
              {phase.techniques.length > 0 && (
                <ul className="mt-1 flex flex-wrap gap-1">
                  {phase.techniques.map((technique) => (
                    <li
                      key={technique.id}
                      className="rounded bg-panel-3 px-1.5 py-0.5 text-xs text-muted"
                    >
                      {technique.name}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </Panel>
  );
};
