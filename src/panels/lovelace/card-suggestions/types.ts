import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";

export interface CardSuggestion<
  T extends LovelaceCardConfig = LovelaceCardConfig,
> {
  id: string;
  label: string;
  config: T;
}

export interface CardSuggestionProvider<
  T extends LovelaceCardConfig = LovelaceCardConfig,
> {
  getEntitySuggestion(
    hass: HomeAssistant,
    entityId: string
  ): CardSuggestion<T> | CardSuggestion<T>[] | null;
}
