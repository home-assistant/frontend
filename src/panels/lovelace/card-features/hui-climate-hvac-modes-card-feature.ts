import { mdiThermostat } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-control-select";
import "../../../components/ha-control-select-menu";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import type { HaControlSelectMenu } from "../../../components/ha-control-select-menu";
import {
  ClimateEntity,
  compareClimateHvacModes,
  computeHvacModeIcon,
  HvacMode,
} from "../../../data/climate";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { ClimateHvacModesCardFeatureConfig } from "./types";

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

  static getStubConfig(
    _,
    stateObj?: HassEntity
  ): ClimateHvacModesCardFeatureConfig {
    return {
      type: "climate-hvac-modes",
      hvac_modes: stateObj?.attributes.hvac_modes || [],
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
    } catch (err) {
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

    const modes = this._config.hvac_modes || [];

    const options = modes
      .filter((mode) => this.stateObj?.attributes.hvac_modes.includes(mode))
      .sort(compareClimateHvacModes)
      .map<ControlSelectOption>((mode) => ({
        value: mode,
        label: this.hass!.formatEntityState(this.stateObj!, mode),
        path: computeHvacModeIcon(mode),
      }));

    if (this._config.style === "dropdown") {
      return html`
        <div class="container">
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
            <ha-svg-icon slot="icon" .path=${mdiThermostat}></ha-svg-icon>
            ${options.map(
              (option) => html`
                <ha-list-item .value=${option.value} graphic="icon">
                  <ha-svg-icon
                    slot="graphic"
                    .path=${option.path}
                  ></ha-svg-icon>
                  ${option.label}
                </ha-list-item>
              `
            )}
          </ha-control-select-menu>
        </div>
      `;
    }

    return html`
      <div class="container">
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
      </div>
    `;
  }

  static get styles() {
    return css`
      ha-control-select-menu {
        box-sizing: border-box;
        --control-select-menu-height: 40px;
        --control-select-menu-border-radius: 10px;
        line-height: 1.2;
        display: block;
        width: 100%;
      }
      ha-control-select {
        --control-select-padding: 0;
        --control-select-thickness: 40px;
        --control-select-border-radius: 10px;
        --control-select-button-border-radius: 10px;
      }
      .container {
        padding: 0 12px 12px 12px;
        width: auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-hvac-modes-card-feature": HuiClimateHvacModesCardFeature;
  }
}
