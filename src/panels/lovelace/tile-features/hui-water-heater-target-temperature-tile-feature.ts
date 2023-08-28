import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-number-buttons";
import { UNAVAILABLE } from "../../../data/entity";
import {
  WaterHeaterEntity,
  WaterHeaterEntityFeature,
} from "../../../data/water_heater";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { WaterHeaterTargetTemperatureTileFeatureConfig } from "./types";

export const supportsWaterHeaterTargetTemperatureTileFeature = (
  stateObj: HassEntity
) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "water_heater" &&
    supportsFeature(stateObj, WaterHeaterEntityFeature.TARGET_TEMPERATURE)
  );
};

@customElement("hui-water-heater-target-temperature-tile-feature")
class HuiWaterHeaterTargetTemperatureTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: WaterHeaterEntity;

  @state() private _config?: WaterHeaterTargetTemperatureTileFeatureConfig;

  @state() private _targetTemperature?: number;

  static getStubConfig(): WaterHeaterTargetTemperatureTileFeatureConfig {
    return {
      type: "water-heater-target-temperature",
    };
  }

  public setConfig(
    config: WaterHeaterTargetTemperatureTileFeatureConfig
  ): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj")) {
      this._targetTemperature = this.stateObj!.attributes.temperature;
    }
  }

  private get _step() {
    return (
      this.stateObj!.attributes.target_temp_step ||
      (this.hass!.config.unit_system.temperature.indexOf("F") === -1 ? 0.5 : 1)
    );
  }

  private get _min() {
    return this.stateObj!.attributes.min_temp;
  }

  private get _max() {
    return this.stateObj!.attributes.max_temp;
  }

  private async _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this._targetTemperature = value;
    this._debouncedCallService();
  }

  private _debouncedCallService = debounce(() => this._callService(), 1000);

  private _callService() {
    this.hass!.callService("water_heater", "set_temperature", {
      entity_id: this.stateObj!.entity_id,
      temperature: this._targetTemperature,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsWaterHeaterTargetTemperatureTileFeature(this.stateObj)
    ) {
      return nothing;
    }

    const stateColor = stateColorCss(this.stateObj);
    const digits = this._step.toString().split(".")?.[1]?.length ?? 0;

    const options = {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    };

    return html`
      <ha-control-button-group>
        <ha-control-number-buttons
          .formatOptions=${options}
          .value=${this.stateObj.attributes.temperature}
          .min=${this._min}
          .max=${this._max}
          .step=${this._step}
          @value-changed=${this._valueChanged}
          .label=${this.hass.formatEntityAttributeName(
            this.stateObj,
            "temperature"
          )}
          style=${styleMap({
            "--control-number-buttons-color": stateColor,
          })}
          .disabled=${this.stateObj!.state === UNAVAILABLE}
        >
        </ha-control-number-buttons>
      </ha-control-number-buttons>
    `;
  }

  static get styles() {
    return css`
      ha-control-button-group {
        margin: 0 12px 12px 12px;
        --control-button-group-spacing: 12px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-water-heater-target-temperature-tile-feature": HuiWaterHeaterTargetTemperatureTileFeature;
  }
}
