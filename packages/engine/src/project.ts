import type {
  ICard,
  IPacketScene,
  IProjectedCard,
  IProjectedPacketScene,
  IProjectedScene,
  ISceneState,
  TProjectedScene,
  TScene,
  TView,
} from "./types";

const toProjectedCard = (card: ICard, view: TView): IProjectedCard => {
  const perceived =
    card.perceivedAs !== null && card.perceivedAs !== card.label ? card.perceivedAs : null;
  if (view === "spectator") {
    return { id: card.id, label: perceived ?? card.label, face: card.face, perceivedLabel: null };
  }
  return { id: card.id, label: card.label, face: card.face, perceivedLabel: perceived };
};

const projectDeck = (state: ISceneState, view: TView): IProjectedScene => {
  const toCards = (ids: readonly string[]): IProjectedCard[] =>
    ids.map((id) => toProjectedCard(state.cards[id], view));

  let lifted: IProjectedScene["lifted"] = null;
  if (state.lifted) {
    const cards = toCards(state.lifted.cardIds);
    const isCollapsed = view === "spectator" && state.lifted.asOne;
    lifted = { asOne: state.lifted.asOne, cards: isCollapsed ? cards.slice(0, 1) : cards };
  }

  return {
    kind: "deck",
    view,
    deck: toCards(state.deck),
    restCount: state.restCount,
    lifted,
    hand: toCards(state.hand),
    buried: toCards(state.buried),
    joggedId: state.jogged,
    spread: state.spread,
    beat: state.beat,
  };
};

const projectPackets = (state: IPacketScene, view: TView): IProjectedPacketScene => {
  const isSecret = view === "secret";
  return {
    kind: "packets",
    view,
    stacked: state.stacked,
    showMixed: !isSecret && state.stacked && state.perceivedMixed,
    spread: state.spread,
    beat: state.beat,
    packets: state.packets.map((packet) => ({
      id: packet.id,
      count: packet.count,
      face: isSecret ? packet.face : packet.perceivedFace,
      cards:
        isSecret || state.spread
          ? packet.namedIds.map((id) => toProjectedCard(state.cards[id], view))
          : [],
    })),
  };
};

export const project = (state: TScene, view: TView): TProjectedScene =>
  state.kind === "packets" ? projectPackets(state, view) : projectDeck(state, view);
