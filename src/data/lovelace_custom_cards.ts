export interface CustomCardEntry {
  type: string;
  name?: string;
  description?: string;
  preview?: boolean;
}

export interface CustomCardsWindow {
  customCards?: CustomCardEntry[];
}

const customCardsWindow = window as CustomCardsWindow;

if (!("customCards" in customCardsWindow)) {
  customCardsWindow.customCards = [];
}

export const customCards = customCardsWindow.customCards!;

export const getCustomCardEntry = (type: string) =>
  customCards.find((card) => card.type === type);
