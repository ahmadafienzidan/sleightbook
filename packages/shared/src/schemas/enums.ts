export const CATEGORIES = ["card", "coin", "mentalism", "gimmick"] as const;
export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export const ITEM_KINDS = ["prop", "gimmick"] as const;

export type TCategory = (typeof CATEGORIES)[number];
export type TDifficulty = (typeof DIFFICULTIES)[number];
export type TItemKind = (typeof ITEM_KINDS)[number];
