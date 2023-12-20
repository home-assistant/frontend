import { mdiFan } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import "../../../components/ha-control-select-menu";
import type { HaControlSelectMenu } from "../../../components/ha-control-select-menu";
import {
  ClimateEntity,
  ClimateEntityFeature,
  computeFanModeIcon,
} from "../../../data/climate";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { ClimateFanModesCardFeatureConfig } from "./types";

export const supportsClimateFanModesCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "climate" &&
    supportsFeature(stateObj, ClimateEntityFeature.FAN_MODE)
  );
};

@customElement("hui-climate-fan-modes-card-feature")
class HuiClimateFanModesCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: ClimateEntity;

  @state() private _config?: ClimateFanModesCardFeatureConfig;

  @state() _currentFanMode?: string;

  @query("ha-control-select-menu", true)
  private _haSelect?: HaControlSelectMenu;

  static getStubConfig(
    _,
    stateObj?: HassEntity
  ): ClimateFanModesCardFeatureConfig {
    return {
      type: "climate-fan-modes",
      style: "dropdown",
      fan_modes: stateObj?.attributes.fan_modes || [],
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import(
      "../editor/config-elements/hui-climate-fan-modes-card-feature-editor"
    );
    return document.createElement("hui-climate-fan-modes-card-feature-editor");
  }

  public setConfig(config: ClimateFanModesCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj") && this.stateObj) {
      this._currentFanMode = this.stateObj.attributes.fan_mode;
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
    const fanMode =
      (ev.detail as any).value ?? ((ev.target as any).value as string);

    const oldFanMode = this.stateObj!.attributes.fan_mode;

    if (fanMode === oldFanMode) return;

    this._currentFanMode = fanMode;

    try {
      await this._setMode(fanMode);
    } catch (err) {
      this._currentFanMode = oldFanMode;
    }
  }

  private async _setMode(mode: string) {
    await this.hass!.callService("climate", "set_fan_mode", {
      entity_id: this.stateObj!.entity_id,
      fan_mode: mode,
    });
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsClimateFanModesCardFeature(this.stateObj)
    ) {
      return null;
    }

    const stateObj = this.stateObj;

    const modes = stateObj.attributes.fan_modes || [];

    const options = modes
      .filter((mode) => (this._config!.fan_modes || []).includes(mode))
      .map<ControlSelectOption>((mode) => ({
        value: mode,
        label: this.hass!.formatEntityAttributeValue(
          this.stateObj!,
          "fan_mode",
          mode
        ),
        path: computeFanModeIcon(mode),
      }));

    if (this._config.style === "icons") {
      return html`
        <div class="container">
          <ha-control-select
            .options=${options}
            .value=${this._currentFanMode}
            @value-changed=${this._valueChanged}
            hide-label
            .ariaLabel=${this.hass!.formatEntityAttributeName(
              stateObj,
              "fan_mode"
            )}
            .disabled=${this.stateObj!.state === UNAVAILABLE}
          >
          </ha-control-select>
        </div>
      `;
    }

    return html`
      <div class="container">
        <ha-control-select-menu
          show-arrow
          hide-label
          .label=${this.hass!.formatEntityAttributeName(stateObj, "fan_mode")}
          .value=${this._currentFanMode}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          fixedMenuPosition
          naturalMenuWidth
          @selected=${this._valueChanged}
          @closed=${stopPropagation}
        >
          <ha-svg-icon slot="icon" .path=${mdiFan}></ha-svg-icon>
          ${options.map(
            (option) => html`
              <ha-list-item .value=${option.value} graphic="icon">
                <ha-svg-icon slot="graphic" .path=${option.path}></ha-svg-icon>
                ${option.label}
              </ha-list-item>
            `
          )}
        </ha-control-select-menu>
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
        --control-select-color: var(--feature-color);
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
    "hui-climate-fan-modes-card-feature": HuiClimateFanModesCardFeature;
  }
}
