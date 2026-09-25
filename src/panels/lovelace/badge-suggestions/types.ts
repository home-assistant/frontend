import type { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";
import type { HomeAssistant } from "../../../types";

export interface BadgeSuggestion<
  T extends LovelaceBadgeConfig = LovelaceBadgeConfig,
> {
  label?: string;
  config: T;
}

export interface BadgeSuggestionProvider<
  T extends LovelaceBadgeConfig = LovelaceBadgeConfig,
> {
  getEntitySuggestion(
    hass: HomeAssistant,
    entityId: string
  ): BadgeSuggestion<T> | BadgeSuggestion<T>[] | null;
}
