import { useEffect } from "react";

import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import type { IItem, ITrickDetail } from "@sleightbook/shared/schemas/trick";

import { doGetTrick, doToggleFavorite } from "../../business/trickBusiness";
import { NotesPanel } from "../../components/NotesPanel/NotesPanel";
import { Panel } from "../../components/Panel/Panel";
import { PhaseBreakdown } from "../../components/PhaseBreakdown/PhaseBreakdown";
import { StatusMessage } from "../../components/StatusMessage/StatusMessage";
import { TechniqueList } from "../../components/TechniqueList/TechniqueList";
import { TrickHero } from "../../components/TrickHero/TrickHero";
import { Visualizer } from "../../components/Visualizer/Visualizer";
import { usePlayerStore } from "../../store/usePlayer";
import { useRoutineStore } from "../../store/useRoutine";
import { useTrickStore } from "../../store/useTrick";

export const TrickDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { trick, error } = useTrickStore();
  const { routine, error: routineError } = useRoutineStore();
  const { phaseIndex, replay } = usePlayerStore();

  useEffect(() => {
    if (id) void doGetTrick(id);
  }, [id]);

  const handleStartVisualizer = () => {
    document.getElementById("visualizer")?.scrollIntoView({ behavior: "smooth", block: "center" });
    replay();
  };
  const handleToggleFavorite = () => {
    void doToggleFavorite();
  };
  const handleRetry = () => {
    if (id) void doGetTrick(id);
  };

  if (error && trick?.id !== id) {
    return <StatusMessage message={error} actionLabel={t("app.retry")} onAction={handleRetry} />;
  }
  if (trick && trick.id === id && (routineError || trick.defaultRoutineId === null)) {
    return (
      <StatusMessage
        message={routineError ?? t("errors.generic")}
        actionLabel={t("app.retry")}
        onAction={handleRetry}
      />
    );
  }
  if (!trick || trick.id !== id || !routine || routine.trickId !== trick.id) {
    return <StatusMessage message={t("app.loading")} />;
  }

  const activePhase = routine.phases[phaseIndex];

  return (
    <>
      <TrickHero
        trick={trick}
        onStartVisualizer={handleStartVisualizer}
        onToggleFavorite={handleToggleFavorite}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <Visualizer phases={routine.phases} />
          <PhaseBreakdown phases={routine.phases} />
        </div>
        <aside className="space-y-3">
          <TrickFacts trick={trick} phaseCount={routine.phases.length} />
          <TechniqueList techniques={activePhase?.techniques ?? []} />
          <ItemList items={trick.items} />
          {routine.tips.length > 0 && <TipList tips={routine.tips} />}
          {activePhase && (
            <NotesPanel
              key={activePhase.id}
              title={t("notes.phaseTitle", { phase: activePhase.name })}
              notes={activePhase.notes}
              target={{ phaseId: activePhase.id }}
            />
          )}
          <NotesPanel
            title={t("notes.trickTitle")}
            notes={trick.notes}
            target={{ trickId: trick.id }}
          />
        </aside>
      </div>
    </>
  );
};

const TrickFacts = ({ trick, phaseCount }: { trick: ITrickDetail; phaseCount: number }) => {
  const { t } = useTranslation();
  const rows = [
    { label: t("details.category"), value: t(`category.${trick.category}`) },
    { label: t("details.difficulty"), value: t(`difficulty.${trick.difficulty}`) },
    {
      label: t("details.duration"),
      value: t("details.durationValue", { min: trick.durationMin, max: trick.durationMax }),
    },
    { label: t("details.phases"), value: String(phaseCount) },
  ];
  return (
    <Panel title={t("details.title")}>
      <dl className="grid gap-2 text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex justify-between gap-3 border-b border-line pb-2 last:border-0"
          >
            <dt className="text-subtle">{row.label}</dt>
            <dd className="text-right text-fg">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
};

const ItemList = ({ items }: { items: IItem[] }) => {
  const { t } = useTranslation();
  return (
    <Panel title={t("items.title")}>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{t("items.none")}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="rounded-md border border-gold-dim/50 bg-panel-2 p-2.5">
              <p className="text-fg">
                {item.name} <span className="text-xs text-subtle">· {t(`items.${item.kind}`)}</span>
              </p>
              {item.setupNotes && <p className="text-xs text-muted">{item.setupNotes}</p>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};

const TipList = ({ tips }: { tips: string[] }) => {
  const { t } = useTranslation();
  return (
    <Panel title={t("tips.title")}>
      <ul className="space-y-2 text-sm text-muted">
        {tips.map((tip) => (
          <li key={tip} className="flex gap-2">
            <span aria-hidden="true" className="text-gold">
              ✓
            </span>
            {tip}
          </li>
        ))}
      </ul>
    </Panel>
  );
};
