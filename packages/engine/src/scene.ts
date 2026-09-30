import type { TAction } from "@sleightbook/shared/schemas/action";

import { EngineError } from "./errors";
import { applyPacketAction, setupPackets, type TStepAction } from "./packets";
import type { ICard, ISceneState, TFace, TScene } from "./types";

type TSetupParams = Extract<TAction, { type: "setupDeck" }>["params"];

export const createEmptyScene = (): ISceneState => ({
  kind: "deck",
  cards: {},
  deck: [],
  restCount: 0,
  lifted: null,
  hand: [],
  buried: [],
  jogged: null,
  spread: false,
  beat: false,
});

const flipFace = (face: TFace): TFace => (face === "up" ? "down" : "up");

const requireDeck = (state: ISceneState, count: number): void => {
  if (state.deck.length < count) {
    throw new EngineError(
      "DECK_TOO_SMALL",
      `Needs ${count} named card(s) on top of the deck, found ${state.deck.length}`,
    );
  }
};

const setupDeck = (params: TSetupParams): ISceneState => {
  const cards: Record<string, ICard> = {};
  const deck = params.named.map((named, index) => {
    const id = `c${index + 1}`;
    cards[id] = { id, label: named.label, face: "down", perceivedAs: null };
    return id;
  });
  return { ...createEmptyScene(), cards, deck, restCount: params.restCount };
};

const applyDeckAction = (state: ISceneState, action: TStepAction): ISceneState => {
  const next: ISceneState = { ...state, beat: false };

  switch (action.type) {
    case "doubleLift": {
      if (state.lifted) throw new EngineError("ALREADY_LIFTED", "Cards are already lifted");
      requireDeck(state, action.params.count);
      return {
        ...next,
        deck: state.deck.slice(action.params.count),
        lifted: { cardIds: state.deck.slice(0, action.params.count), asOne: true },
      };
    }
    case "turnOver": {
      if (action.params.target === "top") {
        requireDeck(state, 1);
        const topId = state.deck[0];
        const card = state.cards[topId];
        const face = flipFace(card.face);
        return {
          ...next,
          cards: {
            ...state.cards,
            [topId]: { ...card, face, perceivedAs: face === "up" ? null : card.perceivedAs },
          },
        };
      }
      if (!state.lifted) throw new EngineError("NO_LIFTED", "No lifted cards to turn over");
      const cardIds = [...state.lifted.cardIds].reverse();
      const cards = { ...state.cards };
      for (const id of cardIds) {
        cards[id] = { ...cards[id], face: flipFace(cards[id].face) };
      }
      const visible = cards[cardIds[0]];
      if (state.lifted.asOne && visible.face === "up") {
        for (const id of cardIds) {
          cards[id] = { ...cards[id], perceivedAs: visible.label };
        }
      }
      return { ...next, cards, lifted: { ...state.lifted, cardIds } };
    }
    case "replace": {
      if (!state.lifted) throw new EngineError("NO_LIFTED", "No lifted cards to replace");
      return { ...next, deck: [...state.lifted.cardIds, ...state.deck], lifted: null };
    }
    case "takeTop": {
      requireDeck(state, action.params.count);
      return {
        ...next,
        deck: state.deck.slice(action.params.count),
        hand: [...state.hand, ...state.deck.slice(0, action.params.count)],
      };
    }
    case "insert": {
      const cardId = state.hand[state.hand.length - 1];
      if (cardId === undefined) throw new EngineError("HAND_EMPTY", "No card in hand to insert");
      return {
        ...next,
        hand: state.hand.slice(0, -1),
        buried: [...state.buried, cardId],
        jogged: cardId,
      };
    }
    case "square":
      return { ...next, jogged: null, spread: false };
    case "snap":
      return { ...next, jogged: null, beat: true };
    case "revealTop": {
      requireDeck(state, 1);
      const topId = state.deck[0];
      return {
        ...next,
        cards: {
          ...state.cards,
          [topId]: { ...state.cards[topId], face: "up", perceivedAs: null },
        },
      };
    }
    case "spread":
      return { ...next, spread: true };
    case "cutHalves":
    case "turnPacket":
    case "riffle":
    case "spreadReveal":
      throw new EngineError("WRONG_SCENE", `"${action.type}" is only available for packet tricks`);
    default: {
      const unknownAction: never = action;
      throw new EngineError("UNKNOWN_ACTION", `Unknown action: ${JSON.stringify(unknownAction)}`);
    }
  }
};

export const applyAction = (state: TScene, action: TAction): TScene => {
  if (action.type === "setupDeck") return setupDeck(action.params);
  if (action.type === "setupPackets") return setupPackets(action.params);
  if (Object.keys(state.cards).length === 0) {
    throw new EngineError("NOT_SETUP", `"${action.type}" requires a setup action first`);
  }
  return state.kind === "packets"
    ? applyPacketAction(state, action)
    : applyDeckAction(state, action);
};
