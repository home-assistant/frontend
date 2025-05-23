import { mdiThermostat } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import "../../../components/ha-control-select-menu";
import type { HaControlSelectMenu } from "../../../components/ha-control-select-menu";
import "../../../components/ha-list-item";
import type { ClimateEntity, HvacMode } from "../../../data/climate";
import {
  climateHvacModeIcon,
  compareClimateHvacModes,
} from "../../../data/climate";
import { UNAVAILABLE } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import { filterModes } from "./common/filter-modes";
import type {
  ClimateHvacModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

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
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public context!: LovelaceCardFeatureContext;

  @state() private _config?: ClimateHvacModesCardFeatureConfig;

  @state() _currentHvacMode?: HvacMode;

  @query("ha-control-select-menu", true)
  private _haSelect?: HaControlSelectMenu;

  private get _stateObj(): ClimateEntity | undefined {
    return this.hass.states[this.context.entity_id!] as
      | ClimateEntity
      | undefined;
  }

  static getStubConfig(): ClimateHvacModesCardFeatureConfig {
    return {
      type: "climate-hvac-modes",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import(
      "../editor/config-elements/hui-climate-hvac-modes-card-feature-editor"
    );
    return document.createElement("hui-climate-hvac-modes-card-feature-editor");
  }

  public setConfig(config: ClimateHvacModesCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("hass") && this._stateObj) {
      const oldHass = changedProp.get("hass") as HomeAssistant | undefined;
      const oldStateObj = oldHass?.states[this.context.entity_id!];
      if (oldStateObj !== this._stateObj) {
        this._currentHvacMode = this._stateObj.state as HvacMode;
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
    const mode =
      (ev.detail as any).value ?? ((ev.target as any).value as HvacMode);

    if (mode === this._stateObj!.state) return;

    const oldMode = this._stateObj!.state as HvacMode;
    this._currentHvacMode = mode;

    try {
      await this._setMode(mode);
    } catch (_err) {
      this._currentHvacMode = oldMode;
    }
  }

  private async _setMode(mode: HvacMode) {
    await this.hass!.callService("climate", "set_hvac_mode", {
      entity_id: this._stateObj!.entity_id,
      hvac_mode: mode,
    });
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this._stateObj ||
      !supportsClimateHvacModesCardFeature(this.hass, this.context)
    ) {
      return null;
    }

    const color = stateColorCss(this._stateObj);

    const ordererHvacModes = (this._stateObj.attributes.hvac_modes || [])
      .concat()
      .sort(compareClimateHvacModes)
      .reverse();

    const options = filterModes(
      ordererHvacModes,
      this._config.hvac_modes
    ).map<ControlSelectOption>((mode) => ({
      value: mode,
      label: this.hass!.formatEntityState(this._stateObj!, mode),
      icon: html`
        <ha-svg-icon
          slot="graphic"
          .path=${climateHvacModeIcon(mode)}
        ></ha-svg-icon>
      `,
    }));

    if (this._config.style === "dropdown") {
      return html`
        <ha-control-select-menu
          show-arrow
          hide-label
          .label=${this.hass.localize("ui.card.climate.mode")}
          .value=${this._currentHvacMode}
          .disabled=${this._stateObj.state === UNAVAILABLE}
          fixedMenuPosition
          naturalMenuWidth
          @selected=${this._valueChanged}
          @closed=${stopPropagation}
        >
          ${this._currentHvacMode
            ? html`
                <ha-svg-icon
                  slot="icon"
                  .path=${climateHvacModeIcon(this._currentHvacMode)}
                ></ha-svg-icon>
              `
            : html`
                <ha-svg-icon slot="icon" .path=${mdiThermostat}></ha-svg-icon>
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

    return html`
      <ha-control-select
        .options=${options}
        .value=${this._currentHvacMode}
        @value-changed=${this._valueChanged}
        hide-label
        .ariaLabel=${this.hass.localize("ui.card.climate.mode")}
        style=${styleMap({
          "--control-select-color": color,
        })}
        .disabled=${this._stateObj!.state === UNAVAILABLE}
      >
      </ha-control-select>
    `;
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-hvac-modes-card-feature": HuiClimateHvacModesCardFeature;
  }
}
