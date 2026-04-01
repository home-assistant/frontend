import { mdiArrowOscillating } from "@mdi/js";
import { customElement } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { ClimateEntity } from "../../../data/climate";
import { ClimateEntityFeature } from "../../../data/climate";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { HuiModeSelectCardFeatureBase } from "./hui-mode-select-card-feature-base";
import type {
  ClimateSwingHorizontalModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsClimateSwingHorizontalModesCardFeature = (
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
    supportsFeature(stateObj, ClimateEntityFeature.SWING_HORIZONTAL_MODE)
  );
};

@customElement("hui-climate-swing-horizontal-modes-card-feature")
class HuiClimateSwingHorizontalModesCardFeature
  extends HuiModeSelectCardFeatureBase<
    ClimateEntity,
    ClimateSwingHorizontalModesCardFeatureConfig
  >
  implements LovelaceCardFeature
{
  protected readonly _attribute = "swing_horizontal_mode";

  protected readonly _modesAttribute = "swing_horizontal_modes";

  protected get _configuredModes() {
    return this._config?.swing_horizontal_modes;
  }

  protected readonly _dropdownIconPath = mdiArrowOscillating;

  protected readonly _serviceDomain = "climate";

  protected readonly _serviceAction = "set_swing_horizontal_mode";

  protected readonly _serviceValueKey = "swing_horizontal_mode";

  static getStubConfig(): ClimateSwingHorizontalModesCardFeatureConfig {
    return {
      type: "climate-swing-horizontal-modes",
      style: "dropdown",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-climate-swing-horizontal-modes-card-feature-editor");
    return document.createElement(
      "hui-climate-swing-horizontal-modes-card-feature-editor"
    );
  }

  protected _isSupported(): boolean {
    return !!(
      this.hass &&
      this.context &&
      supportsClimateSwingHorizontalModesCardFeature(this.hass, this.context)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-swing-horizontal-modes-card-feature": HuiClimateSwingHorizontalModesCardFeature;
  }
}
