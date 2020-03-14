import { HomeAssistant } from "../../../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { getCardElementClass } from "../create-element/create-card-element";

export const getCardStubConfig = async (
  hass: HomeAssistant,
  type: string,
  entities: string[],
  entitiesFallback: string[]
): Promise<LovelaceCardConfig> => {
  let cardConfig: LovelaceCardConfig = { type };

  const elClass = await getCardElementClass(type);

  if (elClass && elClass.getStubConfig) {
    const classStubConfig = elClass.getStubConfig(
      hass,
      entities,
      entitiesFallback
    );

    cardConfig = { ...cardConfig, ...classStubConfig };
  }

  return cardConfig;
};
