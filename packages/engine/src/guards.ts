import type {
  IPacketScene,
  IProjectedPacketScene,
  IProjectedScene,
  ISceneState,
  TProjectedScene,
  TScene,
} from "./types";

export const asDeckScene = (scene: TScene | undefined): ISceneState => {
  if (!scene || scene.kind !== "deck") {
    throw new Error(`Expected a deck scene, got ${scene?.kind ?? "nothing"}`);
  }
  return scene;
};

export const asPacketScene = (scene: TScene | undefined): IPacketScene => {
  if (!scene || scene.kind !== "packets") {
    throw new Error(`Expected a packet scene, got ${scene?.kind ?? "nothing"}`);
  }
  return scene;
};

export const asDeckProjection = (scene: TProjectedScene): IProjectedScene => {
  if (scene.kind !== "deck") throw new Error(`Expected a deck projection, got ${scene.kind}`);
  return scene;
};

export const asPacketProjection = (scene: TProjectedScene): IProjectedPacketScene => {
  if (scene.kind !== "packets") throw new Error(`Expected a packet projection, got ${scene.kind}`);
  return scene;
};
