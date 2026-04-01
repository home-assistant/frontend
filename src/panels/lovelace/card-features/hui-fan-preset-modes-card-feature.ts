import { mdiTuneVariant } from "@mdi/js";
import { customElement } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { FanEntity } from "../../../data/fan";
import { FanEntityFeature } from "../../../data/fan";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { HuiModeSelectCardFeatureBase } from "./hui-mode-select-card-feature-base";
import type {
  FanPresetModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsFanPresetModesCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "fan" && supportsFeature(stateObj, FanEntityFeature.PRESET_MODE)
  );
};

@customElement("hui-fan-preset-modes-card-feature")
class HuiFanPresetModesCardFeature
  extends HuiModeSelectCardFeatureBase<
    FanEntity,
    FanPresetModesCardFeatureConfig
  >
  implements LovelaceCardFeature
{
  protected readonly _attribute = "preset_mode";

  protected readonly _modesAttribute = "preset_modes";

  protected get _configuredModes() {
    return this._config?.preset_modes;
  }

  protected readonly _dropdownIconPath = mdiTuneVariant;

  protected readonly _serviceDomain = "fan";

  protected readonly _serviceAction = "set_preset_mode";

  protected readonly _serviceValueKey = "preset_mode";

  static getStubConfig(): FanPresetModesCardFeatureConfig {
    return {
      type: "fan-preset-modes",
      style: "dropdown",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-fan-preset-modes-card-feature-editor");
    return document.createElement("hui-fan-preset-modes-card-feature-editor");
  }

  protected _isSupported(): boolean {
    return !!(
      this.hass &&
      this.context &&
      supportsFanPresetModesCardFeature(this.hass, this.context)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-fan-preset-modes-card-feature": HuiFanPresetModesCardFeature;
  }
}
