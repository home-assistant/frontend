import { customElement } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { InputSelectEntity } from "../../../data/input_select";
import type { SelectEntity } from "../../../data/select";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { filterModes } from "./common/filter-modes";
import {
  HuiModeSelectCardFeatureBase,
  type HuiModeSelectOption,
} from "./hui-mode-select-card-feature-base";
import type {
  LovelaceCardFeatureContext,
  SelectOptionsCardFeatureConfig,
} from "./types";

type SelectOptionEntity = SelectEntity | InputSelectEntity;

export const supportsSelectOptionsCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return domain === "select" || domain === "input_select";
};

@customElement("hui-select-options-card-feature")
class HuiSelectOptionsCardFeature
  extends HuiModeSelectCardFeatureBase<
    SelectOptionEntity,
    SelectOptionsCardFeatureConfig
  >
  implements LovelaceCardFeature
{
  protected readonly _attribute = "option";

  protected readonly _modesAttribute = "options";

  protected get _configuredModes() {
    return this._config?.options;
  }

  protected readonly _serviceDomain = "select";

  protected readonly _serviceAction = "select_option";

  protected get _label(): string {
    return this.hass!.localize("ui.card.select.option");
  }

  protected readonly _allowIconsStyle = false;

  protected readonly _showDropdownOptionIcons = false;

  static getStubConfig(): SelectOptionsCardFeatureConfig {
    return {
      type: "select-options",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-select-options-card-feature-editor");
    return document.createElement("hui-select-options-card-feature-editor");
  }

  protected _getValue(stateObj: SelectOptionEntity): string | undefined {
    return stateObj.state;
  }

  protected _getOptions(): HuiModeSelectOption[] {
    if (!this._stateObj || !this.hass) {
      return [];
    }

    return filterModes(
      this._stateObj.attributes.options,
      this._config?.options
    ).map((option) => ({
      value: option,
      label: this.hass!.formatEntityState(this._stateObj!, option),
    }));
  }

  protected _getServiceDomain(stateObj: SelectOptionEntity): string {
    return computeDomain(stateObj.entity_id);
  }

  protected _isValueValid(
    value: string,
    stateObj: SelectOptionEntity
  ): boolean {
    return stateObj.attributes.options.includes(value);
  }

  protected _isSupported(): boolean {
    return !!(
      this.hass &&
      this.context &&
      supportsSelectOptionsCardFeature(this.hass, this.context)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-select-options-card-feature": HuiSelectOptionsCardFeature;
  }
}
