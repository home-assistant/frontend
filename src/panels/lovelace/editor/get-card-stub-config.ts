import { HomeAssistant } from "../../../types";
import { LovelaceCardConfig, LovelaceConfig } from "../../../data/lovelace";
import { getCardElementClass } from "../create-element/create-card-element";

export const getCardStubConfig = async (
  hass: HomeAssistant,
  lovelaceConfig: LovelaceConfig,
  type: string,
  entities?: string[],
  entitiesFill?: string[]
): Promise<LovelaceCardConfig> => {
  let cardConfig: LovelaceCardConfig = { type };

  const elClass = await getCardElementClass(type);

  if (elClass && elClass.getStubConfig) {
    const classStubConfig = elClass.getStubConfig(
      hass,
      lovelaceConfig,
      entities,
      entitiesFill
    );

    cardConfig = { ...cardConfig, ...classStubConfig };
  }

  return cardConfig;
};
