import type { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";

type PastedItem = LovelaceCardConfig | LovelaceBadgeConfig;

let pending: PastedItem | undefined;

export const setCardHighlight = (item: PastedItem): void => {
  pending = item;
};

export const clearCardHighlight = (): void => {
  pending = undefined;
};

export const takeCardHighlight = (item: PastedItem | undefined): boolean => {
  if (!item || pending !== item) {
    return false;
  }
  pending = undefined;
  return true;
};
