import { mdiTuneVariant } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attribute-icon";
import "../../../components/ha-control-select";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-list-item";
import type { ClimateEntity } from "../../../data/climate";
import { ClimateEntityFeature } from "../../../data/climate";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import { filterModes } from "./common/filter-modes";
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
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: ClimatePresetModesCardFeatureConfig;

  @state() _currentPresetMode?: string;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as
      | ClimateEntity
      | undefined;
  }

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

  public setConfig(config: ClimatePresetModesCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (
      (changedProp.has("hass") || changedProp.has("context")) &&
      this._stateObj
    ) {
      const oldHass = changedProp.get("hass") as HomeAssistant | undefined;
      const oldStateObj = oldHass?.states[this.context!.entity_id!];
      if (oldStateObj !== this._stateObj) {
        this._currentPresetMode = this._stateObj.attributes.preset_mode;
      }
    }
  }

  private async _valueChanged(
    ev: CustomEvent<{ value?: string; item?: { value: string } }>
  ) {
    const presetMode = ev.detail.value ?? ev.detail.item?.value;

    const oldPresetMode = this._stateObj!.attributes.preset_mode;

    if (presetMode === oldPresetMode || !presetMode) {
      return;
    }

    this._currentPresetMode = presetMode;

    try {
      await this._setMode(presetMode);
    } catch (_err) {
      this._currentPresetMode = oldPresetMode;
    }
  }

  private async _setMode(mode: string) {
    await this.hass!.callService("climate", "set_preset_mode", {
      entity_id: this._stateObj!.entity_id,
      preset_mode: mode,
    });
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsClimatePresetModesCardFeature(this.hass, this.context)
    ) {
      return null;
    }

    const stateObj = this._stateObj;

    const options = filterModes(
      stateObj.attributes.preset_modes,
      this._config!.preset_modes
    ).map((mode) => ({
      value: mode,
      label: this.hass!.formatEntityAttributeValue(
        this._stateObj!,
        "preset_mode",
        mode
      ),
    }));

    if (this._config.style === "icons") {
      return html`
        <ha-control-select
          .options=${options.map((option) => ({
            ...option,
            icon: html`<ha-attribute-icon
              slot="graphic"
              .hass=${this.hass}
              .stateObj=${stateObj}
              attribute="preset_mode"
              .attributeValue=${option.value}
            ></ha-attribute-icon>`,
          }))}
          .value=${this._currentPresetMode}
          @value-changed=${this._valueChanged}
          hide-option-label
          .label=${this.hass!.formatEntityAttributeName(
            stateObj,
            "preset_mode"
          )}
          .disabled=${this._stateObj!.state === UNAVAILABLE}
        >
        </ha-control-select>
      `;
    }

    return html`
      <ha-control-select-menu
        .hass=${this.hass}
        show-arrow
        hide-label
        .label=${this.hass!.formatEntityAttributeName(stateObj, "preset_mode")}
        .value=${this._currentPresetMode}
        .disabled=${this._stateObj.state === UNAVAILABLE}
        @wa-select=${this._valueChanged}
        .options=${options.map((option) => ({
          ...option,
          attributeIcon: {
            stateObj: stateObj,
            attribute: "preset_mode",
            attributeValue: option.value,
          },
        }))}
      >
        <ha-svg-icon slot="icon" .path=${mdiTuneVariant}></ha-svg-icon>
      </ha-control-select-menu>
    `;
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-preset-modes-card-feature": HuiClimatePresetModesCardFeature;
  }
}
