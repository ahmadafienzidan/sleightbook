export const upsertById = <T extends { id: string }>(list: readonly T[], item: T): T[] =>
  list.some((entry) => entry.id === item.id)
    ? list.map((entry) => (entry.id === item.id ? item : entry))
    : [...list, item];

export const removeById = <T extends { id: string }>(list: readonly T[], id: string): T[] =>
  list.filter((entry) => entry.id !== id);
