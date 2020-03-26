export interface CustomCardEntry {
  type: string;
  name?: string;
  description?: string;
  preview?: boolean;
}

export interface CustomCardsWindow {
  customCards?: CustomCardEntry[];
}

export const getCustomCards = () => {
  return ((window as CustomCardsWindow).customCards || []).filter((card) => {
    return card.type !== undefined;
  });
};

export const getCustomCardEntry = (type: string) => {
  if (type.startsWith("custom:")) {
    return getCustomCards().find((card) => `custom:${card.type}` === type);
  }
  return undefined;
};
