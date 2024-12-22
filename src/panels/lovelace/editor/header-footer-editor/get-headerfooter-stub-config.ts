import { HomeAssistant } from "../../../../types";
import { getHeaderFooterElementClass } from "../../create-element/create-header-footer-element";
import { LovelaceHeaderFooterConfig } from "../../header-footer/types";

export const getHeaderFooterStubConfig = async (
  hass: HomeAssistant,
  type: LovelaceHeaderFooterConfig["type"],
  entities: string[],
  entitiesFallback: string[]
): Promise<LovelaceHeaderFooterConfig> => {
  let config: LovelaceHeaderFooterConfig = { type };

  const elClass = await getHeaderFooterElementClass(type);

  if (elClass && elClass.getStubConfig) {
    const classStubConfig = await elClass.getStubConfig(
      hass,
      entities,
      entitiesFallback
    );

    config = { ...config, ...classStubConfig };
  }

  return config;
};
