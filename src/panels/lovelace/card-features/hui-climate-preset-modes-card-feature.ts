import { mdiTuneVariant } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attribute-icon";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import "../../../components/ha-control-select-menu";
import type { HaControlSelectMenu } from "../../../components/ha-control-select-menu";
import "../../../components/ha-list-item";
import type { ClimateEntity } from "../../../data/climate";
import { ClimateEntityFeature } from "../../../data/climate";
import { UNAVAILABLE } from "../../../data/entity";
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

  @query("ha-control-select-menu", true)
  private _haSelect?: HaControlSelectMenu;

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
    await import(
      "../editor/config-elements/hui-climate-preset-modes-card-feature-editor"
    );
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

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (this._haSelect && changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (
        this.hass &&
        this.hass.formatEntityAttributeValue !==
          oldHass?.formatEntityAttributeValue
      ) {
        this._haSelect.layoutOptions();
      }
    }
  }

  private async _valueChanged(ev: CustomEvent) {
    const presetMode =
      (ev.detail as any).value ?? ((ev.target as any).value as string);

    const oldPresetMode = this._stateObj!.attributes.preset_mode;

    if (presetMode === oldPresetMode) return;

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
    ).map<ControlSelectOption>((mode) => ({
      value: mode,
      label: this.hass!.formatEntityAttributeValue(
        this._stateObj!,
        "preset_mode",
        mode
      ),
      icon: html`<ha-attribute-icon
        slot="graphic"
        .hass=${this.hass}
        .stateObj=${stateObj}
        attribute="preset_mode"
        .attributeValue=${mode}
      ></ha-attribute-icon>`,
    }));

    if (this._config.style === "icons") {
      return html`
        <ha-control-select
          .options=${options}
          .value=${this._currentPresetMode}
          @value-changed=${this._valueChanged}
          hide-label
          .ariaLabel=${this.hass!.formatEntityAttributeName(
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
        show-arrow
        hide-label
        .label=${this.hass!.formatEntityAttributeName(stateObj, "preset_mode")}
        .value=${this._currentPresetMode}
        .disabled=${this._stateObj.state === UNAVAILABLE}
        fixedMenuPosition
        naturalMenuWidth
        @selected=${this._valueChanged}
        @closed=${stopPropagation}
      >
        ${this._currentPresetMode
          ? html`<ha-attribute-icon
              slot="icon"
              .hass=${this.hass}
              .stateObj=${stateObj}
              attribute="preset_mode"
              .attributeValue=${this._currentPresetMode}
            ></ha-attribute-icon>`
          : html`
              <ha-svg-icon slot="icon" .path=${mdiTuneVariant}></ha-svg-icon>
            `}
        ${options.map(
          (option) => html`
            <ha-list-item .value=${option.value} graphic="icon">
              ${option.icon}${option.label}
            </ha-list-item>
          `
        )}
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
