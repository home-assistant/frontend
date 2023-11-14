import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import { LovelaceDashboardConfig } from "../../../data/lovelace/config/dashboard";
import {
  LovelaceViewConfig,
  isStrategyView,
} from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";

export const addCard = (
  config: LovelaceDashboardConfig,
  path: [number],
  cardConfig: LovelaceCardConfig
): LovelaceDashboardConfig => {
  const [viewIndex] = path;
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
  config: LovelaceDashboardConfig,
  path: [number],
  cardConfigs: LovelaceCardConfig[]
): LovelaceDashboardConfig => {
  const [viewIndex] = path;
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
  config: LovelaceDashboardConfig,
  path: [number, number],
  cardConfig: LovelaceCardConfig
): LovelaceDashboardConfig => {
  const [viewIndex, cardIndex] = path;
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
  config: LovelaceDashboardConfig,
  path: [number, number]
): LovelaceDashboardConfig => {
  const [viewIndex, cardIndex] = path;
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
  config: LovelaceDashboardConfig,
  path: [number, number],
  cardConfig: LovelaceCardConfig
) => {
  const [viewIndex, cardIndex] = path;
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
  config: LovelaceDashboardConfig,
  path1: [number, number],
  path2: [number, number]
): LovelaceDashboardConfig => {
  const origView1 = config.views[path1[0]];
  const origView2 = config.views[path2[0]];

  if (isStrategyView(origView1) || isStrategyView(origView2)) {
    throw new Error("You cannot move swap cards in a strategy view.");
  }

  const card1 = origView1.cards![path1[1]];
  const card2 = origView2.cards![path2[1]];

  const newView1 = {
    ...origView1,
    cards: origView1.cards!.map((origCard, index) =>
      index === path1[1] ? card2 : origCard
    ),
  };

  const updatedOrigView2 = path1[0] === path2[0] ? newView1 : origView2;
  const newView2 = {
    ...updatedOrigView2,
    cards: updatedOrigView2.cards!.map((origCard, index) =>
      index === path2[1] ? card1 : origCard
    ),
  };

  return {
    ...config,
    views: config.views.map((origView, index) =>
      index === path2[0] ? newView2 : index === path1[0] ? newView1 : origView
    ),
  };
};

export const moveCardToPosition = (
  config: LovelaceDashboardConfig,
  path: [number, number],
  position: number
): LovelaceDashboardConfig => {
  const view = config.views[path[0]];

  if (isStrategyView(view)) {
    throw new Error("You cannot move a card in a strategy view.");
  }

  const oldIndex = path[1];
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
      index === path[0] ? newView : origView
    ),
  };
};

export const moveCard = (
  config: LovelaceDashboardConfig,
  fromPath: [number, number],
  toPath: [number]
): LovelaceDashboardConfig => {
  if (fromPath[0] === toPath[0]) {
    throw new Error("You cannot move a card to the view it is in.");
  }
  const fromView = config.views[fromPath[0]];
  const toView = config.views[toPath[0]];

  if (isStrategyView(fromView)) {
    throw new Error("You cannot move a card from a strategy view.");
  }

  if (isStrategyView(toView)) {
    throw new Error("You cannot move a card to a strategy view.");
  }

  const card = fromView.cards![fromPath[1]];

  const newView1 = {
    ...fromView,
    cards: (fromView.cards || []).filter(
      (_origConf, ind) => ind !== fromPath[1]
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
      index === toPath[0]
        ? newView2
        : index === fromPath[0]
        ? newView1
        : origView
    ),
  };
};

export const addView = (
  hass: HomeAssistant,
  config: LovelaceDashboardConfig,
  viewConfig: LovelaceViewConfig
): LovelaceDashboardConfig => {
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
  config: LovelaceDashboardConfig,
  viewIndex: number,
  viewConfig: LovelaceViewConfig
): LovelaceDashboardConfig => {
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
  config: LovelaceDashboardConfig,
  path1: number,
  path2: number
): LovelaceDashboardConfig => {
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
  config: LovelaceDashboardConfig,
  viewIndex: number
): LovelaceDashboardConfig => ({
  ...config,
  views: config.views.filter((_origView, index) => index !== viewIndex),
});
