import { mdiArrowOscillating } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { customElement } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { ClimateEntity } from "../../../data/climate";
import { ClimateEntityFeature } from "../../../data/climate";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { HuiModeSelectCardFeatureBase } from "./hui-mode-select-card-feature-base";
import type {
  ClimateSwingModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const supportsClimateSwingModesCardFeatureFromState = (
  stateObj: HassEntity
) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "climate" &&
    supportsFeature(stateObj, ClimateEntityFeature.SWING_MODE)
  );
};

export const supportsClimateSwingModesCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsClimateSwingModesCardFeatureFromState(stateObj);
};

@customElement("hui-climate-swing-modes-card-feature")
class HuiClimateSwingModesCardFeature
  extends HuiModeSelectCardFeatureBase<
    ClimateEntity,
    ClimateSwingModesCardFeatureConfig
  >
  implements LovelaceCardFeature
{
  protected readonly _attribute = "swing_mode";

  protected readonly _modesAttribute = "swing_modes";

  protected get _configuredModes() {
    return this._config?.swing_modes;
  }

  protected readonly _dropdownIconPath = mdiArrowOscillating;

  protected readonly _serviceDomain = "climate";

  protected readonly _serviceAction = "set_swing_mode";

  static getStubConfig(): ClimateSwingModesCardFeatureConfig {
    return {
      type: "climate-swing-modes",
      style: "dropdown",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-climate-swing-modes-card-feature-editor");
    return document.createElement(
      "hui-climate-swing-modes-card-feature-editor"
    );
  }

  protected _isSupported(): boolean {
    return !!(
      this._stateObj &&
      supportsClimateSwingModesCardFeatureFromState(this._stateObj)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-swing-modes-card-feature": HuiClimateSwingModesCardFeature;
  }
}
