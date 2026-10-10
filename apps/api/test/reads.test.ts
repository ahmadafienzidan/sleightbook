import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { validateRoutine } from "@sleightbook/engine/timeline";
import { ApiErrorSchema } from "@sleightbook/shared/schemas/error";
import { ItemDetailSchema, ItemSummarySchema } from "@sleightbook/shared/schemas/item";
import { RoutineDetailSchema } from "@sleightbook/shared/schemas/routine";
import {
  TechniqueDetailSchema,
  TechniqueSummarySchema,
} from "@sleightbook/shared/schemas/technique";
import {
  TrickCardSchema,
  TrickDetailSchema,
  TrickSummarySchema,
} from "@sleightbook/shared/schemas/trick";

import { createApp } from "../src/app";
import { seed } from "../src/db/seed";
import { createTestDb, MISSING_ID, TEST_APP_OPTIONS } from "./helpers";

const db = await createTestDb();
const app = createApp(db, TEST_APP_OPTIONS);

beforeAll(async () => {
  await seed(db);
});

afterAll(async () => {
  await db.$client.close();
});

const getJson = async (path: string): Promise<unknown> => {
  const response = await app.request(path);
  expect(response.status).toBe(200);
  return response.json();
};

const errorCodeOf = async (path: string, status: number): Promise<string> => {
  const response = await app.request(path);
  expect(response.status).toBe(status);
  return ApiErrorSchema.parse(await response.json()).error.code;
};

const trickIdBySlug = async (slug: string): Promise<string> => {
  const tricks = TrickSummarySchema.array().parse(await getJson("/api/tricks"));
  const trick = tricks.find((candidate) => candidate.slug === slug);
  if (!trick) throw new Error(`missing ${slug}`);
  return trick.id;
};

const libraryNames = async (search: string): Promise<string[]> =>
  TrickCardSchema.array()
    .parse(await getJson(`/api/library${search}`))
    .map((card) => card.name);

describe("app", () => {
  test("GET /api/health", async () => {
    expect(await getJson("/api/health")).toEqual({ ok: true });
  });

  test("unknown routes return a JSON 404", async () => {
    expect(await errorCodeOf("/api/nope", 404)).toBe("NOT_FOUND");
  });
});

describe("tricks", () => {
  test("lists the six-trick library sorted by name", async () => {
    const tricks = TrickSummarySchema.array().parse(await getJson("/api/tricks"));
    expect(tricks.map((trick) => trick.name)).toEqual([
      "Ambitious Card",
      "Coin Matrix",
      "Oil & Water",
      "Rising Card",
      "Thought Card",
      "Triumph",
    ]);
  });

  test("assembles Ambitious Card with three routines", async () => {
    const trick = TrickDetailSchema.parse(
      await getJson(`/api/tricks/${await trickIdBySlug("ambitious-card")}`),
    );
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

  test("400 for a non-uuid id, 404 for a missing trick", async () => {
    expect(await errorCodeOf("/api/tricks/not-a-uuid", 400)).toBe("VALIDATION");
    expect(await errorCodeOf(`/api/tricks/${MISSING_ID}`, 404)).toBe("NOT_FOUND");
  });
});

describe("library search", () => {
  test("empty query returns every trick as a card", async () => {
    expect(await libraryNames("")).toHaveLength(6);
    const [triumph] = TrickCardSchema.array().parse(await getJson("/api/library?q=triumph"));
    expect(triumph).toMatchObject({ phaseCount: 5, hasVisualization: true });
    expect(triumph?.techniqueNames).toEqual([
      "Packet Turnover",
      "Riffle Shuffle",
      "Spread",
      "Strip-Out Shuffle",
    ]);
  });

  test("matches techniques, items and category labels; every token must match", async () => {
    expect(await libraryNames("?q=elmsley")).toEqual(["Ambitious Card", "Oil & Water"]);
    expect(await libraryNames("?q=THREAD")).toEqual(["Rising Card"]);
    expect(await libraryNames("?q=coin%20magic")).toEqual(["Coin Matrix"]);
    expect(await libraryNames("?q=rises%20elmsley")).toEqual([]);
  });

  test("filters by category", async () => {
    expect(await libraryNames("?category=coin")).toEqual(["Coin Matrix"]);
  });

  test("library rejects a non-boolean favoritesOnly and an unknown category", async () => {
    expect(await errorCodeOf("/api/library?favoritesOnly=maybe", 400)).toBe("VALIDATION");
    expect(await errorCodeOf("/api/library?category=cards", 400)).toBe("VALIDATION");
  });
});

describe("routines", () => {
  test("returns ordered phases, sorted techniques and a valid timeline", async () => {
    const trick = TrickDetailSchema.parse(
      await getJson(`/api/tricks/${await trickIdBySlug("ambitious-card")}`),
    );
    const routine = RoutineDetailSchema.parse(
      await getJson(`/api/routines/${trick.defaultRoutineId}`),
    );
    expect(routine.phases.map((phase) => phase.name)).toEqual([
      "Preparation",
      "Double Lift",
      "Insert",
      "Snap",
      "Fan Reveal",
    ]);
    expect(routine.phases[2]?.techniques.map((technique) => technique.name)).toEqual([
      "Card Insertion",
      "Double Lift",
    ]);
    expect(validateRoutine(routine.phases)).toEqual({ ok: true });
  });

  test("Triumph's Vernon routine lists its items by name", async () => {
    const trick = TrickDetailSchema.parse(
      await getJson(`/api/tricks/${await trickIdBySlug("triumph")}`),
    );
    const vernon = RoutineDetailSchema.parse(
      await getJson(`/api/routines/${trick.defaultRoutineId}`),
    );
    expect(vernon.items.map((item) => item.name)).toEqual(["Close-up mat", "Deck of cards"]);
    expect(validateRoutine(vernon.phases)).toEqual({ ok: true });
  });

  test("404 for a missing routine", async () => {
    expect(await errorCodeOf(`/api/routines/${MISSING_ID}`, 404)).toBe("NOT_FOUND");
  });
});

describe("techniques and items", () => {
  test("technique details list where they are used", async () => {
    const techniques = TechniqueSummarySchema.array().parse(await getJson("/api/techniques"));
    expect(techniques).toHaveLength(12);
    const doubleLift = techniques.find((technique) => technique.name === "Double Lift");
    expect(doubleLift?.usageCount).toBe(2);
    const detail = TechniqueDetailSchema.parse(await getJson(`/api/techniques/${doubleLift?.id}`));
    expect(detail.usedIn.map((usage) => [usage.routineName, usage.phaseNames])).toEqual([
      ["Standard", ["Double Lift", "Insert"]],
      ["Top Change Version", ["Show"]],
    ]);
  });

  test("item details list the routines that need them", async () => {
    const items = ItemSummarySchema.array().parse(await getJson("/api/items"));
    const deck = items.find((item) => item.name === "Deck of cards");
    expect(deck?.usageCount).toBe(7);
    const detail = ItemDetailSchema.parse(await getJson(`/api/items/${deck?.id}`));
    expect(detail.usedIn[0]).toMatchObject({ trickName: "Ambitious Card", phaseNames: [] });
  });

  test("404 for missing techniques and items", async () => {
    expect(await errorCodeOf(`/api/techniques/${MISSING_ID}`, 404)).toBe("NOT_FOUND");
    expect(await errorCodeOf(`/api/items/${MISSING_ID}`, 404)).toBe("NOT_FOUND");
  });
});
