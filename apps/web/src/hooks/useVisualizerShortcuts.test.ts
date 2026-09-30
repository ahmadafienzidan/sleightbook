import { describe, expect, test } from "bun:test";

import { getShortcutAction } from "./useVisualizerShortcuts";

interface IFakeElementDescriptor {
  tag: string;
  type?: string;
}

// Interprets just enough of CSS selector syntax to drive the four scenarios the
// brief calls out: a bare tag name, and `input:not([type='...']):not([type='...'])`.
const matchesSelectorPart = (descriptor: IFakeElementDescriptor, part: string): boolean => {
  if (part === "[contenteditable='true']") return false;
  const notMatches = [...part.matchAll(/:not\(\[type='([^']+)'\]\)/g)].map((match) => match[1]);
  if (notMatches.length > 0) {
    const baseTag = part.split(":")[0];
    return descriptor.tag === baseTag && !notMatches.includes(descriptor.type ?? "");
  }
  return descriptor.tag === part;
};

const fakeTarget = (descriptor: IFakeElementDescriptor) => ({
  closest: (selector: string) =>
    selector.split(",").some((part) => matchesSelectorPart(descriptor, part.trim())) ? {} : null,
});

describe("getShortcutAction", () => {
  test("plain div: all four keys act", () => {
    const target = fakeTarget({ tag: "div" });
    expect(getShortcutAction(" ", target)).toBe("togglePlay");
    expect(getShortcutAction("ArrowLeft", target)).toBe("prev");
    expect(getShortcutAction("ArrowRight", target)).toBe("next");
    expect(getShortcutAction("s", target)).toBe("toggleView");
    expect(getShortcutAction("S", target)).toBe("toggleView");
  });

  test("button: Space ignored, arrows act, S acts", () => {
    const target = fakeTarget({ tag: "button" });
    expect(getShortcutAction(" ", target)).toBeNull();
    expect(getShortcutAction("ArrowLeft", target)).toBe("prev");
    expect(getShortcutAction("ArrowRight", target)).toBe("next");
    expect(getShortcutAction("s", target)).toBe("toggleView");
  });

  test("textarea: all keys ignored", () => {
    const target = fakeTarget({ tag: "textarea" });
    expect(getShortcutAction(" ", target)).toBeNull();
    expect(getShortcutAction("ArrowLeft", target)).toBeNull();
    expect(getShortcutAction("ArrowRight", target)).toBeNull();
    expect(getShortcutAction("s", target)).toBeNull();
  });

  test("input[type=range]: Space ignored, arrows ignored, S acts", () => {
    const target = fakeTarget({ tag: "input", type: "range" });
    expect(getShortcutAction(" ", target)).toBeNull();
    expect(getShortcutAction("ArrowLeft", target)).toBeNull();
    expect(getShortcutAction("ArrowRight", target)).toBeNull();
    expect(getShortcutAction("s", target)).toBe("toggleView");
  });

  test("null target: all four keys act", () => {
    expect(getShortcutAction(" ", null)).toBe("togglePlay");
    expect(getShortcutAction("ArrowLeft", null)).toBe("prev");
    expect(getShortcutAction("s", null)).toBe("toggleView");
  });

  test("unrecognized key returns null", () => {
    expect(getShortcutAction("Enter", fakeTarget({ tag: "div" }))).toBeNull();
  });
});
