import type { TAction } from "@sleightbook/shared/schemas/action";

export type TFace = "up" | "down";
export type TView = "spectator" | "secret";

export interface ICard {
  id: string;
  label: string;
  face: TFace;
  perceivedAs: string | null;
}

export interface ILifted {
  cardIds: string[];
  asOne: boolean;
}

export interface ISceneState {
  kind: "deck";
  cards: Record<string, ICard>;
  deck: string[];
  restCount: number;
  lifted: ILifted | null;
  hand: string[];
  buried: string[];
  jogged: string | null;
  spread: boolean;
  beat: boolean;
}

export type TPacketId = "main" | "left" | "right";

export interface IPacket {
  id: TPacketId;
  count: number;
  face: TFace;
  perceivedFace: TFace;
  namedIds: string[];
}

export interface IPacketScene {
  kind: "packets";
  cards: Record<string, ICard>;
  packets: IPacket[];
  stacked: boolean;
  perceivedMixed: boolean;
  spread: boolean;
  beat: boolean;
}

export type TScene = ISceneState | IPacketScene;

export interface IPhaseInput {
  actions: ReadonlyArray<{ action: TAction; durationMs: number }>;
}

export interface IFrame {
  phaseIndex: number;
  actionIndex: number;
  state: TScene;
  durationMs: number;
}

export interface ITimeline {
  initial: TScene;
  frames: IFrame[];
  phaseEnds: number[];
}

export interface IProjectedCard {
  id: string;
  label: string;
  face: TFace;
  perceivedLabel: string | null;
}

export interface IProjectedScene {
  kind: "deck";
  view: TView;
  deck: IProjectedCard[];
  restCount: number;
  lifted: { cards: IProjectedCard[]; asOne: boolean } | null;
  hand: IProjectedCard[];
  buried: IProjectedCard[];
  joggedId: string | null;
  spread: boolean;
  beat: boolean;
}

export interface IProjectedPacket {
  id: TPacketId;
  count: number;
  face: TFace;
  cards: IProjectedCard[];
}

export interface IProjectedPacketScene {
  kind: "packets";
  view: TView;
  packets: IProjectedPacket[];
  stacked: boolean;
  showMixed: boolean;
  spread: boolean;
  beat: boolean;
}

export type TProjectedScene = IProjectedScene | IProjectedPacketScene;

export type TNodeKind = "card" | "deckBlock" | "fanCard" | "packetBlock" | "mixedBlock";
export type TNodeZone = "deck" | "lifted" | "hand" | "buried" | "fan" | "block" | "packet";
export type THighlight = "none" | "perceived" | "jogged" | "reversed";

export interface IRenderNode {
  id: string;
  kind: TNodeKind;
  zone: TNodeZone;
  x: number;
  y: number;
  rotation: number;
  z: number;
  face: TFace;
  label: string;
  perceivedLabel: string | null;
  highlight: THighlight;
}
