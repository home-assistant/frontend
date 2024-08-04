import { LovelaceElementConfig } from "../elements/types";
import { HomeAssistant } from "../../../types";
import { getPictureElementClass } from "../create-element/create-picture-element";

export const getElementStubConfig = async (
  hass: HomeAssistant,
  type: string,
  entities: string[],
  entitiesFallback: string[]
): Promise<LovelaceElementConfig> => {
  let elementConfig: LovelaceElementConfig = { type };

  if (type !== "conditional") {
    elementConfig.style = { left: "50%", top: "50%" };
  }

  const elClass = await getPictureElementClass(type);

  if (elClass && elClass.getStubConfig) {
    const classStubConfig = await elClass.getStubConfig(
      hass,
      entities,
      entitiesFallback
    );

    elementConfig = { ...elementConfig, ...classStubConfig };
  }

  return elementConfig;
};
