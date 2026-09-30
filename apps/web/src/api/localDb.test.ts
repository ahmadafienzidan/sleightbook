import { describe, expect, spyOn, test } from "bun:test";

import { validateRoutine } from "@sleightbook/engine/timeline";

import { ApiError } from "./apiError";
import { createLocalDb, DB_STORAGE_KEY } from "./localDb";
import { createMemoryStorage, type IStorageLike } from "./storage";

const NOW = "2026-09-26T00:00:00.000Z";
const MISSING_ID = "00000000-0000-4000-8000-00000000ffff";

const makeIdFactory = () => {
  let counter = 0;
  return () => {
    counter += 1;
    return `00000000-0000-4000-8000-${counter.toString(16).padStart(12, "0")}`;
  };
};

const makeDb = (storage: IStorageLike = createMemoryStorage()) =>
  createLocalDb({ storage, newId: makeIdFactory(), now: () => NOW });

const errorOf = (fn: () => unknown): ApiError | null => {
  try {
    fn();
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  return null;
};

const trickIdBySlug = (db: ReturnType<typeof makeDb>, slug: string): string => {
  const trick = db.listTricks().find((candidate) => candidate.slug === slug);
  if (!trick) throw new Error(`missing ${slug}`);
  return trick.id;
};

describe("localDb v2", () => {
  test("seeds the six-trick library", () => {
    expect(
      makeDb()
        .listTricks()
        .map((trick) => trick.name),
    ).toEqual([
      "Ambitious Card",
      "Coin Matrix",
      "Oil & Water",
      "Rising Card",
      "Thought Card",
      "Triumph",
    ]);
  });

  test("assembles Ambitious Card with three routines", () => {
    const db = makeDb();
    const trick = db.getTrick(trickIdBySlug(db, "ambitious-card"));
    expect(
      trick.routines.map((routine) => [routine.name, routine.isDefault, routine.hasVisualization]),
    ).toEqual([
      ["Standard", true, true],
      ["Elmsley Version", false, false],
      ["Top Change Version", false, false],
    ]);
    expect(trick.defaultRoutineId).toBe(trick.routines[0]?.id ?? null);
    expect(trick.items.map((item) => item.name)).toEqual(["Deck of cards"]);
    expect(trick.notes).toHaveLength(1);
  });

  test("routine details carry items, ordered phases and sorted techniques", () => {
    const db = makeDb();
    const standard = db.getRoutine(
      db.getTrick(trickIdBySlug(db, "ambitious-card")).defaultRoutineId ?? "",
    );
    expect(standard.phases.map((phase) => phase.name)).toEqual([
      "Preparation",
      "Double Lift",
      "Insert",
      "Snap",
      "Fan Reveal",
    ]);
    expect(standard.phases[2]?.techniques.map((technique) => technique.name)).toEqual([
      "Card Insertion",
      "Double Lift",
    ]);
    expect(standard.items.map((item) => item.name)).toEqual(["Deck of cards"]);
    expect(validateRoutine(standard.phases)).toEqual({ ok: true });

    const vernon = db.getRoutine(db.getTrick(trickIdBySlug(db, "triumph")).defaultRoutineId ?? "");
    expect(vernon.items.map((item) => item.name)).toEqual(["Close-up mat", "Deck of cards"]);
    expect(validateRoutine(vernon.phases)).toEqual({ ok: true });
  });

  test("technique details list where they are used", () => {
    const db = makeDb();
    const techniques = db.listTechniques();
    expect(techniques).toHaveLength(12);
    const doubleLift = techniques.find((technique) => technique.name === "Double Lift");
    expect(doubleLift?.usageCount).toBe(2);
    const detail = db.getTechnique(doubleLift?.id ?? "");
    expect(detail.usedIn).toEqual([
      expect.objectContaining({
        trickName: "Ambitious Card",
        routineName: "Standard",
        phaseNames: ["Double Lift", "Insert"],
      }),
      expect.objectContaining({
        trickName: "Ambitious Card",
        routineName: "Top Change Version",
        phaseNames: ["Show"],
      }),
    ]);
  });

  test("item details list the routines that need them", () => {
    const db = makeDb();
    const deck = db.listItems().find((item) => item.name === "Deck of cards");
    expect(deck?.usageCount).toBe(7);
    expect(db.getItem(deck?.id ?? "").usedIn[0]).toMatchObject({
      trickName: "Ambitious Card",
      phaseNames: [],
    });
  });

  test("favorites persist across instances sharing storage", () => {
    const storage = createMemoryStorage();
    const first = makeDb(storage);
    const id = trickIdBySlug(first, "triumph");
    first.setFavorite(id, true);
    expect(makeDb(storage).getTrick(id).isFavorite).toBe(true);
  });

  test("notes on tricks, phases, techniques and items", () => {
    const db = makeDb();
    const trick = db.getTrick(trickIdBySlug(db, "triumph"));
    const routine = db.getRoutine(trick.defaultRoutineId ?? "");
    const phaseId = routine.phases[2]?.id ?? "";
    const techniqueId = db.listTechniques()[0]?.id ?? "";
    const itemId = db.listItems()[0]?.id ?? "";

    const trickNote = db.createNote({ body: "Trick note", trickId: trick.id });
    const phaseNote = db.createNote({ body: " Phase note ", phaseId });
    const techniqueNote = db.createNote({ body: "Technique note", techniqueId });
    const itemNote = db.createNote({ body: "Item note", itemId });

    expect(db.getTrick(trick.id).notes.map((note) => note.id)).toEqual([trickNote.id]);
    expect(db.getRoutine(routine.id).phases[2]?.notes.map((note) => note.body)).toEqual([
      "Phase note",
    ]);
    expect(db.getTechnique(techniqueId).notes.map((note) => note.id)).toEqual([techniqueNote.id]);
    expect(db.getItem(itemId).notes.map((note) => note.id)).toEqual([itemNote.id]);

    expect(db.updateNote(phaseNote.id, "Edited").body).toBe("Edited");
    db.deleteNote(itemNote.id);
    expect(db.getItem(itemId).notes).toEqual([]);
  });

  test("errors: 404 missing, 400 invalid, 400 NOT_SUPPORTED for routine notes", () => {
    const db = makeDb();
    const trickId = trickIdBySlug(db, "triumph");
    const routineId = db.getTrick(trickId).defaultRoutineId ?? "";
    expect(errorOf(() => db.getTrick(MISSING_ID))?.status).toBe(404);
    expect(errorOf(() => db.getRoutine(MISSING_ID))?.status).toBe(404);
    expect(errorOf(() => db.getTechnique(MISSING_ID))?.status).toBe(404);
    expect(errorOf(() => db.getItem(MISSING_ID))?.status).toBe(404);
    expect(errorOf(() => db.setFavorite(MISSING_ID, true))?.status).toBe(404);
    expect(errorOf(() => db.updateNote(MISSING_ID, "x"))?.status).toBe(404);
    expect(errorOf(() => db.deleteNote(MISSING_ID))?.status).toBe(404);
    expect(errorOf(() => db.createNote({ body: "ghost", techniqueId: MISSING_ID }))?.status).toBe(
      404,
    );
    expect(errorOf(() => db.createNote({ body: "  ", trickId }))?.status).toBe(400);
    expect(errorOf(() => db.createNote({ body: "routine", routineId }))?.code).toBe(
      "NOT_SUPPORTED",
    );
  });

  test("backs up and reseeds unreadable v2 data", () => {
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    const storage = createMemoryStorage();
    storage.setItem(DB_STORAGE_KEY, "{not json");
    expect(makeDb(storage).listTricks()).toHaveLength(6);
    expect(storage.getItem(`${DB_STORAGE_KEY}.backup-${NOW}`)).toBe("{not json");
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  test("returns copies, not live references", () => {
    const db = makeDb();
    const id = trickIdBySlug(db, "ambitious-card");
    db.getTrick(id).notes.length = 0;
    expect(db.getTrick(id).notes).toHaveLength(1);
  });
});
