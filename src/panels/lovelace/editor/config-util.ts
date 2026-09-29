import deepClone from "deep-clone-simple";
import type { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";
import { ensureBadgeConfig } from "../../../data/lovelace/config/badge";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import { isStackSection } from "../../../data/lovelace/config/section";
import type { LovelaceSectionRawConfig } from "../../../data/lovelace/config/section";
import type { LovelaceConfig } from "../../../data/lovelace/config/types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import { isStrategyView } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type {
  LovelaceCardPath,
  LovelaceContainerPath,
  LovelaceSectionPath,
} from "./lovelace-path";
import {
  findLovelaceContainer,
  findLovelaceItems,
  getLovelaceContainerPath,
  parseLovelaceCardPath,
  updateLovelaceContainer,
  updateLovelaceItems,
} from "./lovelace-path";

export const addCard = (
  config: LovelaceConfig,
  path: LovelaceContainerPath,
  cardConfig: LovelaceCardConfig
): LovelaceConfig => {
  const cards = findLovelaceItems("cards", config, path);
  const newCards = cards ? [...cards, cardConfig] : [cardConfig];
  const newConfig = updateLovelaceItems("cards", config, path, newCards);
  return newConfig;
};

export const addCards = (
  config: LovelaceConfig,
  path: LovelaceContainerPath,
  cardConfigs: LovelaceCardConfig[]
): LovelaceConfig => {
  const cards = findLovelaceItems("cards", config, path);
  const newCards = cards ? [...cards, ...cardConfigs] : [...cardConfigs];
  const newConfig = updateLovelaceItems("cards", config, path, newCards);
  return newConfig;
};

export const replaceCard = (
  config: LovelaceConfig,
  path: LovelaceCardPath,
  cardConfig: LovelaceCardConfig
): LovelaceConfig => {
  const { cardIndex } = parseLovelaceCardPath(path);
  const containerPath = getLovelaceContainerPath(path);

  const cards = findLovelaceItems("cards", config, containerPath);

  const newCards = (cards ?? []).map((origConf, ind) =>
    ind === cardIndex ? cardConfig : origConf
  );

  const newConfig = updateLovelaceItems(
    "cards",
    config,
    containerPath,
    newCards
  );
  return newConfig;
};

export const deleteCard = (
  config: LovelaceConfig,
  path: LovelaceCardPath
): LovelaceConfig => {
  const { cardIndex } = parseLovelaceCardPath(path);
  const containerPath = getLovelaceContainerPath(path);

  const cards = findLovelaceItems("cards", config, containerPath);

  const newCards = (cards ?? []).filter((_origConf, ind) => ind !== cardIndex);

  const newConfig = updateLovelaceItems(
    "cards",
    config,
    containerPath,
    newCards
  );
  return newConfig;
};

export const insertCard = (
  config: LovelaceConfig,
  path: LovelaceCardPath,
  cardConfig: LovelaceCardConfig
) => {
  const { cardIndex } = parseLovelaceCardPath(path);
  const containerPath = getLovelaceContainerPath(path);

  const cards = findLovelaceItems("cards", config, containerPath);

  const newCards = cards
    ? [...cards.slice(0, cardIndex), cardConfig, ...cards.slice(cardIndex)]
    : [cardConfig];

  const newConfig = updateLovelaceItems(
    "cards",
    config,
    containerPath,
    newCards
  );
  return newConfig;
};

export const moveCardToIndex = (
  config: LovelaceConfig,
  path: LovelaceCardPath,
  index: number
): LovelaceConfig => {
  const { cardIndex } = parseLovelaceCardPath(path);
  const containerPath = getLovelaceContainerPath(path);

  const cards = findLovelaceItems("cards", config, containerPath);

  const newCards = cards ? [...cards] : [];

  const oldIndex = cardIndex;
  const newIndex = Math.max(Math.min(index, newCards.length - 1), 0);

  const card = newCards[oldIndex];
  newCards.splice(oldIndex, 1);
  newCards.splice(newIndex, 0, card);

  const newConfig = updateLovelaceItems(
    "cards",
    config,
    containerPath,
    newCards
  );
  return newConfig;
};

export const moveCardToContainer = (
  config: LovelaceConfig,
  fromPath: LovelaceCardPath,
  toPath: LovelaceContainerPath
): LovelaceConfig => {
  const { cardIndex: fromCardIndex } = parseLovelaceCardPath(fromPath);
  const fromContainerPath = getLovelaceContainerPath(fromPath);
  if (
    fromContainerPath.length === toPath.length &&
    fromContainerPath.every((index, i) => index === toPath[i])
  ) {
    throw new Error("You cannot move a card to the view or section it is in.");
  }

  const cards = findLovelaceItems("cards", config, fromContainerPath);
  const card = cards![fromCardIndex];

  let newConfig = addCard(config, toPath, card);
  newConfig = deleteCard(newConfig, fromPath);

  return newConfig;
};

export const moveCard = (
  config: LovelaceConfig,
  fromPath: LovelaceCardPath,
  toPath: LovelaceCardPath
): LovelaceConfig => {
  const { cardIndex: fromCardIndex } = parseLovelaceCardPath(fromPath);
  const fromContainerPath = getLovelaceContainerPath(fromPath);
  const cards = findLovelaceItems("cards", config, fromContainerPath);
  const card = cards![fromCardIndex];

  let newConfig = deleteCard(config, fromPath);
  newConfig = insertCard(newConfig, toPath, card);

  return newConfig;
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

const sectionContainerPath = (
  viewIndex: number,
  stackIndex?: number
): [number] | [number, number] =>
  stackIndex === undefined ? [viewIndex] : [viewIndex, stackIndex];

const findSectionContainer = (
  config: LovelaceConfig,
  path: [number] | [number, number]
) => {
  if (path.length === 1) {
    const view = findLovelaceContainer(config, path);
    if (isStrategyView(view)) {
      throw new Error("Editing sections in a strategy is not supported.");
    }
    return view;
  }
  const stack = findLovelaceContainer(config, path);
  if (!isStackSection(stack)) throw new Error("Section is not a stack");
  return stack;
};

export const addSection = (
  config: LovelaceConfig,
  viewIndex: number,
  sectionConfig: LovelaceSectionRawConfig,
  stackIndex?: number
): LovelaceConfig => {
  const container = findSectionContainer(
    config,
    sectionContainerPath(viewIndex, stackIndex)
  );
  return insertSection(
    config,
    viewIndex,
    container.sections?.length ?? 0,
    sectionConfig,
    stackIndex
  );
};

export const deleteSection = (
  config: LovelaceConfig,
  viewIndex: number,
  sectionIndex: number,
  stackIndex?: number
): LovelaceConfig => {
  const path = sectionContainerPath(viewIndex, stackIndex);
  const container = findSectionContainer(config, path);
  return updateLovelaceContainer(config, path, {
    ...container,
    sections: container.sections?.filter((_, index) => index !== sectionIndex),
  });
};

export const duplicateSection = (
  config: LovelaceConfig,
  viewIndex: number,
  sectionIndex: number,
  stackIndex?: number
): LovelaceConfig => {
  const container = findSectionContainer(
    config,
    sectionContainerPath(viewIndex, stackIndex)
  );
  const clone = deepClone(container.sections![sectionIndex]);
  return insertSection(config, viewIndex, sectionIndex + 1, clone, stackIndex);
};

export const insertSection = (
  config: LovelaceConfig,
  viewIndex: number,
  sectionIndex: number,
  sectionConfig: LovelaceSectionRawConfig,
  stackIndex?: number
): LovelaceConfig => {
  const path = sectionContainerPath(viewIndex, stackIndex);
  const container = findSectionContainer(config, path);
  if (stackIndex !== undefined && isStackSection(sectionConfig)) {
    throw new Error("Nested section stacks are not supported");
  }
  const sections = container.sections ?? [];
  return updateLovelaceContainer(config, path, {
    ...container,
    sections: [
      ...sections.slice(0, sectionIndex),
      sectionConfig,
      ...sections.slice(sectionIndex),
    ],
  });
};

export const wrapSectionInStack = (
  config: LovelaceConfig,
  viewIndex: number,
  sectionIndex: number
): LovelaceConfig => {
  const path: [number, number] = [viewIndex, sectionIndex];
  const section = findLovelaceContainer(config, path);
  if (isStackSection(section)) {
    throw new Error("Nested section stacks are not supported");
  }
  return updateLovelaceContainer(config, path, {
    type: "stack",
    ...(section.column_span === undefined
      ? {}
      : { column_span: section.column_span }),
    sections: [section],
  });
};

export const moveSection = (
  config: LovelaceConfig,
  fromPath: LovelaceSectionPath,
  toPath: LovelaceSectionPath
): LovelaceConfig => {
  const section = findLovelaceContainer(config, fromPath);
  const fromIndex = fromPath[fromPath.length - 1];
  const toIndex = toPath[toPath.length - 1];
  const fromStackIndex = fromPath.length === 3 ? fromPath[1] : undefined;
  let toStackIndex = toPath.length === 3 ? toPath[1] : undefined;
  if (isStackSection(section) && toStackIndex !== undefined) {
    throw new Error("Nested section stacks are not supported");
  }
  // Removing a top-level section shifts a later destination stack left.
  if (
    fromPath[0] === toPath[0] &&
    fromStackIndex === undefined &&
    toStackIndex !== undefined &&
    fromIndex < toStackIndex
  ) {
    toStackIndex--;
  }
  const newConfig = deleteSection(
    config,
    fromPath[0],
    fromIndex,
    fromStackIndex
  );
  return insertSection(newConfig, toPath[0], toIndex, section, toStackIndex);
};

export const addBadge = (
  config: LovelaceConfig,
  path: LovelaceContainerPath,
  badgeConfig: LovelaceBadgeConfig
): LovelaceConfig => {
  const badges = findLovelaceItems("badges", config, path);
  const newBadges = badges ? [...badges, badgeConfig] : [badgeConfig];
  const newConfig = updateLovelaceItems("badges", config, path, newBadges);
  return newConfig;
};

export const addBadges = (
  config: LovelaceConfig,
  path: LovelaceContainerPath,
  badgeConfig: LovelaceBadgeConfig[]
): LovelaceConfig => {
  const badges = findLovelaceItems("badges", config, path);
  const newBadges = badges ? [...badges, ...badgeConfig] : [...badgeConfig];
  const newConfig = updateLovelaceItems("badges", config, path, newBadges);
  return newConfig;
};

export const replaceBadge = (
  config: LovelaceConfig,
  path: LovelaceCardPath,
  cardConfig: LovelaceBadgeConfig
): LovelaceConfig => {
  const { cardIndex } = parseLovelaceCardPath(path);
  const containerPath = getLovelaceContainerPath(path);

  const badges = findLovelaceItems("badges", config, containerPath);

  const newBadges = (badges ?? []).map((origConf, ind) =>
    ind === cardIndex ? cardConfig : origConf
  );

  const newConfig = updateLovelaceItems(
    "badges",
    config,
    containerPath,
    newBadges
  );
  return newConfig;
};

export const deleteBadge = (
  config: LovelaceConfig,
  path: LovelaceCardPath
): LovelaceConfig => {
  const { cardIndex } = parseLovelaceCardPath(path);
  const containerPath = getLovelaceContainerPath(path);

  const badges = findLovelaceItems("badges", config, containerPath);

  const newBadges = (badges ?? []).filter(
    (_origConf, ind) => ind !== cardIndex
  );

  const newConfig = updateLovelaceItems(
    "badges",
    config,
    containerPath,
    newBadges
  );
  return newConfig;
};

export const insertBadge = (
  config: LovelaceConfig,
  path: LovelaceCardPath,
  badgeConfig: LovelaceBadgeConfig
) => {
  const { cardIndex } = parseLovelaceCardPath(path);
  const containerPath = getLovelaceContainerPath(path);

  const badges = findLovelaceItems("badges", config, containerPath);

  const newBadges = badges
    ? [...badges.slice(0, cardIndex), badgeConfig, ...badges.slice(cardIndex)]
    : [badgeConfig];

  const newConfig = updateLovelaceItems(
    "badges",
    config,
    containerPath,
    newBadges
  );
  return newConfig;
};

export const moveBadge = (
  config: LovelaceConfig,
  fromPath: LovelaceCardPath,
  toPath: LovelaceCardPath
): LovelaceConfig => {
  const { cardIndex: fromCardIndex } = parseLovelaceCardPath(fromPath);
  const fromContainerPath = getLovelaceContainerPath(fromPath);
  const badges = findLovelaceItems("badges", config, fromContainerPath);
  const badge = badges![fromCardIndex];

  let newConfig = deleteBadge(config, fromPath);
  newConfig = insertBadge(newConfig, toPath, ensureBadgeConfig(badge));

  return newConfig;
};
