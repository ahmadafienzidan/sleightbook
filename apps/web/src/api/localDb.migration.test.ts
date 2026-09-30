import { describe, expect, spyOn, test } from "bun:test";

import { AMBITIOUS_CARD } from "@sleightbook/shared/fixtures/ambitiousCard";

import { createLocalDb, DB_STORAGE_KEY, LEGACY_STORAGE_KEY } from "./localDb";
import { createMemoryStorage } from "./storage";

const NOW = "2026-09-26T00:00:00.000Z";
const OLD = "2026-09-20T10:00:00.000Z";
const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

const note = (id: number, body: string, target: { trickId?: string; phaseId?: string }) => ({
  id: uuid(id),
  body,
  trickId: target.trickId ?? null,
  routineId: null,
  phaseId: target.phaseId ?? null,
  techniqueId: null,
  itemId: null,
  createdAt: OLD,
  updatedAt: OLD,
});

const V1 = {
  version: 1,
  tricks: [
    {
      id: uuid(900),
      slug: "ambitious-card",
      isFavorite: true,
      defaultRoutineId: uuid(901),
      notes: [
        note(910, AMBITIOUS_CARD.trickNote, { trickId: uuid(900) }),
        note(911, "Old trick note", { trickId: uuid(900) }),
      ],
    },
  ],
  routines: [
    {
      id: uuid(901),
      phases: [{ position: 2, notes: [note(912, "Old insert note", { phaseId: uuid(950) })] }],
    },
  ],
};

const makeDb = (storage = createMemoryStorage()) => {
  let counter = 0;
  return createLocalDb({
    storage,
    newId: () => {
      counter += 1;
      return uuid(counter);
    },
    now: () => NOW,
  });
};

describe("v1 → v2 migration", () => {
  test("carries favorite, trick notes and phase notes into v2", () => {
    const storage = createMemoryStorage();
    storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(V1));
    const db = makeDb(storage);
    const ambitiousId = db.searchTricks({ q: "ambitious" })[0]?.id ?? "";
    const trick = db.getTrick(ambitiousId);

    expect(trick.isFavorite).toBe(true);
    // Notes are ordered by createdAt: the migrated note (Sept 20) precedes the seed note (Sept 26).
    expect(trick.notes.map((entry) => entry.body)).toEqual([
      "Old trick note",
      AMBITIOUS_CARD.trickNote,
    ]);
    const insert = db.getRoutine(trick.defaultRoutineId ?? "").phases[2];
    expect(insert?.notes.map((entry) => entry.body)).toEqual(["Old insert note"]);
    expect(insert?.notes[0]?.createdAt).toBe(OLD);

    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(`${LEGACY_STORAGE_KEY}.migrated`)).toBe(JSON.stringify(V1));
    expect(storage.getItem(DB_STORAGE_KEY)).not.toBeNull();
  });

  test("migration runs once", () => {
    const storage = createMemoryStorage();
    storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(V1));
    makeDb(storage).listTricks();
    const db = makeDb(storage);
    const trick = db.getTrick(db.searchTricks({ q: "ambitious" })[0]?.id ?? "");
    expect(trick.notes).toHaveLength(2);
  });

  test("unreadable v1 data is backed up and removed", () => {
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    const storage = createMemoryStorage();
    storage.setItem(LEGACY_STORAGE_KEY, "{broken");
    expect(makeDb(storage).listTricks()).toHaveLength(6);
    expect(storage.getItem(`${LEGACY_STORAGE_KEY}.backup-${NOW}`)).toBe("{broken");
    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
