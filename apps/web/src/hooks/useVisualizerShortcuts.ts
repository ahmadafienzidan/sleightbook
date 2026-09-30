import { useEffect } from "react";

import { usePlayerStore } from "../store/usePlayer";

export type TShortcutAction = "togglePlay" | "prev" | "next" | "toggleView" | null;

interface IClosestTarget {
  closest(selector: string): unknown;
}

// Space: native activation already handles buttons/links, so ignore inside those
// (avoids double-toggling Play) as well as inside any text-entry control.
const SPACE_IGNORE_SELECTOR = "input, textarea, select, button, a, [contenteditable='true']";
// Arrows: only text-entry controls need them (a range input uses arrows itself).
const ARROW_IGNORE_SELECTOR = "input, textarea, select, [contenteditable='true']";
// S: only ignore inside actual text entry; a range/checkbox input doesn't consume "s".
const TOGGLE_VIEW_IGNORE_SELECTOR =
  "textarea, select, [contenteditable='true'], input:not([type='range']):not([type='checkbox'])";

const isInside = (target: IClosestTarget | null, selector: string): boolean =>
  target !== null && target.closest(selector) !== null;

export const getShortcutAction = (key: string, target: IClosestTarget | null): TShortcutAction => {
  switch (key) {
    case " ":
      return isInside(target, SPACE_IGNORE_SELECTOR) ? null : "togglePlay";
    case "ArrowLeft":
      return isInside(target, ARROW_IGNORE_SELECTOR) ? null : "prev";
    case "ArrowRight":
      return isInside(target, ARROW_IGNORE_SELECTOR) ? null : "next";
    case "s":
    case "S":
      return isInside(target, TOGGLE_VIEW_IGNORE_SELECTOR) ? null : "toggleView";
    default:
      return null;
  }
};

export const useVisualizerShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const action = getShortcutAction(event.key, target);
      if (action === null) return;
      const player = usePlayerStore.getState();
      switch (action) {
        case "togglePlay":
          event.preventDefault();
          player.togglePlay();
          break;
        case "prev":
          player.prev();
          break;
        case "next":
          player.next();
          break;
        case "toggleView":
          player.toggleView();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
};
