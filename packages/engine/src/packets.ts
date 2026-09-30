import type { TAction } from "@sleightbook/shared/schemas/action";

import { EngineError } from "./errors";
import type { ICard, IPacket, IPacketScene, TFace, TPacketId } from "./types";

type TSetupPacketsParams = Extract<TAction, { type: "setupPackets" }>["params"];
export type TStepAction = Exclude<TAction, { type: "setupDeck" | "setupPackets" }>;

const flipFace = (face: TFace): TFace => (face === "up" ? "down" : "up");

export const setupPackets = (params: TSetupPacketsParams): IPacketScene => ({
  kind: "packets",
  cards: { c1: { id: "c1", label: params.selection.label, face: "down", perceivedAs: null } },
  packets: [
    { id: "main", count: params.count, face: "down", perceivedFace: "down", namedIds: ["c1"] },
  ],
  stacked: true,
  perceivedMixed: false,
  spread: false,
  beat: false,
});

const findPacket = (state: IPacketScene, id: TPacketId): IPacket => {
  const packet = state.packets.find((candidate) => candidate.id === id);
  if (!packet) throw new EngineError("NO_PACKET", `No packet "${id}" on the table`);
  return packet;
};

const replacePacket = (packets: IPacket[], updated: IPacket): IPacket[] =>
  packets.map((packet) => (packet.id === updated.id ? updated : packet));

export const applyPacketAction = (state: IPacketScene, action: TStepAction): IPacketScene => {
  const next: IPacketScene = { ...state, beat: false };

  switch (action.type) {
    case "cutHalves": {
      const main = findPacket(state, "main");
      const leftCount = Math.ceil(main.count / 2);
      return {
        ...next,
        stacked: false,
        packets: [
          { ...main, id: "left", count: leftCount },
          {
            id: "right",
            count: main.count - leftCount,
            face: main.face,
            perceivedFace: main.perceivedFace,
            namedIds: [],
          },
        ],
      };
    }
    case "turnPacket": {
      const packet = findPacket(state, action.params.packet);
      const [top, ...rest] = packet.namedIds;
      const keptTop = action.params.keepTop ? top : undefined;
      const flipping = keptTop === undefined ? packet.namedIds : rest;
      const cards: Record<string, ICard> = { ...state.cards };
      for (const id of flipping) {
        cards[id] = { ...cards[id], face: flipFace(cards[id].face) };
      }
      const reversed = [...flipping].reverse();
      const face = flipFace(packet.face);
      return {
        ...next,
        cards,
        packets: replacePacket(state.packets, {
          ...packet,
          face,
          perceivedFace: action.params.covert ? packet.perceivedFace : face,
          namedIds: keptTop === undefined ? reversed : [keptTop, ...reversed],
        }),
      };
    }
    case "riffle": {
      const left = findPacket(state, "left");
      const right = findPacket(state, "right");
      return { ...next, stacked: true, perceivedMixed: true, packets: [right, left] };
    }
    case "spreadReveal":
      return {
        ...next,
        spread: true,
        perceivedMixed: false,
        packets: state.packets.map((packet) => ({ ...packet, perceivedFace: packet.face })),
      };
    case "snap":
      return { ...next, beat: true };
    default:
      throw new EngineError("WRONG_SCENE", `"${action.type}" is not available for packet tricks`);
  }
};
