import { describe, expect, test } from "bun:test";

import { removeById, upsertById } from "./list";

describe("list helpers", () => {
  const list = [
    { id: "a", value: 1 },
    { id: "b", value: 2 },
  ];

  test("upsertById replaces an existing item in place", () => {
    expect(upsertById(list, { id: "a", value: 9 })).toEqual([
      { id: "a", value: 9 },
      { id: "b", value: 2 },
    ]);
  });

  test("upsertById appends a new item", () => {
    expect(upsertById(list, { id: "c", value: 3 })).toHaveLength(3);
  });

  test("removeById removes and does not mutate", () => {
    expect(removeById(list, "a")).toEqual([{ id: "b", value: 2 }]);
    expect(list).toHaveLength(2);
  });
});
