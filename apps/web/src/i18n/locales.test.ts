import { expect, test } from "bun:test";

import en from "./locales/en.json";
import id from "./locales/id.json";

const flattenKeys = (value: unknown, prefix = ""): string[] => {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
};

test("en and id locales have identical keys", () => {
  expect(flattenKeys(id).sort()).toEqual(flattenKeys(en).sort());
});
