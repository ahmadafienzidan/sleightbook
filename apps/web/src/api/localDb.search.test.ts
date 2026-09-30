import { describe, expect, test } from "bun:test";

import { ApiError } from "./apiError";
import { createLocalDb } from "./localDb";
import { createMemoryStorage } from "./storage";

const makeDb = () => {
  let counter = 0;
  return createLocalDb({
    storage: createMemoryStorage(),
    newId: () => {
      counter += 1;
      return `00000000-0000-4000-8000-${counter.toString(16).padStart(12, "0")}`;
    },
    now: () => "2026-09-26T00:00:00.000Z",
  });
};

const names = (
  db: ReturnType<typeof makeDb>,
  query: Parameters<ReturnType<typeof makeDb>["searchTricks"]>[0],
) => db.searchTricks(query).map((card) => card.name);

describe("searchTricks", () => {
  test("empty query returns every trick sorted by name, as cards", () => {
    const db = makeDb();
    expect(names(db, {})).toEqual([
      "Ambitious Card",
      "Coin Matrix",
      "Oil & Water",
      "Rising Card",
      "Thought Card",
      "Triumph",
    ]);
    const triumph = db.searchTricks({ q: "triumph" })[0];
    expect(triumph).toMatchObject({ phaseCount: 5, hasVisualization: true });
    expect(triumph?.techniqueNames).toEqual([
      "Packet Turnover",
      "Riffle Shuffle",
      "Spread",
      "Strip-Out Shuffle",
    ]);
  });

  test("matches technique names across all routines", () => {
    expect(names(makeDb(), { q: "elmsley" })).toEqual(["Ambitious Card", "Oil & Water"]);
  });

  test("matches item names, category labels and is case-insensitive", () => {
    const db = makeDb();
    expect(names(db, { q: "THREAD" })).toEqual(["Rising Card"]);
    expect(names(db, { q: "coin magic" })).toEqual(["Coin Matrix"]);
  });

  test("every token must match", () => {
    expect(names(makeDb(), { q: "rises command" })).toEqual(["Rising Card"]);
    expect(names(makeDb(), { q: "rises elmsley" })).toEqual([]);
  });

  test("matches note text on the trick and its phases", () => {
    const db = makeDb();
    const triumphId = db.searchTricks({ q: "triumph" })[0]?.id ?? "";
    const phaseId =
      db.getRoutine(db.getTrick(triumphId).defaultRoutineId ?? "").phases[1]?.id ?? "";
    db.createNote({ body: "Shaky hands on the turnover", phaseId });
    expect(names(db, { q: "shaky" })).toEqual(["Triumph"]);
  });

  test("filters by category and favorites", () => {
    const db = makeDb();
    expect(names(db, { category: "coin" })).toEqual(["Coin Matrix"]);
    const triumphId = db.searchTricks({ q: "triumph" })[0]?.id ?? "";
    db.setFavorite(triumphId, true);
    expect(names(db, { favoritesOnly: true })).toEqual(["Triumph"]);
  });

  test("rejects invalid queries", () => {
    try {
      makeDb().searchTricks({ category: "cards" as "card" });
      throw new Error("expected ApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(400);
    }
  });
});
