import type { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";
import { getBadgeElementClass } from "../create-element/create-badge-element";

export const getBadgeDefaultConfig = async (
  type: string
): Promise<Partial<LovelaceBadgeConfig> | undefined> => {
  try {
    const elClass = await getBadgeElementClass(type);
    return elClass?.getDefaultConfig?.();
  } catch (_err) {
    return undefined;
  }
};
