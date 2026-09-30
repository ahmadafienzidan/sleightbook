import type { IFormattedCard } from "../types/card.types";

const SUITS: Record<string, { symbol: string; isRed: boolean }> = {
  S: { symbol: "♠", isRed: false },
  H: { symbol: "♥", isRed: true },
  D: { symbol: "♦", isRed: true },
  C: { symbol: "♣", isRed: false },
};

export const formatCardLabel = (label: string): IFormattedCard => {
  const suit = label.length >= 2 ? SUITS[label.slice(-1)] : undefined;
  if (!suit) return { rank: label, suit: "", isRed: false, text: label };
  const rank = label.slice(0, -1);
  return { rank, suit: suit.symbol, isRed: suit.isRed, text: `${rank}${suit.symbol}` };
};

export const formatSpeed = (speed: number): string => `${speed.toFixed(2).replace(/0$/, "")}×`;
