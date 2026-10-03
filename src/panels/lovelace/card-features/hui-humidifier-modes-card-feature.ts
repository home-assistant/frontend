import { mdiTuneVariant } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { customElement } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { HumidifierEntity } from "../../../data/humidifier";
import { HumidifierEntityFeature } from "../../../data/humidifier";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { HuiModeSelectCardFeatureBase } from "./hui-mode-select-card-feature-base";
import type {
  HumidifierModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const supportsHumidifierModesCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "humidifier" &&
    supportsFeature(stateObj, HumidifierEntityFeature.MODES)
  );
};

export const supportsHumidifierModesCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsHumidifierModesCardFeatureFromState(stateObj);
};

@customElement("hui-humidifier-modes-card-feature")
class HuiHumidifierModesCardFeature
  extends HuiModeSelectCardFeatureBase<
    HumidifierEntity,
    HumidifierModesCardFeatureConfig
  >
  implements LovelaceCardFeature
{
  protected readonly _attribute = "mode";

  protected readonly _modesAttribute = "available_modes";

  protected get _configuredModes() {
    return this._config?.modes;
  }

  protected readonly _dropdownIconPath = mdiTuneVariant;

  protected readonly _serviceDomain = "humidifier";

  protected readonly _serviceAction = "set_mode";

  static getStubConfig(): HumidifierModesCardFeatureConfig {
    return {
      type: "humidifier-modes",
      style: "dropdown",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-humidifier-modes-card-feature-editor");
    return document.createElement("hui-humidifier-modes-card-feature-editor");
  }

  protected _isSupported(): boolean {
    return !!(
      this._stateObj &&
      supportsHumidifierModesCardFeatureFromState(this._stateObj)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-humidifier-modes-card-feature": HuiHumidifierModesCardFeature;
  }
}
