import type { HassEntity } from "home-assistant-js-websocket";
import { customElement } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { FanDirection, FanEntity } from "../../../data/fan";
import { FanEntityFeature } from "../../../data/fan";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import {
  HuiModeSelectCardFeatureBase,
  type HuiModeSelectOption,
} from "./hui-mode-select-card-feature-base";
import type {
  FanDirectionCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const FAN_DIRECTIONS: FanDirection[] = ["forward", "reverse"];

const supportsFanDirectionCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "fan" && supportsFeature(stateObj, FanEntityFeature.DIRECTION)
  );
};

export const supportsFanDirectionCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsFanDirectionCardFeatureFromState(stateObj);
};

@customElement("hui-fan-direction-card-feature")
class HuiFanDirectionCardFeature
  extends HuiModeSelectCardFeatureBase<FanEntity, FanDirectionCardFeatureConfig>
  implements LovelaceCardFeature
{
  protected readonly _attribute = "direction";

  protected readonly _modesAttribute = "direction";

  protected readonly _serviceDomain = "fan";

  protected readonly _serviceAction = "set_direction";

  protected readonly _defaultStyle = "icons";

  static getStubConfig(): FanDirectionCardFeatureConfig {
    return {
      type: "fan-direction",
    };
  }

  protected _getOptions(): HuiModeSelectOption[] {
    if (!this._stateObj) {
      return [];
    }

    return FAN_DIRECTIONS.map((direction) => ({
      value: direction,
      label: this._localize(`ui.card.fan.${direction}`),
    }));
  }

  protected _isSupported(): boolean {
    return !!(
      this._stateObj && supportsFanDirectionCardFeatureFromState(this._stateObj)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-fan-direction-card-feature": HuiFanDirectionCardFeature;
  }
}
