import type { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceSectionRawConfig } from "../../../data/lovelace/config/section";
import { isStackSection } from "../../../data/lovelace/config/section";
import type { LovelaceConfig } from "../../../data/lovelace/config/types";
import type { LovelaceViewRawConfig } from "../../../data/lovelace/config/view";
import { isStrategyView } from "../../../data/lovelace/config/view";

export type LovelaceSectionPath = [number, number] | [number, number, number];
export type LovelaceCardPath = [...LovelaceContainerPath, number];
export type LovelaceContainerPath = [number] | LovelaceSectionPath;

export const parseLovelaceCardPath = (
  path: LovelaceCardPath
): {
  viewIndex: number;
  sectionIndex?: number;
  subsectionIndex?: number;
  cardIndex: number;
} => {
  if (path.length === 4) {
    return {
      viewIndex: path[0],
      sectionIndex: path[1],
      subsectionIndex: path[2],
      cardIndex: path[3],
    };
  }
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
): { viewIndex: number; sectionIndex?: number; subsectionIndex?: number } => {
  if (path.length === 3) {
    return {
      viewIndex: path[0],
      sectionIndex: path[1],
      subsectionIndex: path[2],
    };
  }
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

interface FindLovelaceContainer {
  (config: LovelaceConfig, path: [number]): LovelaceViewRawConfig;
  (config: LovelaceConfig, path: LovelaceSectionPath): LovelaceSectionRawConfig;
  (
    config: LovelaceConfig,
    path: LovelaceContainerPath
  ): LovelaceViewRawConfig | LovelaceSectionRawConfig;
}
export const findLovelaceContainer: FindLovelaceContainer = ((
  config: LovelaceConfig,
  path: LovelaceContainerPath
): LovelaceViewRawConfig | LovelaceSectionRawConfig => {
  const { viewIndex, sectionIndex } = parseLovelaceContainerPath(path);

  const view = config.views[viewIndex];

  if (!view) {
    throw new Error("View does not exist");
  }
  if (sectionIndex === undefined) {
    return view;
  }
  if (isStrategyView(view)) {
    throw new Error("Can not find section in a strategy view");
  }

  const section = view.sections?.[sectionIndex];

  if (!section) {
    throw new Error("Section does not exist");
  }
  if (path.length === 3) {
    if (!isStackSection(section)) throw new Error("Section is not a stack");
    const child = section.sections[path[2]];
    if (!child) throw new Error("Section does not exist");
    return child;
  }
  return section;
}) as FindLovelaceContainer;

export const updateLovelaceContainer = (
  config: LovelaceConfig,
  path: LovelaceContainerPath,
  containerConfig: LovelaceViewRawConfig | LovelaceSectionRawConfig
): LovelaceConfig => {
  if (path.length === 3) {
    const stackPath: LovelaceSectionPath = [path[0], path[1]];
    const stack = findLovelaceContainer(config, stackPath);
    if (!isStackSection(stack)) throw new Error("Section is not a stack");
    if (!stack.sections[path[2]]) throw new Error("Section does not exist");
    if ("type" in containerConfig && containerConfig.type === "stack") {
      throw new Error("Nested section stacks are not supported");
    }
    return updateLovelaceContainer(config, stackPath, {
      ...stack,
      sections: stack.sections.map((section, index) =>
        index === path[2]
          ? (containerConfig as LovelaceSectionRawConfig)
          : section
      ),
    });
  }
  const { viewIndex, sectionIndex } = parseLovelaceContainerPath(path);

  let updated = false;
  const newViews = config.views.map((view, vIndex) => {
    if (vIndex !== viewIndex) return view;

    if (sectionIndex === undefined) {
      updated = true;
      return containerConfig as LovelaceViewRawConfig;
    }

    if (isStrategyView(view)) {
      throw new Error("Can not update section in a strategy view");
    }

    if (view.sections === undefined) {
      throw new Error("Section does not exist");
    }

    const newSections = view.sections.map((section, sIndex) => {
      if (sIndex !== sectionIndex) return section;
      updated = true;
      return containerConfig as LovelaceSectionRawConfig;
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

interface LovelaceItemKeys {
  cards: LovelaceCardConfig[];
  badges: (Partial<LovelaceBadgeConfig> | string)[];
}

export const updateLovelaceItems = <T extends keyof LovelaceItemKeys>(
  key: T,
  config: LovelaceConfig,
  path: LovelaceContainerPath,
  items: LovelaceItemKeys[T]
): LovelaceConfig => {
  const container = findLovelaceContainer(config, path);
  if ("strategy" in container) {
    throw new Error(`Can not update ${key} in a strategy view/section`);
  }
  if ("type" in container && container.type === "stack") {
    throw new Error("Cards must be added to a section inside the stack");
  }
  return updateLovelaceContainer(config, path, { ...container, [key]: items });
};

export const findLovelaceItems = <T extends keyof LovelaceItemKeys>(
  key: T,
  config: LovelaceConfig,
  path: LovelaceContainerPath
): LovelaceItemKeys[T] | undefined => {
  const container = findLovelaceContainer(config, path);
  if ("strategy" in container) {
    throw new Error("Can not find cards in a strategy view/section");
  }
  if ("type" in container && container.type === "stack") {
    throw new Error("Cards must be added to a section inside the stack");
  }
  if (path.length === 1 || key === "cards") {
    return container[key as "cards"] as LovelaceItemKeys[T] | undefined;
  }
  throw new Error(`${key} is not supported in section`);
};

/** Card editors use the stack's width without changing the child's saved config. */
export const getCardSectionConfig = (
  config: LovelaceConfig,
  path: LovelaceSectionPath
): LovelaceSectionRawConfig => {
  const section = findLovelaceContainer(config, path);
  if (path.length === 2) return section;
  const stack = findLovelaceContainer(config, [path[0], path[1]]);
  return { ...section, column_span: stack.column_span };
};
