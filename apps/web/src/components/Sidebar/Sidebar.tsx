import { useEffect } from "react";

import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";

import { doGetTricks } from "../../business/trickBusiness";
import { toTrickPath } from "../../constants/routes";
import { useTrickStore } from "../../store/useTrick";
import { Brand } from "../Brand/Brand";

export const Sidebar = () => {
  const { t } = useTranslation();
  const { tricks } = useTrickStore();

  useEffect(() => {
    if (tricks.length === 0) void doGetTricks();
  }, [tricks.length]);

  return (
    <aside className="hidden border-r border-line bg-sidebar px-4 py-6 md:block">
      <div className="pb-8">
        <Brand />
      </div>
      <nav aria-label={t("app.library")}>
        <p className="px-3 pb-2 text-xs uppercase tracking-widest text-subtle">
          {t("app.library")}
        </p>
        <ul className="grid gap-1">
          {tricks.map((trick) => (
            <li key={trick.id}>
              <NavLink
                to={toTrickPath(trick.id)}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm ${
                    isActive
                      ? "bg-panel-3 text-gold-2 shadow-[inset_2px_0_var(--color-gold)]"
                      : "text-muted hover:bg-panel-3 hover:text-fg"
                  }`
                }
              >
                {trick.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};
