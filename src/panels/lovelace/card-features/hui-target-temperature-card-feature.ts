import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
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
import type { ClimateEntity } from "../../../data/climate";
import { ClimateEntityFeature } from "../../../data/climate";
import { UNAVAILABLE } from "../../../data/entity";
import type { WaterHeaterEntity } from "../../../data/water_heater";
import { WaterHeaterEntityFeature } from "../../../data/water_heater";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  TargetTemperatureCardFeatureConfig,
} from "./types";

type Target = "value" | "low" | "high";

export const supportsTargetTemperatureCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
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

@customElement("hui-target-temperature-card-feature")
class HuiTargetTemperatureCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: TargetTemperatureCardFeatureConfig;

  @state() private _targetTemperature: Partial<Record<Target, number>> = {};

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as
      | WaterHeaterEntity
      | ClimateEntity
      | undefined;
  }

  static getStubConfig(): TargetTemperatureCardFeatureConfig {
    return {
      type: "target-temperature",
    };
  }

  public setConfig(config: TargetTemperatureCardFeatureConfig): void {
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
        this._targetTemperature = {
          value: this._stateObj!.attributes.temperature,
          low:
            "target_temp_low" in this._stateObj!.attributes
              ? this._stateObj!.attributes.target_temp_low
              : undefined,
          high:
            "target_temp_high" in this._stateObj!.attributes
              ? this._stateObj!.attributes.target_temp_high
              : undefined,
        };
      }
    }
  }

  private get _step() {
    return (
      this._stateObj!.attributes.target_temp_step ||
      (this.hass!.config.unit_system.temperature === UNIT_F ? 1 : 0.5)
    );
  }

  private get _min() {
    return this._stateObj!.attributes.min_temp;
  }

  private get _max() {
    return this._stateObj!.attributes.max_temp;
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
    const domain = computeStateDomain(this._stateObj!);
    if (type === "high" || type === "low") {
      this.hass!.callService(domain, "set_temperature", {
        entity_id: this._stateObj!.entity_id,
        target_temp_low: this._targetTemperature.low,
        target_temp_high: this._targetTemperature.high,
      });
      return;
    }
    this.hass!.callService(domain, "set_temperature", {
      entity_id: this._stateObj!.entity_id,
      temperature: this._targetTemperature.value,
    });
  }

  private _supportsTarget() {
    const domain = computeStateDomain(this._stateObj!);
    return (
      (domain === "climate" &&
        supportsFeature(
          this._stateObj!,
          ClimateEntityFeature.TARGET_TEMPERATURE
        )) ||
      (domain === "water_heater" &&
        supportsFeature(
          this._stateObj!,
          WaterHeaterEntityFeature.TARGET_TEMPERATURE
        ))
    );
  }

  private _supportsTargetRange() {
    const domain = computeStateDomain(this._stateObj!);
    return (
      domain === "climate" &&
      supportsFeature(
        this._stateObj!,
        ClimateEntityFeature.TARGET_TEMPERATURE_RANGE
      )
    );
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsTargetTemperatureCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const stateColor = stateColorCss(this._stateObj);
    const digits = this._step.toString().split(".")?.[1]?.length ?? 0;

    const options = {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    };

    if (
      this._supportsTarget() &&
      this._targetTemperature.value != null &&
      this._stateObj.state !== UNAVAILABLE
    ) {
      return html`
        <ha-control-button-group>
          <ha-control-number-buttons
            .formatOptions=${options}
            .target=${"value"}
            .value=${this._stateObj.attributes.temperature}
            .unit=${this.hass.config.unit_system.temperature}
            .min=${this._min}
            .max=${this._max}
            .step=${this._step}
            @value-changed=${this._valueChanged}
            .label=${this.hass.formatEntityAttributeName(
              this._stateObj,
              "temperature"
            )}
            style=${styleMap({
              "--control-number-buttons-focus-color": stateColor,
            })}
            .disabled=${this._stateObj!.state === UNAVAILABLE}
            .locale=${this.hass.locale}
          >
          </ha-control-number-buttons>
        </ha-control-button-group>
      `;
    }

    if (
      this._supportsTargetRange() &&
      this._targetTemperature.low != null &&
      this._targetTemperature.high != null &&
      this._stateObj.state !== UNAVAILABLE
    ) {
      return html`
        <ha-control-button-group>
          <ha-control-number-buttons
            .formatOptions=${options}
            .target=${"low"}
            .value=${this._targetTemperature.low}
            .unit=${this.hass.config.unit_system.temperature}
            .min=${this._min}
            .max=${Math.min(
              this._max,
              this._targetTemperature.high ?? this._max
            )}
            .step=${this._step}
            @value-changed=${this._valueChanged}
            .label=${this.hass.formatEntityAttributeName(
              this._stateObj,
              "target_temp_low"
            )}
            style=${styleMap({
              "--control-number-buttons-focus-color": stateColor,
            })}
            .disabled=${this._stateObj!.state === UNAVAILABLE}
            .locale=${this.hass.locale}
          >
          </ha-control-number-buttons>
          <ha-control-number-buttons
            .formatOptions=${options}
            .target=${"high"}
            .value=${this._targetTemperature.high}
            .unit=${this.hass.config.unit_system.temperature}
            .min=${Math.max(
              this._min,
              this._targetTemperature.low ?? this._min
            )}
            .max=${this._max}
            .step=${this._step}
            @value-changed=${this._valueChanged}
            .label=${this.hass.formatEntityAttributeName(
              this._stateObj,
              "target_temp_high"
            )}
            style=${styleMap({
              "--control-number-buttons-focus-color": stateColor,
            })}
            .disabled=${this._stateObj!.state === UNAVAILABLE}
            .locale=${this.hass.locale}
          >
          </ha-control-number-buttons>
        </ha-control-button-group>
      `;
    }

    return html`
      <ha-control-button-group>
        <ha-control-number-buttons
          .disabled=${this._stateObj!.state === UNAVAILABLE}
          .unit=${this.hass.config.unit_system.temperature}
          .label=${this.hass.formatEntityAttributeName(
            this._stateObj,
            "temperature"
          )}
          style=${styleMap({
            "--control-number-buttons-focus-color": stateColor,
          })}
          .locale=${this.hass.locale}
        >
        </ha-control-number-buttons>
      </ha-control-button-group>
    `;
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-target-temperature-card-feature": HuiTargetTemperatureCardFeature;
  }
}
