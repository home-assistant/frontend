import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import { isStrategySection } from "../../../data/lovelace/config/section";
import { LovelaceConfig } from "../../../data/lovelace/config/types";
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

export const getLovelaceContainerPath = (
  path: LovelaceCardPath
): LovelaceContainerPath => path.slice(0, -1) as LovelaceContainerPath;

export const findLovelaceCards = (
  config: LovelaceConfig,
  path: LovelaceContainerPath
): LovelaceCardConfig[] | undefined => {
  const { viewIndex, sectionIndex } = parseLovelaceContainerPath(path);

  const view = config.views[viewIndex];

  if (!view) {
    throw new Error("View does not exist");
  }
  if (isStrategyView(view)) {
    throw new Error("Can not find cards in a strategy view");
  }
  if (sectionIndex === undefined) {
    return view.cards;
  }

  const section = view.sections?.[sectionIndex];

  if (!section) {
    throw new Error("Section does not exist");
  }
  if (isStrategySection(section)) {
    throw new Error("Can not find cards in a strategy section");
  }
  return section.cards;
};

export const updateLovelaceCards = <T extends LovelaceConfig = LovelaceConfig>(
  config: T,
  path: LovelaceContainerPath,
  cards: LovelaceCardConfig[]
): LovelaceConfig => {
  const { viewIndex, sectionIndex } = parseLovelaceContainerPath(path);

  let updated = false;
  const newViews = config.views.map((view, vIndex) => {
    if (vIndex !== viewIndex) return view;
    if (isStrategyView(view)) {
      throw new Error("Can not update cards in a strategy view");
    }
    if (sectionIndex === undefined) {
      updated = true;
      return {
        ...view,
        cards,
      };
    }

    if (view.sections === undefined) {
      throw new Error("Section does not exist");
    }

    const newSections = view.sections.map((section, sIndex) => {
      if (sIndex !== sectionIndex) return section;
      if (isStrategySection(section)) {
        throw new Error("Can not update cards in a strategy section");
      }
      updated = true;
      return {
        ...section,
        cards,
      };
    });
    return {
      ...view,
      sections: newSections,
    };
  });

  if (!updated) {
    throw new Error("Can not update cards in a non-existing view/section");
  }
  return {
    ...config,
    views: newViews,
  };
};
