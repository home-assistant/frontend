export interface CustomCardEntry {
  type: string;
  name?: string;
  description?: string;
  preview?: boolean;
}

export interface CustomCardsWindow {
  customCards?: CustomCardEntry[];
}

export const CUSTOM_TYPE_PREFIX = "custom:";

const customCardsWindow = window as CustomCardsWindow;

if (!("customCards" in customCardsWindow)) {
  customCardsWindow.customCards = [];
}

export const customCards = customCardsWindow.customCards!;

export const getCustomCardEntry = (type: string) =>
  customCards.find((card) => card.type === type);
