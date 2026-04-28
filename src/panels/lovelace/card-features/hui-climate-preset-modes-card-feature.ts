import { mdiTuneVariant } from "@mdi/js";
import { customElement } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { ClimateEntity } from "../../../data/climate";
import { ClimateEntityFeature } from "../../../data/climate";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { HuiModeSelectCardFeatureBase } from "./hui-mode-select-card-feature-base";
import type {
  ClimatePresetModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsClimatePresetModesCardFeature = (
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
    supportsFeature(stateObj, ClimateEntityFeature.PRESET_MODE)
  );
};

@customElement("hui-climate-preset-modes-card-feature")
class HuiClimatePresetModesCardFeature
  extends HuiModeSelectCardFeatureBase<
    ClimateEntity,
    ClimatePresetModesCardFeatureConfig
  >
  implements LovelaceCardFeature
{
  protected readonly _attribute = "preset_mode";

  protected readonly _modesAttribute = "preset_modes";

  protected get _configuredModes() {
    return this._config?.preset_modes;
  }

  protected readonly _dropdownIconPath = mdiTuneVariant;

  protected readonly _serviceDomain = "climate";

  protected readonly _serviceAction = "set_preset_mode";

  static getStubConfig(): ClimatePresetModesCardFeatureConfig {
    return {
      type: "climate-preset-modes",
      style: "dropdown",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-climate-preset-modes-card-feature-editor");
    return document.createElement(
      "hui-climate-preset-modes-card-feature-editor"
    );
  }

  protected _isSupported(): boolean {
    return !!(
      this.hass &&
      this.context &&
      supportsClimatePresetModesCardFeature(this.hass, this.context)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-preset-modes-card-feature": HuiClimatePresetModesCardFeature;
  }
}
