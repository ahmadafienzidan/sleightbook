import type { ChangeEvent, ReactNode } from "react";

import { useTranslation } from "react-i18next";

import { SPEEDS } from "../../constants/playback";
import { usePlayerStore } from "../../store/usePlayer";
import { formatSpeed } from "../../utils/format";

export const PlaybackControls = () => {
  const { t } = useTranslation();
  const {
    isPlaying,
    speed,
    showExplanations,
    togglePlay,
    prev,
    next,
    replay,
    setSpeed,
    setShowExplanations,
  } = usePlayerStore();

  const handleSpeedChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextSpeed = SPEEDS[Number(event.target.value)];
    if (nextSpeed !== undefined) setSpeed(nextSpeed);
  };
  const handleExplanationsChange = (event: ChangeEvent<HTMLInputElement>) =>
    setShowExplanations(event.target.checked);

  return (
    <fieldset
      aria-label={t("visualizer.controls")}
      className="flex flex-col gap-4 rounded-lg border border-line bg-panel-2 p-3"
    >
      <div className="flex gap-1.5">
        <ControlButton
          label={isPlaying ? t("visualizer.pause") : t("visualizer.play")}
          onClick={togglePlay}
          isPrimary
        >
          {isPlaying ? "❚❚" : "▶"}
        </ControlButton>
        <ControlButton label={t("visualizer.previous")} onClick={prev}>
          ←
        </ControlButton>
        <ControlButton label={t("visualizer.next")} onClick={next}>
          →
        </ControlButton>
        <ControlButton label={t("visualizer.replay")} onClick={replay}>
          ↺
        </ControlButton>
      </div>
      <label className="block text-xs text-muted">
        <span className="flex justify-between">
          <span>{t("visualizer.speed")}</span>
          <span aria-hidden="true">{formatSpeed(speed)}</span>
        </span>
        <input
          type="range"
          min={0}
          max={SPEEDS.length - 1}
          step={1}
          value={SPEEDS.indexOf(speed)}
          onChange={handleSpeedChange}
          aria-label={t("visualizer.speed")}
          aria-valuetext={formatSpeed(speed)}
          className="mt-2 w-full accent-gold"
        />
      </label>
      <label className="flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
        {t("visualizer.explanations")}
        <input
          type="checkbox"
          checked={showExplanations}
          onChange={handleExplanationsChange}
          className="h-4 w-4 accent-gold"
        />
      </label>
    </fieldset>
  );
};

const ControlButton = ({
  label,
  onClick,
  isPrimary = false,
  children,
}: {
  label: string;
  onClick: () => void;
  isPrimary?: boolean;
  children: ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className={`h-9 flex-1 rounded-md border text-sm hover:border-gold-dim ${
      isPrimary ? "border-gold-dim bg-gold-deep text-gold-2" : "border-line-2 bg-panel-3 text-fg"
    }`}
  >
    <span aria-hidden="true">{children}</span>
  </button>
);
