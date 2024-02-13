import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import { isStrategySection } from "../../../data/lovelace/config/section";
import {
  LovelaceRawConfig,
  isStrategyDashboard,
} from "../../../data/lovelace/config/types";
import { isStrategyView } from "../../../data/lovelace/config/view";

export type LovelaceCardPath = [number, number] | [number, number, number];
export type LovelaceContainerPath = [number] | [number, number];

export const parseLovelaceCardPath = (
  path: LovelaceCardPath
): { viewIndex: number; sectionIndex?: number; cardIndex: number } => {
  if (path.length === 2) {
    return {
      viewIndex: path[0],
      cardIndex: path[1],
    };
  }
  return {
    viewIndex: path[0],
    sectionIndex: path[1],
    cardIndex: path[2],
  };
};

export const parseLovelaceContainerPath = (
  path: LovelaceContainerPath
): { viewIndex: number; sectionIndex?: number } => {
  if (path.length === 1) {
    return {
      viewIndex: path[0],
    };
  }
  return {
    viewIndex: path[0],
    sectionIndex: path[1],
  };
};

export const findLovelaceContainer = (
  config: LovelaceRawConfig,
  path: LovelaceContainerPath
): LovelaceCardConfig[] | undefined => {
  const { viewIndex, sectionIndex } = parseLovelaceContainerPath(path);

  if (isStrategyDashboard(config)) {
    throw new Error("Can not find cards in a strategy dashboard");
  }

  const view = config.views[viewIndex];

  if (isStrategyView(view)) {
    throw new Error("Can not find cards in a strategy view");
  }
  if (sectionIndex === undefined) {
    return view.cards;
  }

  const section = view.sections?.[sectionIndex];

  if (section === undefined) {
    throw new Error("Section does not exist");
  }
  if (isStrategySection(section)) {
    throw new Error("Can not find cards in a strategy section");
  }
  return section.cards;
};
