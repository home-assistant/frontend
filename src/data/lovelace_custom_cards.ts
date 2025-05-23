import type { HassEntity } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../types";
import type { LovelaceCardFeatureContext } from "../panels/lovelace/card-features/types";

export interface CustomCardEntry {
  type: string;
  name?: string;
  description?: string;
  preview?: boolean;
  documentationURL?: string;
}

export interface CustomBadgeEntry {
  type: string;
  name?: string;
  description?: string;
  preview?: boolean;
  documentationURL?: string;
}

export interface CustomCardFeatureEntry {
  type: string;
  name?: string;
  /** @deprecated Use `supportsFeature` */
  supported?: (stateObj: HassEntity) => boolean;
  supportsFeature?: (
    hass: HomeAssistant,
    context: LovelaceCardFeatureContext
  ) => boolean;
  configurable?: boolean;
}

export interface CustomCardsWindow {
  customCards?: CustomCardEntry[];
  customCardFeatures?: CustomCardFeatureEntry[];
  customBadges?: CustomBadgeEntry[];
  /**
   * @deprecated Use customCardFeatures
   */
  customTileFeatures?: CustomCardFeatureEntry[];
}

export const CUSTOM_TYPE_PREFIX = "custom:";

const customCardsWindow = window as CustomCardsWindow;

if (!("customCards" in customCardsWindow)) {
  customCardsWindow.customCards = [];
}
if (!("customCardFeatures" in customCardsWindow)) {
  customCardsWindow.customCardFeatures = [];
}
if (!("customBadges" in customCardsWindow)) {
  customCardsWindow.customBadges = [];
}
if (!("customTileFeatures" in customCardsWindow)) {
  customCardsWindow.customTileFeatures = [];
}

export const customCards = customCardsWindow.customCards!;
export const getCustomCardFeatures = () => [
  ...customCardsWindow.customCardFeatures!,
  ...customCardsWindow.customTileFeatures!,
];
export const customBadges = customCardsWindow.customBadges!;

export const getCustomCardEntry = (type: string) =>
  customCards.find((card) => card.type === type);

export const getCustomBadgeEntry = (type: string) =>
  customBadges.find((badge) => badge.type === type);

export const isCustomType = (type: string) =>
  type.startsWith(CUSTOM_TYPE_PREFIX);

export const stripCustomPrefix = (type: string) =>
  type.slice(CUSTOM_TYPE_PREFIX.length);
