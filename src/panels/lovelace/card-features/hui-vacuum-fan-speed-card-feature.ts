import { mdiFan } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { customElement } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { VacuumEntity } from "../../../data/vacuum";
import { VacuumEntityFeature } from "../../../data/vacuum";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { HuiModeSelectCardFeatureBase } from "./hui-mode-select-card-feature-base";
import type {
  LovelaceCardFeatureContext,
  VacuumFanSpeedCardFeatureConfig,
} from "./types";

const supportsVacuumFanSpeedCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "vacuum" &&
    supportsFeature(stateObj, VacuumEntityFeature.FAN_SPEED)
  );
};

export const supportsVacuumFanSpeedCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsVacuumFanSpeedCardFeatureFromState(stateObj);
};

@customElement("hui-vacuum-fan-speed-card-feature")
class HuiVacuumFanSpeedCardFeature
  extends HuiModeSelectCardFeatureBase<
    VacuumEntity,
    VacuumFanSpeedCardFeatureConfig
  >
  implements LovelaceCardFeature
{
  protected readonly _attribute = "fan_speed";

  protected readonly _modesAttribute = "fan_speed_list";

  protected get _configuredModes() {
    return this._config?.fan_speeds;
  }

  protected readonly _dropdownIconPath = mdiFan;

  protected readonly _allowIconsStyle = false;

  protected readonly _showDropdownOptionIcons = false;

  protected readonly _serviceDomain = "vacuum";

  protected readonly _serviceAction = "set_fan_speed";

  static getStubConfig(): VacuumFanSpeedCardFeatureConfig {
    return {
      type: "vacuum-fan-speed",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-vacuum-fan-speed-card-feature-editor");
    return document.createElement("hui-vacuum-fan-speed-card-feature-editor");
  }

  protected _isSupported(): boolean {
    return !!(
      this._stateObj &&
      supportsVacuumFanSpeedCardFeatureFromState(this._stateObj)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-vacuum-fan-speed-card-feature": HuiVacuumFanSpeedCardFeature;
  }
}
