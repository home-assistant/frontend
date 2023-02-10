import { mdiPlus, mdiMinus } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/tile/ha-tile-button";
import { ClimateEntityFeature } from "../../../data/climate";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { ClimateTemperatureTileFeatureConfig } from "./types";

@customElement("hui-climate-temperature-tile-feature")
class HuiClimateTemperatureTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: ClimateTemperatureTileFeatureConfig;

  static getStubConfig(): ClimateTemperatureTileFeatureConfig {
    return {
      type: "climate-temperature",
    };
  }

  public setConfig(config: ClimateTemperatureTileFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private _onUp(ev): void {
    ev.stopPropagation();
    this.hass!.callService("climate", "set_temperature", {
      entity_id: this.stateObj!.entity_id,
      temperature:
        this.stateObj!.attributes.temperature +
        this.stateObj!.attributes.target_temp_step,
    });
  }

  private _onDown(ev): void {
    ev.stopPropagation();
    this.hass!.callService("climate", "set_temperature", {
      entity_id: this.stateObj!.entity_id,
      temperature:
        this.stateObj!.attributes.temperature -
        this.stateObj!.attributes.target_temp_step,
    });
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass || !this.stateObj) {
      return html``;
    }

    return html`
      <div class="container">
        ${supportsFeature(
          this.stateObj,
          ClimateEntityFeature.TARGET_TEMPERATURE
        )
          ? html`
              <ha-tile-button
                .label=${this.hass.localize(
                  "ui.components.climate-control.temperature_up"
                )}
                @click=${this._onUp}
              >
                <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
              </ha-tile-button>
              <ha-tile-button
                .label=${this.hass.localize(
                  "ui.components.climate-control.temperature_down"
                )}
                @click=${this._onDown}
              >
                <ha-svg-icon .path=${mdiMinus}></ha-svg-icon>
              </ha-tile-button>
            `
          : null}
      </div>
    `;
  }

  static get styles() {
    return css`
      .container {
        display: flex;
        flex-direction: row;
        padding: 0 12px 12px 12px;
        width: auto;
      }
      ha-tile-button {
        flex: 1;
      }
      ha-tile-button:not(:last-child) {
        margin-right: 12px;
        margin-inline-end: 12px;
        margin-inline-start: initial;
        direction: var(--direction);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-temperature-tile-feature": HuiClimateTemperatureTileFeature;
  }
}
