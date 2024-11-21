import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import { getBadgeElementClass } from "../create-element/create-badge-element";

export const getBadgeStubConfig = async (
  hass: HomeAssistant,
  type: string,
  entities: string[],
  entitiesFallback: string[]
): Promise<LovelaceCardConfig> => {
  let badgeConfig: LovelaceCardConfig = { type };

  const elClass = await getBadgeElementClass(type);

  if (elClass && elClass.getStubConfig) {
    const classStubConfig = await elClass.getStubConfig(
      hass,
      entities,
      entitiesFallback
    );

    badgeConfig = { ...badgeConfig, ...classStubConfig };
  }

  return badgeConfig;
};
