import { describe, expect, test } from "bun:test";

import { ApiError } from "./apiError";
import { createHttpDb } from "./httpDb";

const BASE = "http://api.test/api";
const TRICK_ID = "00000000-0000-4000-8000-000000000010";
const NOTE_ID = "00000000-0000-4000-8000-000000000020";

const TRICK_DETAIL = {
  id: TRICK_ID,
  name: "Triumph",
  slug: "triumph",
  category: "card",
  difficulty: "intermediate",
  isFavorite: true,
  description: "",
  durationMin: 3,
  durationMax: 5,
  items: [],
  routines: [],
  defaultRoutineId: null,
  notes: [],
};

const NOTE = {
  id: NOTE_ID,
  body: "Hello",
  trickId: TRICK_ID,
  routineId: null,
  phaseId: null,
  techniqueId: null,
  itemId: null,
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z",
};

interface ICall {
  url: string;
  method: string;
  body: unknown;
}

const fakeFetch = (respond: (call: ICall) => Response) => {
  const calls: ICall[] = [];
  const fetchFn = async (input: string | URL | Request, init?: RequestInit) => {
    const call = {
      url: String(input),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    return respond(call);
  };
  return { calls, fetchFn: fetchFn as typeof fetch };
};

const json = (body: unknown, status = 200) => Response.json(body, { status });

describe("createHttpDb", () => {
  test("reads tricks from the api and validates the response", async () => {
    const { calls, fetchFn } = fakeFetch(() => json(TRICK_DETAIL));
    const db = createHttpDb(BASE, fetchFn);
    expect((await db.getTrick(TRICK_ID)).name).toBe("Triumph");
    expect(calls).toEqual([{ url: `${BASE}/tricks/${TRICK_ID}`, method: "GET", body: undefined }]);
  });

  test("sends favorites and notes as JSON with the right method", async () => {
    const { calls, fetchFn } = fakeFetch((call) =>
      call.url.includes("/notes")
        ? json(NOTE, call.method === "POST" ? 201 : 200)
        : json(TRICK_DETAIL),
    );
    const db = createHttpDb(BASE, fetchFn);
    await db.setFavorite(TRICK_ID, true);
    await db.createNote({ body: "Hello", trickId: TRICK_ID });
    await db.updateNote(NOTE_ID, "Edited");
    expect(calls.map((call) => [call.method, call.url, call.body])).toEqual([
      ["PATCH", `${BASE}/tricks/${TRICK_ID}`, { isFavorite: true }],
      ["POST", `${BASE}/notes`, { body: "Hello", trickId: TRICK_ID }],
      ["PATCH", `${BASE}/notes/${NOTE_ID}`, { body: "Edited" }],
    ]);
  });

  test("deleting a note accepts an empty 204", async () => {
    const { calls, fetchFn } = fakeFetch(() => new Response(null, { status: 204 }));
    await createHttpDb(BASE, fetchFn).deleteNote(NOTE_ID);
    expect(calls[0]?.method).toBe("DELETE");
  });

  test("turns error bodies into ApiError with the api's status and code", async () => {
    const { fetchFn } = fakeFetch(() =>
      json({ error: { code: "NOT_FOUND", message: "Trick not found" } }, 404),
    );
    const error = await createHttpDb(BASE, fetchFn)
      .getTrick(TRICK_ID)
      .catch((rejection: unknown) => rejection);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: "NOT_FOUND", message: "Trick not found" });
  });

  test("rejects a response that does not match the contract", async () => {
    const { fetchFn } = fakeFetch(() => json({ id: "nope" }));
    await expect(createHttpDb(BASE, fetchFn).getTrick(TRICK_ID)).rejects.toThrow();
  });
});
