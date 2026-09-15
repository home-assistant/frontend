import deepClone from "deep-clone-simple";
import type { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type {
  LovelaceSectionConfig,
  LovelaceSectionRawConfig,
} from "../../../data/lovelace/config/section";
import { isStrategySection } from "../../../data/lovelace/config/section";
import type { LovelaceConfig } from "../../../data/lovelace/config/types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { LovelacePath } from "./lovelace-path";
import {
  appendAtPath,
  deleteAtPath,
  getAtPath,
  getParentPath,
  insertAtPath,
  getPathTarget,
  moveAtPath,
  pathEquals,
  setAtPath,
} from "./lovelace-path";

export const addCard = (
  config: LovelaceConfig,
  containerPath: LovelacePath,
  cardConfig: LovelaceCardConfig
): LovelaceConfig =>
  appendAtPath(config, [...containerPath, "cards"], cardConfig);

export const addCards = (
  config: LovelaceConfig,
  containerPath: LovelacePath,
  cardConfigs: LovelaceCardConfig[]
): LovelaceConfig =>
  cardConfigs.reduce(
    (newConfig, cardConfig) => addCard(newConfig, containerPath, cardConfig),
    config
  );

export const addCardAtPath = (
  config: LovelaceConfig,
  path: LovelacePath,
  cardConfig: LovelaceCardConfig
): LovelaceConfig =>
  getPathTarget(path) === "slot"
    ? setAtPath(config, path, cardConfig)
    : appendAtPath(config, path, cardConfig);

export const moveCardToIndex = (
  config: LovelaceConfig,
  cardPath: LovelacePath,
  index: number
): LovelaceConfig => {
  const collectionPath = getParentPath(cardPath);
  const cards = getAtPath<LovelaceCardConfig[]>(config, collectionPath) ?? [];
  const newIndex = Math.max(Math.min(index, cards.length - 1), 0);
  return moveAtPath(config, cardPath, [...collectionPath, newIndex]);
};

export const moveCardToContainer = (
  config: LovelaceConfig,
  cardPath: LovelacePath,
  containerPath: LovelacePath
): LovelaceConfig => {
  const fromCardsPath = getParentPath(cardPath);
  const toCardsPath = [...containerPath, "cards"];
  if (pathEquals(fromCardsPath, toCardsPath)) {
    throw new Error("You cannot move a card to the view or section it is in.");
  }
  const card = getAtPath<LovelaceCardConfig>(config, cardPath)!;
  const newConfig = addCard(config, containerPath, card);
  return deleteAtPath(newConfig, cardPath);
};

export const getCardSectionConfig = (
  config: LovelaceConfig,
  path: LovelacePath
): LovelaceSectionConfig | undefined => {
  const parentPath = getParentPath(path);
  const containerPath =
    getPathTarget(path) === "item" ? getParentPath(parentPath) : parentPath;
  if (
    containerPath[containerPath.length - 2] !== "sections" ||
    typeof containerPath[containerPath.length - 1] !== "number"
  ) {
    return undefined;
  }
  const section = getAtPath<LovelaceSectionRawConfig>(config, containerPath);
  if (!section || isStrategySection(section)) {
    return undefined;
  }
  return section;
};

export const addView = (
  hass: HomeAssistant,
  config: LovelaceConfig,
  viewConfig: LovelaceViewConfig,
  tolerantPath = false
): LovelaceConfig => {
  if (viewConfig.path && config.views.some((v) => v.path === viewConfig.path)) {
    if (!tolerantPath) {
      throw new Error(
        hass.localize("ui.panel.lovelace.editor.edit_view.error_same_url")
      );
    } else {
      // add a suffix to the path
      viewConfig = {
        ...viewConfig,
        path: `${viewConfig.path}-2`,
      };
    }
  }
  return {
    ...config,
    views: config.views.concat(viewConfig),
  };
};

export const replaceView = (
  hass: HomeAssistant,
  config: LovelaceConfig,
  viewIndex: number,
  viewConfig: LovelaceViewConfig
): LovelaceConfig => {
  if (
    viewConfig.path &&
    config.views.some(
      (v, idx) => v.path === viewConfig.path && idx !== viewIndex
    )
  ) {
    throw new Error(
      hass.localize("ui.panel.lovelace.editor.edit_view.error_same_url")
    );
  }
  return {
    ...config,
    views: config.views.map((origView, index) =>
      index === viewIndex ? viewConfig : origView
    ),
  };
};

export const swapView = (
  config: LovelaceConfig,
  path1: number,
  path2: number
): LovelaceConfig => {
  const view1 = config.views[path1];
  const view2 = config.views[path2];

  return {
    ...config,
    views: config.views.map((origView, index) =>
      index === path2 ? view1 : index === path1 ? view2 : origView
    ),
  };
};

export const deleteView = (
  config: LovelaceConfig,
  viewIndex: number
): LovelaceConfig => ({
  ...config,
  views: config.views.filter((_origView, index) => index !== viewIndex),
});

export const moveViewToDashboard = (
  hass: HomeAssistant,
  fromConfig: LovelaceConfig,
  toConfig: LovelaceConfig,
  viewIndex: number
): [LovelaceConfig, LovelaceConfig] => {
  const view = fromConfig.views[viewIndex];

  return [
    deleteView(fromConfig, viewIndex),
    addView(hass, toConfig, view, true),
  ];
};

export const addSection = (
  config: LovelaceConfig,
  containerPath: LovelacePath,
  sectionConfig: LovelaceSectionRawConfig
): LovelaceConfig =>
  appendAtPath(config, [...containerPath, "sections"], sectionConfig);

export const duplicateSection = (
  config: LovelaceConfig,
  sectionPath: LovelacePath
): LovelaceConfig => {
  const index = sectionPath[sectionPath.length - 1] as number;
  const sectionsPath = getParentPath(sectionPath);
  const section = getAtPath<LovelaceSectionRawConfig>(config, sectionPath);
  return insertAtPath(config, [...sectionsPath, index + 1], deepClone(section));
};

export const addBadge = (
  config: LovelaceConfig,
  containerPath: LovelacePath,
  badgeConfig: LovelaceBadgeConfig
): LovelaceConfig =>
  appendAtPath(config, [...containerPath, "badges"], badgeConfig);

export const addBadges = (
  config: LovelaceConfig,
  containerPath: LovelacePath,
  badgeConfigs: LovelaceBadgeConfig[]
): LovelaceConfig =>
  badgeConfigs.reduce(
    (newConfig, badgeConfig) => addBadge(newConfig, containerPath, badgeConfig),
    config
  );
