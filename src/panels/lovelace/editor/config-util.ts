import {
  LovelaceCardConfig,
  LovelaceConfig,
  LovelaceViewConfig,
} from "../../../data/lovelace";
import type { HomeAssistant } from "../../../types";

export const addCard = (
  config: LovelaceConfig,
  path: [number],
  cardConfig: LovelaceCardConfig
): LovelaceConfig => {
  const [viewIndex] = path;
  const views: LovelaceViewConfig[] = [];

  config.views.forEach((viewConf, index) => {
    if (index !== viewIndex) {
      views.push(config.views[index]);
      return;
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
  path: [number],
  cardConfigs: LovelaceCardConfig[]
): LovelaceConfig => {
  const [viewIndex] = path;
  const views: LovelaceViewConfig[] = [];

  config.views.forEach((viewConf, index) => {
    if (index !== viewIndex) {
      views.push(config.views[index]);
      return;
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
  path: [number, number],
  cardConfig: LovelaceCardConfig
): LovelaceConfig => {
  const [viewIndex, cardIndex] = path;
  const views: LovelaceViewConfig[] = [];

  config.views.forEach((viewConf, index) => {
    if (index !== viewIndex) {
      views.push(config.views[index]);
      return;
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
  path: [number, number]
): LovelaceConfig => {
  const [viewIndex, cardIndex] = path;
  const views: LovelaceViewConfig[] = [];

  config.views.forEach((viewConf, index) => {
    if (index !== viewIndex) {
      views.push(config.views[index]);
      return;
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
  path1: [number, number],
  path2: [number, number]
): LovelaceConfig => {
  const card1 = config.views[path1[0]].cards![path1[1]];
  const card2 = config.views[path2[0]].cards![path2[1]];

  const origView1 = config.views[path1[0]];
  const newView1 = {
    ...origView1,
    cards: origView1.cards!.map((origCard, index) =>
      index === path1[1] ? card2 : origCard
    ),
  };

  const origView2 = path1[0] === path2[0] ? newView1 : config.views[path2[0]];
  const newView2 = {
    ...origView2,
    cards: origView2.cards!.map((origCard, index) =>
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
  config: LovelaceConfig,
  path: [number, number],
  position: number
) => {
  const view = config.views[path[0]];

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
  config: LovelaceConfig,
  fromPath: [number, number],
  toPath: [number]
): LovelaceConfig => {
  if (fromPath[0] === toPath[0]) {
    throw new Error("You cannot move a card to the view it is in.");
  }
  const fromView = config.views[fromPath[0]];
  const card = fromView.cards![fromPath[1]];

  const newView1 = {
    ...fromView,
    cards: (fromView.cards || []).filter(
      (_origConf, ind) => ind !== fromPath[1]
    ),
  };

  const toView = config.views[toPath[0]];
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
