import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { UNIT_F } from "../../../common/const";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-number-buttons";
import { ClimateEntity, ClimateEntityFeature } from "../../../data/climate";
import { UNAVAILABLE } from "../../../data/entity";
import {
  WaterHeaterEntity,
  WaterHeaterEntityFeature,
} from "../../../data/water_heater";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { TargetTemperatureTileFeatureConfig } from "./types";

type Target = "value" | "low" | "high";

export const supportsTargetTemperatureTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    (domain === "climate" &&
      (supportsFeature(stateObj, ClimateEntityFeature.TARGET_TEMPERATURE) ||
        supportsFeature(
          stateObj,
          ClimateEntityFeature.TARGET_TEMPERATURE_RANGE
        ))) ||
    (domain === "water_heater" &&
      supportsFeature(stateObj, WaterHeaterEntityFeature.TARGET_TEMPERATURE))
  );
};

@customElement("hui-target-temperature-tile-feature")
class HuiTargetTemperatureTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?:
    | ClimateEntity
    | WaterHeaterEntity;

  @state() private _config?: TargetTemperatureTileFeatureConfig;

  @state() private _targetTemperature: Partial<Record<Target, number>> = {};

  static getStubConfig(): TargetTemperatureTileFeatureConfig {
    return {
      type: "target-temperature",
    };
  }

  public setConfig(config: TargetTemperatureTileFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj")) {
      this._targetTemperature = {
        value: this.stateObj!.attributes.temperature,
        low:
          "target_temp_low" in this.stateObj!.attributes
            ? this.stateObj!.attributes.target_temp_low
            : undefined,
        high:
          "target_temp_high" in this.stateObj!.attributes
            ? this.stateObj!.attributes.target_temp_high
            : undefined,
      };
    }
  }

  private get _step() {
    return (
      this.stateObj!.attributes.target_temp_step ||
      (this.hass!.config.unit_system.temperature === UNIT_F ? 1 : 0.5)
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
    const target = (ev.currentTarget as any).target ?? "value";

    this._targetTemperature = {
      ...this._targetTemperature,
      [target]: value,
    };
    this._debouncedCallService(target);
  }

  private _debouncedCallService = debounce(
    (target: Target) => this._callService(target),
    1000
  );

  private _callService(type: string) {
    const domain = computeStateDomain(this.stateObj!);
    if (type === "high" || type === "low") {
      this.hass!.callService(domain, "set_temperature", {
        entity_id: this.stateObj!.entity_id,
        target_temp_low: this._targetTemperature.low,
        target_temp_high: this._targetTemperature.high,
      });
      return;
    }
    this.hass!.callService(domain, "set_temperature", {
      entity_id: this.stateObj!.entity_id,
      temperature: this._targetTemperature.value,
    });
  }

  private _supportsTarget() {
    const domain = computeStateDomain(this.stateObj!);
    return (
      (domain === "climate" &&
        supportsFeature(
          this.stateObj!,
          ClimateEntityFeature.TARGET_TEMPERATURE
        )) ||
      (domain === "water_heater" &&
        supportsFeature(
          this.stateObj!,
          WaterHeaterEntityFeature.TARGET_TEMPERATURE
        ))
    );
  }

  private _supportsTargetRange() {
    const domain = computeStateDomain(this.stateObj!);
    return (
      domain === "climate" &&
      supportsFeature(
        this.stateObj!,
        ClimateEntityFeature.TARGET_TEMPERATURE_RANGE
      )
    );
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsTargetTemperatureTileFeature(this.stateObj)
    ) {
      return nothing;
    }

    const stateColor = stateColorCss(this.stateObj);
    const digits = this._step.toString().split(".")?.[1]?.length ?? 0;

    const options = {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    };

    if (
      this._supportsTarget() &&
      this._targetTemperature.value != null &&
      this.stateObj.state !== UNAVAILABLE
    ) {
      return html`
        <ha-control-button-group>
          <ha-control-number-buttons
            .formatOptions=${options}
            .target="value"
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
              "--control-number-buttons-focus-color": stateColor,
            })}
            .disabled=${this.stateObj!.state === UNAVAILABLE}
          >
          </ha-control-number-buttons>
        </ha-control-button-group>
      `;
    }

    if (
      this._supportsTargetRange() &&
      this._targetTemperature.low != null &&
      this._targetTemperature.high != null &&
      this.stateObj.state !== UNAVAILABLE
    ) {
      return html`
        <ha-control-button-group>
          <ha-control-number-buttons
            .formatOptions=${options}
            .target=${"low"}
            .value=${this._targetTemperature.low}
            .min=${this._min}
            .max=${Math.min(
              this._max,
              this._targetTemperature.high ?? this._max
            )}
            .step=${this._step}
            @value-changed=${this._valueChanged}
            .label=${this.hass.formatEntityAttributeName(
              this.stateObj,
              "target_temp_low"
            )}
            style=${styleMap({
              "--control-number-buttons-focus-color": stateColor,
            })}
            .disabled=${this.stateObj!.state === UNAVAILABLE}
          >
          </ha-control-number-buttons>
          <ha-control-number-buttons
            .formatOptions=${options}
            .target=${"high"}
            .value=${this._targetTemperature.high}
            .min=${Math.max(
              this._min,
              this._targetTemperature.low ?? this._min
            )}
            .max=${this._max}
            .step=${this._step}
            @value-changed=${this._valueChanged}
            .label=${this.hass.formatEntityAttributeName(
              this.stateObj,
              "target_temp_high"
            )}
            style=${styleMap({
              "--control-number-buttons-focus-color": stateColor,
            })}
            .disabled=${this.stateObj!.state === UNAVAILABLE}
          >
          </ha-control-number-buttons>
        </ha-control-button-group>
      `;
    }

    return html`
      <ha-control-button-group>
        <ha-control-number-buttons
          .disabled=${this.stateObj!.state === UNAVAILABLE}
          .label=${this.hass.formatEntityAttributeName(
            this.stateObj,
            "temperature"
          )}
          style=${styleMap({
            "--control-number-buttons-focus-color": stateColor,
          })}
        >
        </ha-control-number-buttons>
      </ha-control-button-group>
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
    "hui-target-temperature-tile-feature": HuiTargetTemperatureTileFeature;
  }
}
