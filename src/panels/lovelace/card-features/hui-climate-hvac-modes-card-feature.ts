import { mdiThermostat } from "@mdi/js";
import type { TemplateResult } from "lit";
import { html } from "lit";
import { customElement } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import type { ClimateEntity } from "../../../data/climate";
import {
  climateHvacModeIcon,
  compareClimateHvacModes,
} from "../../../data/climate";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { filterModes } from "./common/filter-modes";
import {
  HuiModeSelectCardFeatureBase,
  type HuiModeSelectOption,
} from "./hui-mode-select-card-feature-base";
import type {
  ClimateHvacModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

interface HvacModeOption extends HuiModeSelectOption {
  iconPath: string;
}

export const supportsClimateHvacModesCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return domain === "climate";
};

@customElement("hui-climate-hvac-modes-card-feature")
class HuiClimateHvacModesCardFeature
  extends HuiModeSelectCardFeatureBase<
    ClimateEntity,
    ClimateHvacModesCardFeatureConfig
  >
  implements LovelaceCardFeature
{
  protected readonly _attribute = "hvac_mode";

  protected readonly _modesAttribute = "hvac_modes";

  protected get _configuredModes() {
    return this._config?.hvac_modes;
  }

  protected readonly _dropdownIconPath = mdiThermostat;

  protected readonly _serviceDomain = "climate";

  protected readonly _serviceAction = "set_hvac_mode";

  protected get _label(): string {
    return this.hass!.localize("ui.card.climate.mode");
  }

  protected readonly _showDropdownOptionIcons = false;

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

  static getStubConfig(): ClimateHvacModesCardFeatureConfig {
    return {
      type: "climate-hvac-modes",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-climate-hvac-modes-card-feature-editor");
    return document.createElement("hui-climate-hvac-modes-card-feature-editor");
  }

  protected _getValue(stateObj: ClimateEntity): string | undefined {
    return stateObj.state;
  }

  protected _getOptions(): HvacModeOption[] {
    if (!this._stateObj || !this.hass) {
      return [];
    }

    const orderedHvacModes = (this._stateObj.attributes.hvac_modes || [])
      .concat()
      .sort(compareClimateHvacModes)
      .reverse();

    return filterModes(orderedHvacModes, this._config?.hvac_modes).map(
      (mode) => ({
        value: mode,
        label: this.hass!.formatEntityState(this._stateObj!, mode),
        iconPath: climateHvacModeIcon(mode),
      })
    );
  }

  protected _renderOptionIcon(option: HvacModeOption): TemplateResult<1> {
    return html`<ha-svg-icon
      slot="graphic"
      .path=${option.iconPath}
    ></ha-svg-icon>`;
  }

  protected _isSupported(): boolean {
    return !!(
      this.hass &&
      this.context &&
      supportsClimateHvacModesCardFeature(this.hass, this.context)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-hvac-modes-card-feature": HuiClimateHvacModesCardFeature;
  }
}
