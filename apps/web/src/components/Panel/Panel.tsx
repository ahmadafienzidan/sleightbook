import { type ReactNode, useId } from "react";

interface PanelProps {
  title: string;
  children: ReactNode;
}

export const Panel = ({ title, children }: PanelProps) => {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="rounded-xl border border-line bg-panel p-4">
      <h2 id={titleId} className="mb-3 text-sm font-semibold text-fg">
        {title}
      </h2>
      {children}
    </section>
  );
};
