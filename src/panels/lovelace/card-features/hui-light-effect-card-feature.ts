import { mdiCreation } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { customElement } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { LightEntity } from "../../../data/light";
import { LightEntityFeature } from "../../../data/light";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { hasConfigChanged } from "../common/has-changed";
import { HuiModeSelectCardFeatureBase } from "./hui-mode-select-card-feature-base";
import type {
  LightEffectCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const supportsLightEffectCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "light" &&
    supportsFeature(stateObj, LightEntityFeature.EFFECT) &&
    !!stateObj.attributes.effect_list?.length
  );
};

export const supportsLightEffectCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsLightEffectCardFeatureFromState(stateObj);
};

@customElement("hui-light-effect-card-feature")
class HuiLightEffectCardFeature
  extends HuiModeSelectCardFeatureBase<
    LightEntity,
    LightEffectCardFeatureConfig
  >
  implements LovelaceCardFeature
{
  protected readonly _attribute = "effect";

  protected readonly _modesAttribute = "effect_list";

  protected get _configuredModes() {
    const effects = this._config?.effects;
    return effects?.length ? effects : undefined;
  }

  protected readonly _dropdownIconPath = mdiCreation;

  protected readonly _allowIconsStyle = false;

  protected readonly _hideLabel = false;

  protected readonly _serviceDomain = "light";

  protected readonly _serviceAction = "turn_on";

  static getStubConfig(): LightEffectCardFeatureConfig {
    return {
      type: "light-effect",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-light-effect-card-feature-editor");
    return document.createElement("hui-light-effect-card-feature-editor");
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return (
      changedProps.has("_currentValue") ||
      changedProps.has("context") ||
      changedProps.has("_stateObj") ||
      hasConfigChanged(this, changedProps)
    );
  }

  protected _isSupported(): boolean {
    return !!(
      this._stateObj && supportsLightEffectCardFeatureFromState(this._stateObj)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-effect-card-feature": HuiLightEffectCardFeature;
  }
}
