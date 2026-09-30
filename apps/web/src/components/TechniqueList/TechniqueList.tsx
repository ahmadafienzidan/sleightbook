import { useTranslation } from "react-i18next";

import type { ITechnique } from "@sleightbook/shared/schemas/routine";

import { Panel } from "../Panel/Panel";

interface TechniqueListProps {
  techniques: ITechnique[];
}

export const TechniqueList = ({ techniques }: TechniqueListProps) => {
  const { t } = useTranslation();
  return (
    <Panel title={t("techniques.title")}>
      {techniques.length === 0 ? (
        <p className="text-sm text-muted">{t("techniques.none")}</p>
      ) : (
        <ul className="space-y-3">
          {techniques.map((technique) => (
            <li key={technique.id} className="flex items-start gap-2 text-sm">
              <span
                aria-hidden="true"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line-2 bg-panel-2 text-gold"
              >
                ◈
              </span>
              <div>
                <p className="text-fg">
                  {technique.name}{" "}
                  <span className="text-xs text-subtle">· {technique.category}</span>
                </p>
                <p className="text-xs text-muted">{technique.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};
