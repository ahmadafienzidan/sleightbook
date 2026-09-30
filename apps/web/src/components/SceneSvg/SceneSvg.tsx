import { useId } from "react";

import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";

import {
  CARD_HEIGHT,
  CARD_WIDTH,
  DECK_X,
  DECK_Y,
  STAGE_HEIGHT,
  STAGE_WIDTH,
} from "@sleightbook/engine/layout";
import type { IRenderNode, THighlight } from "@sleightbook/engine/types";

import { formatCardLabel } from "../../utils/format";

interface SceneSvgProps {
  nodes: IRenderNode[];
  isBeat: boolean;
  durationMs: number;
  title: string;
}

const CARD_EASE = [0.2, 0.8, 0.2, 1] as const;

export const SceneSvg = ({ nodes, isBeat, durationMs, title }: SceneSvgProps) => {
  const { t } = useTranslation();
  const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const titleId = `${baseId}-title`;
  const patternId = `${baseId}-back`;
  const transition = { duration: durationMs / 1000, ease: CARD_EASE };

  return (
    <svg
      viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
      role="img"
      aria-labelledby={titleId}
      className="block h-auto w-full"
    >
      <title id={titleId}>{title}</title>
      <defs>
        <pattern
          id={patternId}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="3" height="6" className="fill-card-back-line/40" />
        </pattern>
      </defs>
      {isBeat && (
        <motion.circle
          cx={DECK_X + CARD_WIDTH / 2}
          cy={DECK_Y + CARD_HEIGHT / 2}
          r={48}
          initial={{ opacity: 0.7, scale: 0.6 }}
          animate={{ opacity: 0, scale: 1.8 }}
          transition={{ duration: 0.7 }}
          className="fill-none stroke-gold"
          strokeWidth={2}
        />
      )}
      <AnimatePresence initial={false}>
        {nodes.map((node) => (
          <motion.g
            key={node.id}
            data-zone={node.zone}
            data-kind={node.kind}
            initial={{ opacity: 0, x: node.x, y: node.y, rotate: node.rotation }}
            animate={{ opacity: 1, x: node.x, y: node.y, rotate: node.rotation }}
            exit={{ opacity: 0 }}
            transition={transition}
          >
            <NodeShape
              node={node}
              patternId={patternId}
              perceivedText={
                node.perceivedLabel
                  ? t("visualizer.spectatorThinks", {
                      card: formatCardLabel(node.perceivedLabel).text,
                    })
                  : null
              }
            />
          </motion.g>
        ))}
      </AnimatePresence>
    </svg>
  );
};

const strokeClass = (highlight: THighlight, base: string): string =>
  highlight === "none" ? base : "stroke-gold";
const strokeWidth = (highlight: THighlight): number => (highlight === "none" ? 1 : 2);
const dashArray = (highlight: THighlight): string | undefined =>
  highlight === "perceived" ? "5 3" : undefined;

const NodeShape = ({
  node,
  patternId,
  perceivedText,
}: {
  node: IRenderNode;
  patternId: string;
  perceivedText: string | null;
}) => {
  if (node.kind === "deckBlock") return <DeckBlock patternId={patternId} />;
  const badgeY = node.zone === "buried" ? CARD_HEIGHT + 16 : -10;
  return (
    <>
      {node.face === "up" ? (
        <CardFace label={node.label} highlight={node.highlight} />
      ) : (
        <CardBack patternId={patternId} highlight={node.highlight} />
      )}
      {perceivedText && (
        <text
          x={CARD_WIDTH / 2}
          y={badgeY}
          textAnchor="middle"
          className="fill-gold-2 text-[12px] font-semibold"
        >
          {perceivedText}
        </text>
      )}
    </>
  );
};

const CardFace = ({ label, highlight }: { label: string; highlight: THighlight }) => {
  const card = formatCardLabel(label);
  const inkClass = card.isRed ? "fill-card-red" : "fill-card-ink";
  return (
    <>
      <rect
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        rx={6}
        className={`fill-card-face ${strokeClass(highlight, "stroke-subtle")}`}
        strokeWidth={strokeWidth(highlight)}
        strokeDasharray={dashArray(highlight)}
      />
      <text x={7} y={16} className={`${inkClass} text-[11px] font-bold`}>
        {card.text}
      </text>
      <text
        x={CARD_WIDTH / 2}
        y={CARD_HEIGHT / 2 + 11}
        textAnchor="middle"
        className={`${inkClass} text-[30px] font-bold`}
      >
        {card.suit || card.rank}
      </text>
    </>
  );
};

const CardBack = ({ patternId, highlight }: { patternId: string; highlight: THighlight }) => (
  <>
    <rect
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      rx={6}
      className={`fill-card-back ${strokeClass(highlight, "stroke-line-2")}`}
      strokeWidth={strokeWidth(highlight)}
      strokeDasharray={dashArray(highlight)}
    />
    <rect
      x={5}
      y={5}
      width={CARD_WIDTH - 10}
      height={CARD_HEIGHT - 10}
      rx={4}
      fill={`url(#${patternId})`}
      className="stroke-card-back-line"
      strokeWidth={1}
    />
  </>
);

const DeckBlock = ({ patternId }: { patternId: string }) => (
  <>
    <rect
      x={4}
      y={5}
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      rx={6}
      className="fill-panel-3 stroke-line-2"
      strokeWidth={1}
    />
    <rect
      x={2}
      y={2.5}
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      rx={6}
      className="fill-panel-3 stroke-line-2"
      strokeWidth={1}
    />
    <CardBack patternId={patternId} highlight="none" />
  </>
);
