import { afterAll, beforeEach, describe, expect, test } from "bun:test";

import { ApiErrorSchema } from "@sleightbook/shared/schemas/error";
import { ItemDetailSchema, ItemSummarySchema } from "@sleightbook/shared/schemas/item";
import { NoteSchema } from "@sleightbook/shared/schemas/note";
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
import { createTestDb, jsonInit, MISSING_ID, TEST_APP_OPTIONS } from "./helpers";

const db = await createTestDb();
const app = createApp(db, TEST_APP_OPTIONS);

beforeEach(async () => {
  await seed(db);
});

afterAll(async () => {
  await db.$client.close();
});

const getJson = async (path: string): Promise<unknown> => (await app.request(path)).json();

const send = async (method: string, path: string, body?: unknown): Promise<Response> =>
  app.request(path, body === undefined ? { method } : jsonInit(method, body));

const errorCode = async (response: Response): Promise<string> =>
  ApiErrorSchema.parse(await response.json()).error.code;

const getTriumph = async () => {
  const tricks = TrickSummarySchema.array().parse(await getJson("/api/tricks"));
  const id = tricks.find((trick) => trick.slug === "triumph")?.id;
  const trick = TrickDetailSchema.parse(await getJson(`/api/tricks/${id}`));
  const routine = RoutineDetailSchema.parse(
    await getJson(`/api/routines/${trick.defaultRoutineId}`),
  );
  return { trick, routine };
};

const createNote = async (payload: Record<string, unknown>) => {
  const response = await send("POST", "/api/notes", payload);
  expect(response.status).toBe(201);
  return NoteSchema.parse(await response.json());
};

describe("PATCH /api/tricks/:id", () => {
  test("sets and persists the favorite flag, and favoritesOnly filters on it", async () => {
    const { trick } = await getTriumph();
    const response = await send("PATCH", `/api/tricks/${trick.id}`, { isFavorite: true });
    expect(response.status).toBe(200);
    expect(TrickDetailSchema.parse(await response.json()).isFavorite).toBe(true);
    expect(TrickDetailSchema.parse(await getJson(`/api/tricks/${trick.id}`)).isFavorite).toBe(true);

    const favorites = TrickCardSchema.array().parse(
      await getJson("/api/library?favoritesOnly=true"),
    );
    expect(favorites.map((card) => card.name)).toEqual(["Triumph"]);
  });

  test("400 for unknown fields, 404 for a missing trick", async () => {
    const { trick } = await getTriumph();
    expect((await send("PATCH", `/api/tricks/${trick.id}`, { name: "Hacked" })).status).toBe(400);
    expect((await send("PATCH", `/api/tricks/${MISSING_ID}`, { isFavorite: true })).status).toBe(
      404,
    );
  });
});

describe("notes", () => {
  test("notes on tricks, phases, techniques and items show up on their owners", async () => {
    const { trick, routine } = await getTriumph();
    const phaseId = routine.phases[2]?.id;
    const [technique] = TechniqueSummarySchema.array().parse(await getJson("/api/techniques"));
    const [item] = ItemSummarySchema.array().parse(await getJson("/api/items"));

    const trickNote = await createNote({ body: "Trick note", trickId: trick.id });
    await createNote({ body: "Phase note", phaseId });
    const techniqueNote = await createNote({ body: "Technique note", techniqueId: technique?.id });
    const itemNote = await createNote({ body: "Item note", itemId: item?.id });

    expect(
      TrickDetailSchema.parse(await getJson(`/api/tricks/${trick.id}`)).notes.map((n) => n.id),
    ).toEqual([trickNote.id]);
    const reread = RoutineDetailSchema.parse(await getJson(`/api/routines/${routine.id}`));
    expect(reread.phases[2]?.notes.map((note) => note.body)).toEqual(["Phase note"]);
    const techniqueDetail = TechniqueDetailSchema.parse(
      await getJson(`/api/techniques/${technique?.id}`),
    );
    expect(techniqueDetail.notes.map((note) => note.id)).toEqual([techniqueNote.id]);
    const itemDetail = ItemDetailSchema.parse(await getJson(`/api/items/${item?.id}`));
    expect(itemDetail.notes.map((note) => note.id)).toEqual([itemNote.id]);
  });

  test("search finds text from a note created through the API", async () => {
    const { routine } = await getTriumph();
    await createNote({ body: "Shaky hands on the turnover", phaseId: routine.phases[1]?.id });
    const cards = TrickCardSchema.array().parse(await getJson("/api/library?q=shaky"));
    expect(cards.map((card) => card.name)).toEqual(["Triumph"]);
  });

  test("trims the body and rejects blank bodies", async () => {
    const { trick } = await getTriumph();
    expect((await createNote({ body: "  Padded  ", trickId: trick.id })).body).toBe("Padded");
    const blank = await send("POST", "/api/notes", { body: "   ", trickId: trick.id });
    expect(blank.status).toBe(400);
    expect(await errorCode(blank)).toBe("VALIDATION");
  });

  test("400 for zero or two targets, 400 NOT_SUPPORTED for routine notes", async () => {
    const { trick, routine } = await getTriumph();
    expect((await send("POST", "/api/notes", { body: "orphan" })).status).toBe(400);
    expect(
      (
        await send("POST", "/api/notes", {
          body: "both",
          trickId: trick.id,
          phaseId: routine.phases[0]?.id,
        })
      ).status,
    ).toBe(400);
    const routineNote = await send("POST", "/api/notes", { body: "r", routineId: routine.id });
    expect(routineNote.status).toBe(400);
    expect(await errorCode(routineNote)).toBe("NOT_SUPPORTED");
  });

  test("malformed JSON is a 400 VALIDATION, not a 500", async () => {
    const response = await app.request("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad",
    });
    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe("VALIDATION");
  });

  test("404 when the target does not exist", async () => {
    const response = await send("POST", "/api/notes", { body: "ghost", techniqueId: MISSING_ID });
    expect(response.status).toBe(404);
  });

  test("updates the body and bumps updatedAt", async () => {
    const { trick } = await getTriumph();
    const created = await createNote({ body: "Draft", trickId: trick.id });
    const response = await send("PATCH", `/api/notes/${created.id}`, { body: "Final" });
    expect(response.status).toBe(200);
    const updated = NoteSchema.parse(await response.json());
    expect(updated.body).toBe("Final");
    expect(updated.updatedAt >= created.updatedAt).toBe(true);
    expect((await send("PATCH", `/api/notes/${MISSING_ID}`, { body: "x" })).status).toBe(404);
  });

  test("deleting twice returns 404 the second time", async () => {
    const { trick } = await getTriumph();
    const created = await createNote({ body: "Temp", trickId: trick.id });
    expect((await send("DELETE", `/api/notes/${created.id}`)).status).toBe(204);
    expect(TrickDetailSchema.parse(await getJson(`/api/tricks/${trick.id}`)).notes).toEqual([]);
    expect((await send("DELETE", `/api/notes/${created.id}`)).status).toBe(404);
  });
});
