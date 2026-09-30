import { describe, expect, test } from "bun:test";

import { ItemDetailSchema } from "./item";
import { TechniqueDetailSchema } from "./technique";
import { LibraryQuerySchema, TrickCardSchema } from "./trick";

const ID = "00000000-0000-4000-8000-000000000001";

describe("LibraryQuerySchema", () => {
  test("fills defaults", () => {
    expect(LibraryQuerySchema.parse({})).toEqual({ q: "", category: "all", favoritesOnly: false });
  });

  test("rejects unknown categories", () => {
    expect(LibraryQuerySchema.safeParse({ category: "cards" }).success).toBe(false);
  });
});

describe("DTO schemas", () => {
  test("TrickCardSchema", () => {
    const card = {
      id: ID,
      name: "Triumph",
      slug: "triumph",
      category: "card",
      difficulty: "intermediate",
      isFavorite: false,
      description: "",
      durationMin: 4,
      durationMax: 6,
      phaseCount: 5,
      techniqueNames: ["Packet Turnover"],
      hasVisualization: true,
    };
    expect(TrickCardSchema.parse(card).phaseCount).toBe(5);
  });

  test("TechniqueDetailSchema and ItemDetailSchema carry usages and notes", () => {
    const usage = {
      trickId: ID,
      trickName: "Triumph",
      routineId: ID,
      routineName: "Vernon",
      phaseNames: ["Cut & Turn"],
    };
    expect(
      TechniqueDetailSchema.parse({
        id: ID,
        name: "Packet Turnover",
        description: "",
        difficulty: "intermediate",
        category: "Control",
        tips: [],
        commonMistakes: [],
        usedIn: [usage],
        notes: [],
      }).usedIn,
    ).toHaveLength(1);
    expect(
      ItemDetailSchema.parse({
        id: ID,
        kind: "prop",
        name: "Deck of cards",
        description: "",
        setupNotes: "",
        usedIn: [{ ...usage, phaseNames: [] }],
        notes: [],
      }).kind,
    ).toBe("prop");
  });
});
