import { useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";

import { layout } from "@sleightbook/engine/layout";
import { project } from "@sleightbook/engine/project";
import { stateAt } from "@sleightbook/engine/timeline";
import type { IPhase } from "@sleightbook/shared/schemas/routine";

import { useTimelinePlayback } from "../../hooks/useTimelinePlayback";
import { useVisualizerShortcuts } from "../../hooks/useVisualizerShortcuts";
import { usePlayerStore } from "../../store/usePlayer";
import { PhaseStrip } from "../PhaseStrip/PhaseStrip";
import { PlaybackControls } from "../PlaybackControls/PlaybackControls";
import { SceneSvg } from "../SceneSvg/SceneSvg";
import { ViewToggle } from "../ViewToggle/ViewToggle";

interface VisualizerProps {
  phases: IPhase[];
}

export const Visualizer = ({ phases }: VisualizerProps) => {
  const { t } = useTranslation();
  const { timeline, frameIndex, phaseIndex, view, isJump, speed, showExplanations } =
    usePlayerStore();
  const reducedMotion = useReducedMotion() ?? false;
  useTimelinePlayback();
  useVisualizerShortcuts();

  if (!timeline) return null;

  const scene = project(stateAt(timeline, frameIndex), view);
  const nodes = layout(scene);
  const frame = frameIndex >= 0 ? timeline.frames[frameIndex] : undefined;
  const durationMs = isJump || reducedMotion || !frame ? 0 : frame.durationMs / speed;
  const activePhase = phases[phaseIndex];
  const viewLabel = t(`visualizer.${view}`);

  return (
    <section
      id="visualizer"
      aria-labelledby="visualizer-title"
      className="scroll-mt-6 rounded-xl border border-line bg-panel p-3.5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="visualizer-title" className="text-sm font-semibold">
          {t("visualizer.title")}
        </h2>
        <div className="flex items-center gap-2">
          <ViewToggle />
          <span className="rounded border border-line px-2 py-1 text-xs text-muted">
            {t("visualizer.step", { current: phaseIndex + 1, total: phases.length })}
          </span>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_210px]">
        <div className="overflow-hidden rounded-lg border border-line bg-[radial-gradient(circle_at_50%_44%,var(--color-gold-deep)_0,var(--color-panel)_45%,var(--color-bg)_85%)]">
          <SceneSvg
            nodes={nodes}
            isBeat={scene.beat}
            durationMs={durationMs}
            title={t("visualizer.sceneLabel", { phase: activePhase?.name ?? "", view: viewLabel })}
          />
          {showExplanations && activePhase && (
            <p aria-live="polite" className="border-t border-line px-3 py-2 text-sm text-muted">
              <strong className="block text-fg">
                {phaseIndex + 1}. {activePhase.name}
              </strong>
              {view === "secret" ? activePhase.explanation : activePhase.spectatorText}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <PlaybackControls />
          <p className="text-xs text-subtle">{t("visualizer.shortcuts")}</p>
        </div>
      </div>
      <PhaseStrip phases={phases} />
    </section>
  );
};
