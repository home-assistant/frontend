import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import { getCardElementClass } from "../create-element/create-card-element";

export const getCardDefaultConfig = async (
  type: string
): Promise<Partial<LovelaceCardConfig> | undefined> => {
  try {
    const elClass = await getCardElementClass(type);
    return elClass?.getDefaultConfig?.();
  } catch (_err) {
    return undefined;
  }
};
