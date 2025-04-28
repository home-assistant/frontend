import { mdiThermostat } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
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
import type { ClimateHvacModesCardFeatureConfig } from "./types";

export const supportsClimateHvacModesCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "climate";
};

@customElement("hui-climate-hvac-modes-card-feature")
class HuiClimateHvacModesCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: ClimateEntity;

  @state() private _config?: ClimateHvacModesCardFeatureConfig;

  @state() _currentHvacMode?: HvacMode;

  @query("ha-control-select-menu", true)
  private _haSelect?: HaControlSelectMenu;

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
    if (changedProp.has("stateObj") && this.stateObj) {
      this._currentHvacMode = this.stateObj.state as HvacMode;
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

    if (mode === this.stateObj!.state) return;

    const oldMode = this.stateObj!.state as HvacMode;
    this._currentHvacMode = mode;

    try {
      await this._setMode(mode);
    } catch (_err) {
      this._currentHvacMode = oldMode;
    }
  }

  private async _setMode(mode: HvacMode) {
    await this.hass!.callService("climate", "set_hvac_mode", {
      entity_id: this.stateObj!.entity_id,
      hvac_mode: mode,
    });
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsClimateHvacModesCardFeature(this.stateObj)
    ) {
      return null;
    }

    const color = stateColorCss(this.stateObj);

    const ordererHvacModes = (this.stateObj.attributes.hvac_modes || [])
      .concat()
      .sort(compareClimateHvacModes)
      .reverse();

    const options = filterModes(
      ordererHvacModes,
      this._config.hvac_modes
    ).map<ControlSelectOption>((mode) => ({
      value: mode,
      label: this.hass!.formatEntityState(this.stateObj!, mode),
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
          .disabled=${this.stateObj.state === UNAVAILABLE}
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
        .disabled=${this.stateObj!.state === UNAVAILABLE}
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
