import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import { LovelaceConfig } from "../../../data/lovelace/config/types";
import {
  LovelaceViewConfig,
  isStrategyView,
} from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import {
  LovelaceCardPath,
  LovelaceContainerPath,
  parseLovelaceCardPath,
  parseLovelaceContainerPath,
} from "./lovelace-path";

export const addCard = (
  config: LovelaceConfig,
  path: LovelaceContainerPath,
  cardConfig: LovelaceCardConfig
): LovelaceConfig => {
  const { viewIndex } = parseLovelaceContainerPath(path);
  const views: LovelaceViewConfig[] = [];

  config.views.forEach((viewConf, index) => {
    if (index !== viewIndex) {
      views.push(config.views[index]);
      return;
    }

    if (isStrategyView(viewConf)) {
      throw new Error("You cannot add a card in a strategy view.");
    }

    const cards = viewConf.cards
      ? [...viewConf.cards, cardConfig]
      : [cardConfig];

    views.push({
      ...viewConf,
      cards,
    });
  });

  return {
    ...config,
    views,
  };
};

export const addCards = (
  config: LovelaceConfig,
  path: LovelaceContainerPath,
  cardConfigs: LovelaceCardConfig[]
): LovelaceConfig => {
  const { viewIndex } = parseLovelaceContainerPath(path);
  const views: LovelaceViewConfig[] = [];

  config.views.forEach((viewConf, index) => {
    if (index !== viewIndex) {
      views.push(config.views[index]);
      return;
    }

    if (isStrategyView(viewConf)) {
      throw new Error("You cannot add cards in a strategy view.");
    }

    const cards = viewConf.cards
      ? [...viewConf.cards, ...cardConfigs]
      : [...cardConfigs];

    views.push({
      ...viewConf,
      cards,
    });
  });

  return {
    ...config,
    views,
  };
};

export const replaceCard = (
  config: LovelaceConfig,
  path: LovelaceCardPath,
  cardConfig: LovelaceCardConfig
): LovelaceConfig => {
  const { viewIndex, cardIndex } = parseLovelaceCardPath(path);
  const views: LovelaceViewConfig[] = [];

  config.views.forEach((viewConf, index) => {
    if (index !== viewIndex) {
      views.push(config.views[index]);
      return;
    }

    if (isStrategyView(viewConf)) {
      throw new Error("You cannot replace a card in a strategy view.");
    }

    views.push({
      ...viewConf,
      cards: (viewConf.cards || []).map((origConf, ind) =>
        ind === cardIndex ? cardConfig : origConf
      ),
    });
  });

  return {
    ...config,
    views,
  };
};

export const deleteCard = (
  config: LovelaceConfig,
  path: LovelaceCardPath
): LovelaceConfig => {
  const { viewIndex, cardIndex } = parseLovelaceCardPath(path);
  const views: LovelaceViewConfig[] = [];

  config.views.forEach((viewConf, index) => {
    if (index !== viewIndex) {
      views.push(config.views[index]);
      return;
    }

    if (isStrategyView(viewConf)) {
      throw new Error("You cannot delete a card in a strategy view.");
    }

    views.push({
      ...viewConf,
      cards: (viewConf.cards || []).filter(
        (_origConf, ind) => ind !== cardIndex
      ),
    });
  });

  return {
    ...config,
    views,
  };
};

export const insertCard = (
  config: LovelaceConfig,
  path: LovelaceCardPath,
  cardConfig: LovelaceCardConfig
) => {
  const { viewIndex, cardIndex } = parseLovelaceCardPath(path);
  const views: LovelaceViewConfig[] = [];

  config.views.forEach((viewConf, index) => {
    if (index !== viewIndex) {
      views.push(config.views[index]);
      return;
    }

    if (isStrategyView(viewConf)) {
      throw new Error("You cannot insert a card in a strategy view.");
    }

    const cards = viewConf.cards
      ? [
          ...viewConf.cards.slice(0, cardIndex),
          cardConfig,
          ...viewConf.cards.slice(cardIndex),
        ]
      : [cardConfig];

    views.push({
      ...viewConf,
      cards,
    });
  });

  return {
    ...config,
    views,
  };
};

export const swapCard = (
  config: LovelaceConfig,
  path1: LovelaceCardPath,
  path2: LovelaceCardPath
): LovelaceConfig => {
  const { viewIndex: viewIndex1, cardIndex: cardIndex1 } =
    parseLovelaceCardPath(path1);
  const { viewIndex: viewIndex2, cardIndex: cardIndex2 } =
    parseLovelaceCardPath(path2);

  const origView1 = config.views[viewIndex1];
  const origView2 = config.views[viewIndex2];

  if (isStrategyView(origView1) || isStrategyView(origView2)) {
    throw new Error("You cannot move swap cards in a strategy view.");
  }

  const card1 = origView1.cards![cardIndex1];
  const card2 = origView2.cards![cardIndex2];

  const newView1 = {
    ...origView1,
    cards: origView1.cards!.map((origCard, index) =>
      index === cardIndex1 ? card2 : origCard
    ),
  };

  const updatedOrigView2 = viewIndex1 === viewIndex2 ? newView1 : origView2;
  const newView2 = {
    ...updatedOrigView2,
    cards: updatedOrigView2.cards!.map((origCard, index) =>
      index === cardIndex2 ? card1 : origCard
    ),
  };

  return {
    ...config,
    views: config.views.map((origView, index) =>
      index === viewIndex2
        ? newView2
        : index === viewIndex1
          ? newView1
          : origView
    ),
  };
};

export const moveCardToPosition = (
  config: LovelaceConfig,
  path: LovelaceCardPath,
  position: number
): LovelaceConfig => {
  const { viewIndex, cardIndex } = parseLovelaceCardPath(path);
  const view = config.views[viewIndex];

  if (isStrategyView(view)) {
    throw new Error("You cannot move a card in a strategy view.");
  }

  const oldIndex = cardIndex;
  const newIndex = Math.max(Math.min(position - 1, view.cards!.length - 1), 0);

  const newCards = [...view.cards!];

  const card = newCards[oldIndex];
  newCards.splice(oldIndex, 1);
  newCards.splice(newIndex, 0, card);

  const newView = {
    ...view,
    cards: newCards,
  };

  return {
    ...config,
    views: config.views.map((origView, index) =>
      index === viewIndex ? newView : origView
    ),
  };
};

export const moveCard = (
  config: LovelaceConfig,
  fromPath: LovelaceCardPath,
  toPath: LovelaceContainerPath
): LovelaceConfig => {
  const { viewIndex: fromViewIndex, cardIndex: fromCardIndex } =
    parseLovelaceCardPath(fromPath);
  const { viewIndex: toViewIndex } = parseLovelaceContainerPath(toPath);

  if (fromViewIndex === toViewIndex) {
    throw new Error("You cannot move a card to the view it is in.");
  }
  const fromView = config.views[fromViewIndex];
  const toView = config.views[toViewIndex];

  if (isStrategyView(fromView)) {
    throw new Error("You cannot move a card from a strategy view.");
  }

  if (isStrategyView(toView)) {
    throw new Error("You cannot move a card to a strategy view.");
  }

  const card = fromView.cards![fromCardIndex];

  const newView1 = {
    ...fromView,
    cards: (fromView.cards || []).filter(
      (_origConf, ind) => ind !== fromCardIndex
    ),
  };

  const cards = toView.cards ? [...toView.cards, card] : [card];

  const newView2 = {
    ...toView,
    cards,
  };

  return {
    ...config,
    views: config.views.map((origView, index) =>
      index === toViewIndex
        ? newView2
        : index === fromViewIndex
          ? newView1
          : origView
    ),
  };
};

export const addView = (
  hass: HomeAssistant,
  config: LovelaceConfig,
  viewConfig: LovelaceViewConfig
): LovelaceConfig => {
  if (viewConfig.path && config.views.some((v) => v.path === viewConfig.path)) {
    throw new Error(
      hass.localize("ui.panel.lovelace.editor.edit_view.error_same_url")
    );
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
