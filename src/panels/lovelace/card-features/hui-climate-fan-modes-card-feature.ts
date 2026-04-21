import { mdiFan } from "@mdi/js";
import { customElement } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { ClimateEntity } from "../../../data/climate";
import { ClimateEntityFeature } from "../../../data/climate";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { HuiModeSelectCardFeatureBase } from "./hui-mode-select-card-feature-base";
import type {
  ClimateFanModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsClimateFanModesCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "climate" &&
    supportsFeature(stateObj, ClimateEntityFeature.FAN_MODE)
  );
};

@customElement("hui-climate-fan-modes-card-feature")
class HuiClimateFanModesCardFeature
  extends HuiModeSelectCardFeatureBase<
    ClimateEntity,
    ClimateFanModesCardFeatureConfig
  >
  implements LovelaceCardFeature
{
  protected readonly _attribute = "fan_mode";

  protected readonly _modesAttribute = "fan_modes";

  protected get _configuredModes() {
    return this._config?.fan_modes;
  }

  protected readonly _dropdownIconPath = mdiFan;

  protected readonly _serviceDomain = "climate";

  protected readonly _serviceAction = "set_fan_mode";

  static getStubConfig(): ClimateFanModesCardFeatureConfig {
    return {
      type: "climate-fan-modes",
      style: "dropdown",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-climate-fan-modes-card-feature-editor");
    return document.createElement("hui-climate-fan-modes-card-feature-editor");
  }

  protected _isSupported(): boolean {
    return !!(
      this.hass &&
      this.context &&
      supportsClimateFanModesCardFeature(this.hass, this.context)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-fan-modes-card-feature": HuiClimateFanModesCardFeature;
  }
}
