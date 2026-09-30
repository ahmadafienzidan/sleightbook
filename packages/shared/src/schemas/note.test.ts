import { describe, expect, test } from "bun:test";

import { CreateNoteSchema, UpdateNoteSchema } from "./note";

const ID_A = "00000000-0000-4000-8000-000000000001";
const ID_B = "00000000-0000-4000-8000-000000000002";

describe("CreateNoteSchema", () => {
  test("accepts exactly one target", () => {
    expect(CreateNoteSchema.safeParse({ body: "Slow down", phaseId: ID_A }).success).toBe(true);
    expect(CreateNoteSchema.safeParse({ body: "Slow down", trickId: ID_A }).success).toBe(true);
  });

  test("trims the body", () => {
    expect(CreateNoteSchema.parse({ body: "  Keep the break small  ", trickId: ID_A }).body).toBe(
      "Keep the break small",
    );
  });

  test("rejects zero targets", () => {
    expect(CreateNoteSchema.safeParse({ body: "Orphan" }).success).toBe(false);
  });

  test("rejects two targets", () => {
    expect(CreateNoteSchema.safeParse({ body: "Both", trickId: ID_A, phaseId: ID_B }).success).toBe(
      false,
    );
  });

  test("rejects blank body and non-uuid target", () => {
    expect(CreateNoteSchema.safeParse({ body: "   ", trickId: ID_A }).success).toBe(false);
    expect(CreateNoteSchema.safeParse({ body: "x", trickId: "abc" }).success).toBe(false);
  });

  test("rejects unknown keys", () => {
    expect(CreateNoteSchema.safeParse({ body: "x", trickId: ID_A, userId: ID_B }).success).toBe(
      false,
    );
  });
});

describe("UpdateNoteSchema", () => {
  test("accepts a body and rejects extra keys", () => {
    expect(UpdateNoteSchema.safeParse({ body: "Edited" }).success).toBe(true);
    expect(UpdateNoteSchema.safeParse({ body: "Edited", phaseId: ID_A }).success).toBe(false);
  });
});
