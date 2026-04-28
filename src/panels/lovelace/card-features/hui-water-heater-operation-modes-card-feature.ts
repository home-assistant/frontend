import { mdiWaterBoiler } from "@mdi/js";
import { customElement } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import type { WaterHeaterEntity } from "../../../data/water_heater";
import { compareWaterHeaterOperationMode } from "../../../data/water_heater";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { filterModes } from "./common/filter-modes";
import { HuiModeSelectCardFeatureBase } from "./hui-mode-select-card-feature-base";
import type {
  LovelaceCardFeatureContext,
  WaterHeaterOperationModesCardFeatureConfig,
} from "./types";

export const supportsWaterHeaterOperationModesCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return domain === "water_heater";
};

@customElement("hui-water-heater-operation-modes-card-feature")
class HuiWaterHeaterOperationModeCardFeature
  extends HuiModeSelectCardFeatureBase<
    WaterHeaterEntity,
    WaterHeaterOperationModesCardFeatureConfig
  >
  implements LovelaceCardFeature
{
  protected readonly _attribute = "operation_mode";

  protected readonly _modesAttribute = "operation_list";

  protected get _configuredModes() {
    return this._config?.operation_modes;
  }

  protected readonly _dropdownIconPath = mdiWaterBoiler;

  protected readonly _serviceDomain = "water_heater";

  protected readonly _serviceAction = "set_operation_mode";

  protected get _label(): string {
    return this.hass!.localize("ui.card.water_heater.mode");
  }

  protected readonly _defaultStyle = "icons";

  protected get _controlSelectStyle():
    | Record<string, string | undefined>
    | undefined {
    if (!this._stateObj) {
      return undefined;
    }

    return {
      "--control-select-color": stateColorCss(this._stateObj),
    };
  }

  static getStubConfig(): WaterHeaterOperationModesCardFeatureConfig {
    return {
      type: "water-heater-operation-modes",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-water-heater-operation-modes-card-feature-editor");
    return document.createElement(
      "hui-water-heater-operation-modes-card-feature-editor"
    );
  }

  protected _getValue(stateObj: WaterHeaterEntity): string | undefined {
    return stateObj.state;
  }

  protected _getOptions() {
    if (!this._stateObj || !this.hass) {
      return [];
    }

    const orderedModes = (this._stateObj.attributes.operation_list || [])
      .concat()
      .sort(compareWaterHeaterOperationMode)
      .reverse();

    return filterModes(orderedModes, this._config?.operation_modes).map(
      (mode) => ({
        value: mode,
        label: this.hass!.formatEntityState(this._stateObj!, mode),
      })
    );
  }

  protected _isSupported(): boolean {
    return !!(
      this.hass &&
      this.context &&
      supportsWaterHeaterOperationModesCardFeature(this.hass, this.context)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-water-heater-operation-modes-card-feature": HuiWaterHeaterOperationModeCardFeature;
  }
}
