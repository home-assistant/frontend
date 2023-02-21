import type { HassEntity } from "home-assistant-js-websocket";

export interface CustomCardEntry {
  type: string;
  name?: string;
  description?: string;
  preview?: boolean;
  documentationURL?: string;
}

export interface CustomTileFeatureEntry {
  type: string;
  name?: string;
  supported?: (stateObj: HassEntity) => boolean;
  configurable?: boolean;
}

export interface CustomCardsWindow {
  customCards?: CustomCardEntry[];
  customTileFeatures?: CustomTileFeatureEntry[];
}

export const CUSTOM_TYPE_PREFIX = "custom:";

const customCardsWindow = window as CustomCardsWindow;

if (!("customCards" in customCardsWindow)) {
  customCardsWindow.customCards = [];
}
if (!("customTileFeatures" in customCardsWindow)) {
  customCardsWindow.customTileFeatures = [];
}

export const customCards = customCardsWindow.customCards!;
export const customTileFeatures = customCardsWindow.customTileFeatures!;

export const getCustomCardEntry = (type: string) =>
  customCards.find((card) => card.type === type);

export const isCustomType = (type: string) =>
  type.startsWith(CUSTOM_TYPE_PREFIX);

export const stripCustomPrefix = (type: string) =>
  type.slice(CUSTOM_TYPE_PREFIX.length);
