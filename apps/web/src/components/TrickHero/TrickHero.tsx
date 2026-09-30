import { useTranslation } from "react-i18next";

import type { ITrickDetail } from "@sleightbook/shared/schemas/trick";

interface TrickHeroProps {
  trick: ITrickDetail;
  onStartVisualizer: () => void;
  onToggleFavorite: () => void;
}

export const TrickHero = ({ trick, onStartVisualizer, onToggleFavorite }: TrickHeroProps) => {
  const { t } = useTranslation();
  const favoriteLabel = trick.isFavorite ? t("hero.unfavorite") : t("hero.favorite");

  return (
    <section className="mb-4 grid overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl md:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col justify-center gap-3 p-6">
        <span className="self-start rounded border border-gold-dim bg-gold-deep px-2 py-1 text-xs uppercase tracking-wide text-gold-2">
          {t(`category.${trick.category}`)}
        </span>
        <h1 className="text-3xl font-bold tracking-tight">{trick.name}</h1>
        <p className="max-w-prose text-sm text-muted">{trick.description}</p>
        <ul className="flex flex-wrap gap-2 text-xs text-muted">
          <li className="rounded-full border border-line bg-panel-2 px-3 py-1">
            {t(`difficulty.${trick.difficulty}`)}
          </li>
          <li className="rounded-full border border-line bg-panel-2 px-3 py-1">
            {t("hero.duration", { min: trick.durationMin, max: trick.durationMax })}
          </li>
          {trick.items.map((item) => (
            <li key={item.id} className="rounded-full border border-line bg-panel-2 px-3 py-1">
              {item.name}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <button type="button" onClick={onStartVisualizer} className="btn-primary">
            {t("hero.startVisualizer")} ▶
          </button>
          <button
            type="button"
            aria-pressed={trick.isFavorite}
            aria-label={favoriteLabel}
            title={favoriteLabel}
            onClick={onToggleFavorite}
            className={`btn-secondary ${trick.isFavorite ? "text-gold-2" : ""}`}
          >
            <span aria-hidden="true">{trick.isFavorite ? "♥" : "♡"}</span>
          </button>
        </div>
      </div>
      <HeroArt />
    </section>
  );
};

const HeroArt = () => (
  <div
    aria-hidden="true"
    className="relative hidden min-h-56 overflow-hidden bg-[radial-gradient(circle_at_50%_48%,var(--color-gold-dim)_0,var(--color-gold-deep)_25%,var(--color-panel)_65%)] md:block"
  >
    <div className="absolute left-1/2 top-[57%] h-36 w-26 -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded-lg border border-line-2 bg-card-back shadow-2xl" />
    <div className="absolute left-1/2 top-1/2 grid h-34 w-24 -translate-x-1/2 -translate-y-1/2 rotate-6 place-items-center rounded-lg border border-subtle bg-card-face text-4xl font-extrabold text-card-ink shadow-2xl">
      ♠
    </div>
  </div>
);
