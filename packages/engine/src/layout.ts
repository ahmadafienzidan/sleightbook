import type {
  IProjectedCard,
  IProjectedPacketScene,
  IProjectedScene,
  IRenderNode,
  TFace,
  THighlight,
  TNodeKind,
  TNodeZone,
  TProjectedScene,
} from "./types";

export const STAGE_WIDTH = 360;
export const STAGE_HEIGHT = 300;
export const CARD_WIDTH = 72;
export const CARD_HEIGHT = 100;
export const DECK_X = 144;
export const DECK_Y = 110;
export const FAN_SIZE = 9;

const JOG_OFFSET = 30;
const LIFT_X = 164;
const LIFT_Y = 50;
const LIFT_STEP = 6;
const HAND_X = 272;
const HAND_Y = 120;
const FAN_LEFT = 30;
const FAN_WIDTH = 228;
const FAN_Y = 120;
const FAN_ARC = 40;

const round2 = (value: number): number => Math.round(value * 100) / 100;

const highlightOf = (card: IProjectedCard, joggedId: string | null): THighlight => {
  if (card.perceivedLabel !== null) return "perceived";
  if (card.id === joggedId) return "jogged";
  return "none";
};

const cardNode = (
  card: IProjectedCard,
  zone: TNodeZone,
  position: { x: number; y: number; rotation: number; z: number },
  joggedId: string | null,
): IRenderNode => ({
  id: card.id,
  kind: "card",
  zone,
  x: round2(position.x),
  y: round2(position.y),
  rotation: round2(position.rotation),
  z: position.z,
  face: card.face,
  label: card.label,
  perceivedLabel: card.perceivedLabel,
  highlight: highlightOf(card, joggedId),
});

const fanPosition = (p: number, total: number) => {
  const last = total - 1;
  return {
    x: FAN_LEFT + (p * FAN_WIDTH) / last,
    y: FAN_Y + 3 * Math.abs(p - last / 2),
    rotation: -FAN_ARC / 2 + (p * FAN_ARC) / last,
    z: 1 + p,
  };
};

const layoutDeck = (scene: IProjectedScene): IRenderNode[] => {
  const nodes: IRenderNode[] = [];
  const { joggedId } = scene;

  if (scene.spread) {
    const total = FAN_SIZE + scene.deck.length;
    for (let p = 0; p < FAN_SIZE; p += 1) {
      const position = fanPosition(p, total);
      nodes.push({
        id: `fan-${p}`,
        kind: "fanCard",
        zone: "fan",
        x: round2(position.x),
        y: round2(position.y),
        rotation: round2(position.rotation),
        z: position.z,
        face: "down",
        label: "",
        perceivedLabel: null,
        highlight: "none",
      });
    }
    scene.deck.forEach((card, index) => {
      const p = FAN_SIZE + (scene.deck.length - 1 - index);
      nodes.push(cardNode(card, "fan", fanPosition(p, total), joggedId));
    });
    const buriedP = Math.floor(FAN_SIZE / 2);
    for (const card of scene.buried) {
      const position = fanPosition(buriedP, total);
      nodes.push(cardNode(card, "buried", { ...position, z: 1 + buriedP + 0.5 }, joggedId));
    }
  } else {
    nodes.push({
      id: "deck-block",
      kind: "deckBlock",
      zone: "block",
      x: DECK_X,
      y: DECK_Y,
      rotation: 0,
      z: 1,
      face: "down",
      label: "",
      perceivedLabel: null,
      highlight: "none",
    });
    for (const card of scene.buried) {
      const x = DECK_X + (card.id === joggedId ? JOG_OFFSET : 0);
      nodes.push(cardNode(card, "buried", { x, y: DECK_Y + 2, rotation: 0, z: 0 }, joggedId));
    }
    const count = scene.deck.length;
    scene.deck.forEach((card, index) => {
      const lift = count - index;
      nodes.push(
        cardNode(
          card,
          "deck",
          { x: DECK_X, y: DECK_Y - 2 * lift, rotation: 0, z: 10 + lift },
          joggedId,
        ),
      );
    });
  }

  if (scene.lifted) {
    const count = scene.lifted.cards.length;
    scene.lifted.cards.forEach((card, index) => {
      nodes.push(
        cardNode(
          card,
          "lifted",
          {
            x: LIFT_X + LIFT_STEP * index,
            y: LIFT_Y + LIFT_STEP * index,
            rotation: 6,
            z: 30 + (count - index),
          },
          joggedId,
        ),
      );
    });
  }

  scene.hand.forEach((card, index) => {
    nodes.push(
      cardNode(
        card,
        "hand",
        { x: HAND_X - LIFT_STEP * index, y: HAND_Y, rotation: -8, z: 40 + index },
        joggedId,
      ),
    );
  });

  return nodes.sort((a, b) => a.z - b.z);
};

const PACKET_GAP = 110;
const STACK_STEP = 8;
const NAMED_OFFSET = 30;

const blockNode = (
  id: string,
  kind: TNodeKind,
  face: TFace,
  x: number,
  y: number,
  z: number,
): IRenderNode => ({
  id,
  kind,
  zone: "packet",
  x: round2(x),
  y: round2(y),
  rotation: 0,
  z,
  face,
  label: "",
  perceivedLabel: null,
  highlight: "none",
});

const layoutPackets = (scene: IProjectedPacketScene): IRenderNode[] => {
  const nodes: IRenderNode[] = [];

  if (scene.spread) {
    const named = scene.packets.flatMap((packet) => packet.cards);
    const total = FAN_SIZE + named.length;
    const middle = Math.floor(total / 2);
    let anonymous = 0;
    for (let p = 0; p < total; p += 1) {
      const position = fanPosition(p, total);
      const card = p >= middle ? named[p - middle] : undefined;
      if (card) {
        nodes.push(cardNode(card, "fan", position, null));
      } else {
        nodes.push({
          id: `fan-${anonymous}`,
          kind: "fanCard",
          zone: "fan",
          x: round2(position.x),
          y: round2(position.y),
          rotation: round2(position.rotation),
          z: position.z,
          face: "down",
          label: "",
          perceivedLabel: null,
          highlight: "none",
        });
        anonymous += 1;
      }
    }
    return nodes.sort((a, b) => a.z - b.z);
  }

  if (scene.showMixed) return [blockNode("mixed-block", "mixedBlock", "down", DECK_X, DECK_Y, 1)];

  const count = scene.packets.length;
  scene.packets.forEach((packet, index) => {
    const x = scene.stacked ? DECK_X : DECK_X + (index - (count - 1) / 2) * PACKET_GAP;
    const y = scene.stacked ? DECK_Y - STACK_STEP * (count - 1 - index) : DECK_Y;
    const z = scene.stacked ? 10 * (count - index) : 10 * (index + 1);
    nodes.push(blockNode(`packet-${packet.id}`, "packetBlock", packet.face, x, y, z));
    packet.cards.forEach((card, cardIndex) => {
      const node = cardNode(
        card,
        "packet",
        { x: x + NAMED_OFFSET, y: y + 2 + 4 * cardIndex, rotation: 0, z: z + 1 + cardIndex },
        null,
      );
      nodes.push({ ...node, highlight: card.face === packet.face ? "none" : "reversed" });
    });
  });
  return nodes.sort((a, b) => a.z - b.z);
};

export const layout = (scene: TProjectedScene): IRenderNode[] =>
  scene.kind === "packets" ? layoutPackets(scene) : layoutDeck(scene);
