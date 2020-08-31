import { getHeaderFooterElementClass } from "../create-element/create-header-footer-element";
import type { LovelaceHeaderFooterEditor } from "../types";
import type { LovelaceHeaderFooterConfig } from "../header-footer/types";
import { HomeAssistant } from "../../../types";

export const getHeaderFooterEditor = async (
  hass: HomeAssistant,
  config: LovelaceHeaderFooterConfig,
  entities: string[]
): Promise<
  | {
      configElement: LovelaceHeaderFooterEditor;
      config: LovelaceHeaderFooterConfig;
    }
  | undefined
> => {
  const elClass = await getHeaderFooterElementClass(config.type);

  let configElement: LovelaceHeaderFooterEditor;
  let stubConfig: LovelaceHeaderFooterConfig | undefined;

  if (elClass && elClass.getConfigElement) {
    configElement = await elClass.getConfigElement();

    if (elClass.getStubConfig) {
      stubConfig = elClass.getStubConfig(
        hass,
        entities,
        Object.keys(hass.states)
      );
    }
  } else {
    return undefined;
  }

  return { configElement, config: { ...stubConfig, ...config } };
};
