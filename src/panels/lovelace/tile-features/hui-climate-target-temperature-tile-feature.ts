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
import { ClimateEntity, ClimateEntityFeature } from "../../../data/climate";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { ClimateTargetTemperatureTileFeatureConfig } from "./types";
import { stateActive } from "../../../common/entity/state_active";

type Target = "value" | "low" | "high";

export const supportsClimateTargetTemperatureTileFeature = (
  stateObj: HassEntity
) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    (domain === "climate" &&
      supportsFeature(stateObj, ClimateEntityFeature.TARGET_TEMPERATURE)) ||
    supportsFeature(stateObj, ClimateEntityFeature.TARGET_TEMPERATURE_RANGE)
  );
};

@customElement("hui-climate-target-temperature-tile-feature")
class HuiClimateTargetTemperatureTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: ClimateEntity;

  @state() private _config?: ClimateTargetTemperatureTileFeatureConfig;

  @state() private _targetTemperature: Partial<Record<Target, number>> = {};

  static getStubConfig(): ClimateTargetTemperatureTileFeatureConfig {
    return {
      type: "climate-target-temperature",
    };
  }

  public setConfig(config: ClimateTargetTemperatureTileFeatureConfig): void {
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
        low: this.stateObj!.attributes.target_temp_low,
        high: this.stateObj!.attributes.target_temp_high,
      };
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
    if (type === "high" || type === "low") {
      this.hass!.callService("climate", "set_temperature", {
        entity_id: this.stateObj!.entity_id,
        target_temp_low: this._targetTemperature.low,
        target_temp_high: this._targetTemperature.high,
      });
      return;
    }
    this.hass!.callService("climate", "set_temperature", {
      entity_id: this.stateObj!.entity_id,
      temperature: this._targetTemperature.value,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsClimateTargetTemperatureTileFeature(this.stateObj)
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
      supportsFeature(this.stateObj, ClimateEntityFeature.TARGET_TEMPERATURE)
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
            "--control-number-buttons-color": stateColor,
          })}
          .disabled=${this.stateObj!.state === UNAVAILABLE}
        >
        </ha-control-number-buttons>
      </ha-control-number-buttons>
    `;
    }

    if (
      supportsFeature(
        this.stateObj,
        ClimateEntityFeature.TARGET_TEMPERATURE_RANGE
      )
    ) {
      const active = stateActive(this.stateObj);

      const lowColor = stateColorCss(this.stateObj, active ? "heat" : "off");
      const highColor = stateColorCss(this.stateObj, active ? "cool" : "off");

      return html`
      <ha-control-button-group>
        <ha-control-number-buttons
          .formatOptions=${options}
          .target=${"low"}
          .value=${this.stateObj.attributes.target_temp_low}
          .min=${this._min}
          .max=${Math.min(this._max, this._targetTemperature.high ?? this._max)}
          .step=${this._step}
          @value-changed=${this._valueChanged}
          .label=${this.hass.formatEntityAttributeName(
            this.stateObj,
            "temperature"
          )}
          style=${styleMap({
            "--control-number-buttons-color": lowColor,
            color: active ? lowColor : undefined,
            "--control-number-buttons-background-color": active
              ? lowColor
              : undefined,
            "--control-number-buttons-background-opacity": active
              ? 0.15
              : undefined,
          })}
          .disabled=${this.stateObj!.state === UNAVAILABLE}
        >
        </ha-control-number-buttons>
        <ha-control-number-buttons
          .formatOptions=${options}
          .target=${"high"}
          .value=${this.stateObj.attributes.target_temp_high}
          .min=${Math.max(this._min, this._targetTemperature.low ?? this._min)}
          .max=${this._max}
          .step=${this._step}
          @value-changed=${this._valueChanged}
          .label=${this.hass.formatEntityAttributeName(
            this.stateObj,
            "temperature"
          )}
          style=${styleMap({
            "--control-number-buttons-color": highColor,
            color: active ? highColor : undefined,
            "--control-number-buttons-background-color": active
              ? highColor
              : undefined,
            "--control-number-buttons-background-opacity": active
              ? 0.15
              : undefined,
          })}
          .disabled=${this.stateObj!.state === UNAVAILABLE}
        >
        </ha-control-number-buttons>
      </ha-control-number-buttons>
    `;
    }

    return nothing;
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
    "hui-climate-target-temperature-tile-feature": HuiClimateTargetTemperatureTileFeature;
  }
}
