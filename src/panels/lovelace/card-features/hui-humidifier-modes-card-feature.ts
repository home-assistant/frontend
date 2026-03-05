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
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { HumidifierEntity } from "../../../data/humidifier";
import { HumidifierEntityFeature } from "../../../data/humidifier";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import { filterModes } from "./common/filter-modes";
import type {
  HumidifierModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsHumidifierModesCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "humidifier" &&
    supportsFeature(stateObj, HumidifierEntityFeature.MODES)
  );
};

@customElement("hui-humidifier-modes-card-feature")
class HuiHumidifierModesCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: HumidifierModesCardFeatureConfig;

  @state() _currentMode?: string;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as
      | HumidifierEntity
      | undefined;
  }

  static getStubConfig(): HumidifierModesCardFeatureConfig {
    return {
      type: "humidifier-modes",
      style: "dropdown",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-humidifier-modes-card-feature-editor");
    return document.createElement("hui-humidifier-modes-card-feature-editor");
  }

  public setConfig(config: HumidifierModesCardFeatureConfig): void {
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
        this._currentMode = this._stateObj.attributes.mode;
      }
    }
  }

  private async _valueChanged(
    ev: CustomEvent<{ value?: string; item?: { value: string } }>
  ) {
    const mode = ev.detail.value ?? ev.detail.item?.value;

    const oldMode = this._stateObj!.attributes.mode;

    if (mode === oldMode || !mode) {
      return;
    }

    this._currentMode = mode;

    try {
      await this._setMode(mode);
    } catch (_err) {
      this._currentMode = oldMode;
    }
  }

  private async _setMode(mode: string) {
    await this.hass!.callService("humidifier", "set_mode", {
      entity_id: this._stateObj!.entity_id,
      mode: mode,
    });
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsHumidifierModesCardFeature(this.hass, this.context)
    ) {
      return null;
    }

    const stateObj = this._stateObj;

    const options = filterModes(
      stateObj.attributes.available_modes,
      this._config!.modes
    ).map((mode) => ({
      value: mode,
      label: this.hass!.formatEntityAttributeValue(
        this._stateObj!,
        "mode",
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
              attribute="mode"
              .attributeValue=${option.value}
            ></ha-attribute-icon>`,
          }))}
          .value=${this._currentMode}
          @value-changed=${this._valueChanged}
          hide-option-label
          .label=${this.hass!.formatEntityAttributeName(stateObj, "mode")}
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
        .label=${this.hass!.formatEntityAttributeName(stateObj, "mode")}
        .value=${this._currentMode}
        .disabled=${this._stateObj.state === UNAVAILABLE}
        @wa-select=${this._valueChanged}
        .options=${options.map((option) => ({
          ...option,
          attributeIcon: {
            stateObj,
            attribute: "mode",
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
    "hui-humidifier-modes-card-feature": HuiHumidifierModesCardFeature;
  }
}
