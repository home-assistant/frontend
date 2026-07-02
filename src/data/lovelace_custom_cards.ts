import type { HassEntity } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../types";
import type { LovelaceCardFeatureContext } from "../panels/lovelace/card-features/types";
import type { LovelaceBadgeConfig } from "./lovelace/config/badge";
import type { LovelaceCardConfig } from "./lovelace/config/card";

export interface CustomCardSuggestion<
  T extends LovelaceCardConfig = LovelaceCardConfig,
> {
  label?: string;
  config: T;
}

export interface CustomBadgeSuggestion<
  T extends LovelaceBadgeConfig = LovelaceBadgeConfig,
> {
  label?: string;
  config: T;
}

export interface CustomCardEntry {
  type: string;
  name?: string;
  description?: string;
  preview?: boolean;
  documentationURL?: string;
  getEntitySuggestion?: (
    hass: HomeAssistant,
    entityId: string
  ) => CustomCardSuggestion | CustomCardSuggestion[] | null;
}

export interface CustomBadgeEntry {
  type: string;
  name?: string;
  description?: string;
  preview?: boolean;
  documentationURL?: string;
  getEntitySuggestion?: (
    hass: HomeAssistant,
    entityId: string
  ) => CustomBadgeSuggestion | CustomBadgeSuggestion[] | null;
}

export interface CustomCardFeatureEntry {
  type: string;
  name?: string;
  /** @deprecated Use `isSupported` */
  supported?: (stateObj: HassEntity) => boolean;
  isSupported?: (
    hass: HomeAssistant,
    context: LovelaceCardFeatureContext
  ) => boolean;
  configurable?: boolean;
}

/**
 * Registration payload pushed by a HACS card author to enroll a custom card
 * into the energy dashboard strategy and "Customise energy" dialog.
 *
 * Call `window.registerEnergyCard(type, view[, options])` — do not push to
 * this array directly, as the function applies safe defaults.
 */
export interface EnergyCardRegistration {
  /** Custom element type name, without the "custom:" prefix. */
  type: string;
  /**
   * Energy dashboard view the card should appear in.
   * One of: "overview" | "electricity" | "gas" | "water" | "now"
   */
  view: string;
  /** Display label shown in the "Customise energy" toggle list. Defaults to the element type name. */
  label?: string;
  /**
   * Optional predicate that receives the user's energy preferences and returns
   * whether the card is applicable. When omitted the card appears whenever the
   * target view itself is shown (e.g. a gas-view card appears iff there is a
   * gas source configured).
   */
  isApplicable?: (prefs: unknown) => boolean;
}

export interface CustomCardsWindow {
  customCards?: CustomCardEntry[];
  customCardFeatures?: CustomCardFeatureEntry[];
  customBadges?: CustomBadgeEntry[];
  /**
   * @deprecated Use customCardFeatures
   */
  customTileFeatures?: CustomCardFeatureEntry[];
  /** Populated by `registerEnergyCard`; consumed by the energy strategy. */
  energyCardRegistrations?: EnergyCardRegistration[];
  /**
   * Register a custom card to appear in the energy dashboard and the
   * "Customise energy" dialog. Must be called after `customElements.define`.
   */
  registerEnergyCard?: (
    type: string,
    view: string,
    options?: {
      label?: string;
      isApplicable?: (prefs: unknown) => boolean;
    }
  ) => void;
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
if (!("energyCardRegistrations" in customCardsWindow)) {
  customCardsWindow.energyCardRegistrations = [];
}
if (!("registerEnergyCard" in customCardsWindow)) {
  customCardsWindow.registerEnergyCard = (type, view, options) => {
    customCardsWindow.energyCardRegistrations!.push({
      type,
      view,
      label: options?.label,
      isApplicable: options?.isApplicable,
    });
  };
}

export const customCards = customCardsWindow.customCards!;
export const getCustomCardFeatures = () => [
  ...customCardsWindow.customCardFeatures!,
  ...customCardsWindow.customTileFeatures!,
];
export const customBadges = customCardsWindow.customBadges!;
export const energyCardRegistrations =
  customCardsWindow.energyCardRegistrations!;

export const getCustomCardEntry = (type: string) =>
  customCards.find((card) => card.type === type);

export const getCustomBadgeEntry = (type: string) =>
  customBadges.find((badge) => badge.type === type);

export const isCustomType = (type: string) =>
  type.startsWith(CUSTOM_TYPE_PREFIX);

export const stripCustomPrefix = (type: string) =>
  type.slice(CUSTOM_TYPE_PREFIX.length);
