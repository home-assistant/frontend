import { mdiMinus, mdiPlus, mdiThermometer, mdiThermostat } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { UNIT_F } from "../../common/const";
import { stateActive } from "../../common/entity/state_active";
import { supportsFeature } from "../../common/entity/supports-feature";
import { clamp } from "../../common/number/clamp";
import { formatNumber } from "../../common/number/format_number";
import { blankBeforeUnit } from "../../common/translations/blank_before_unit";
import { debounce } from "../../common/util/debounce";
import "../../components/ha-big-number";
import "../../components/ha-control-circular-slider";
import type { ControlCircularSliderMode } from "../../components/ha-control-circular-slider";
import "../../components/ha-outlined-icon-button";
import "../../components/ha-svg-icon";
import type { ClimateEntity, HvacMode } from "../../data/climate";
import {
  CLIMATE_HVAC_ACTION_TO_MODE,
  ClimateEntityFeature,
} from "../../data/climate";
import { UNAVAILABLE } from "../../data/entity";
import type { HomeAssistant } from "../../types";
import {
  createStateControlCircularSliderController,
  stateControlCircularSliderStyle,
} from "../state-control-circular-slider-style";
import { stateColor } from "../../common/entity/state_color";

type Target = "value" | "low" | "high";

const SLIDER_MODES: Record<HvacMode, ControlCircularSliderMode> = {
  auto: "full",
  cool: "end",
  dry: "full",
  fan_only: "full",
  heat: "start",
  heat_cool: "full",
  off: "full",
};

@customElement("ha-state-control-climate-temperature")
export class HaStateControlClimateTemperature extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: ClimateEntity;

  @property({ attribute: "show-secondary", type: Boolean })
  public showSecondary = false;

  @property({ attribute: "use-current-as-primary", type: Boolean })
  public showCurrentAsPrimary = false;

  @property({ type: Boolean, attribute: "prevent-interaction-on-scroll" })
  public preventInteractionOnScroll = false;

  @state() private _targetTemperature: Partial<Record<Target, number>> = {};

  @state() private _selectTargetTemperature: Target = "low";

  private _sizeController = createStateControlCircularSliderController(this);

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj")) {
      this._targetTemperature = {
        value: this.stateObj.attributes.temperature,
        low: this.stateObj.attributes.target_temp_low,
        high: this.stateObj.attributes.target_temp_high,
      };
    }
  }

  private get _step() {
    return (
      this.stateObj.attributes.target_temp_step ||
      (this.hass.config.unit_system.temperature === UNIT_F ? 1 : 0.5)
    );
  }

  private get _min() {
    return this.stateObj.attributes.min_temp;
  }

  private get _max() {
    return this.stateObj.attributes.max_temp;
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;
    const target = ev.type.replace("-changed", "");
    this._targetTemperature = {
      ...this._targetTemperature,
      [target]: value,
    };
    this._selectTargetTemperature = target as Target;
    this._callService(target);
  }

  private _valueChanging(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;
    const target = ev.type.replace("-changing", "");
    this._targetTemperature = {
      ...this._targetTemperature,
      [target]: value,
    };
    this._selectTargetTemperature = target as Target;
  }

  private _debouncedCallService = debounce(
    (target: Target) => this._callService(target),
    1000
  );

  private _callService(type: string) {
    if (type === "high" || type === "low") {
      this.hass.callService("climate", "set_temperature", {
        entity_id: this.stateObj!.entity_id,
        target_temp_low: this._targetTemperature.low,
        target_temp_high: this._targetTemperature.high,
      });
      return;
    }
    this.hass.callService("climate", "set_temperature", {
      entity_id: this.stateObj!.entity_id,
      temperature: this._targetTemperature.value,
    });
  }

  private _handleButton(ev) {
    const target = ev.currentTarget.target as Target;
    const step = ev.currentTarget.step as number;

    const defaultValue = target === "high" ? this._max : this._min;

    let temp = this._targetTemperature[target] ?? defaultValue;
    temp += step;
    temp = clamp(temp, this._min, this._max);
    if (target === "high" && this._targetTemperature.low != null) {
      temp = clamp(temp, this._targetTemperature.low, this._max);
    }
    if (target === "low" && this._targetTemperature.high != null) {
      temp = clamp(temp, this._min, this._targetTemperature.high);
    }

    this._targetTemperature = {
      ...this._targetTemperature,
      [target]: temp,
    };
    this._debouncedCallService(target);
  }

  private _handleSelectTemp(ev) {
    const target = ev.currentTarget.target as Target;
    this._selectTargetTemperature = target;
  }

  private _renderLabel() {
    if (this.stateObj.state === UNAVAILABLE) {
      return html`
        <p class="label disabled">
          ${this.hass.formatEntityState(this.stateObj, UNAVAILABLE)}
        </p>
      `;
    }

    const action = this.stateObj.attributes.hvac_action;

    const isTemperatureDisplayed =
      (this.stateObj.attributes.current_temperature != null &&
        this.showCurrentAsPrimary) ||
      ((this._supportsTargetTemperature ||
        this._supportsTargetTemperatureRange) &&
        !this.showCurrentAsPrimary);

    return html`
      <p class="label">
        ${action && action !== "off"
          ? this.hass.formatEntityAttributeValue(this.stateObj, "hvac_action")
          : isTemperatureDisplayed
            ? this.hass.formatEntityState(this.stateObj)
            : nothing}
      </p>
    `;
  }

  private _renderTemperatureButtons(target: Target, colored?: boolean) {
    const lowColor = stateColor(this, this.stateObj, "heat");
    const highColor = stateColor(this, this.stateObj, "cool");

    const color =
      colored && stateActive(this.stateObj)
        ? target === "high"
          ? highColor
          : lowColor
        : undefined;

    return html`
      <div class="buttons">
        <ha-outlined-icon-button
          style=${styleMap({
            "--md-sys-color-outline": color,
          })}
          .target=${target}
          .step=${-this._step}
          @click=${this._handleButton}
        >
          <ha-svg-icon .path=${mdiMinus}></ha-svg-icon>
        </ha-outlined-icon-button>
        <ha-outlined-icon-button
          style=${styleMap({
            "--md-sys-color-outline": color,
          })}
          .target=${target}
          .step=${this._step}
          @click=${this._handleButton}
        >
          <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
        </ha-outlined-icon-button>
      </div>
    `;
  }

  private _renderTarget(
    temperature: number,
    style: "normal" | "big",
    hideUnit?: boolean
  ) {
    const digits = this._step.toString().split(".")?.[1]?.length ?? 0;
    const formatOptions: Intl.NumberFormatOptions = {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    };

    const unit = hideUnit ? "" : this.hass.config.unit_system.temperature;

    if (style === "big") {
      return html`
        <ha-big-number
          .value=${temperature}
          .unit=${unit}
          .hass=${this.hass}
          .formatOptions=${formatOptions}
        ></ha-big-number>
      `;
    }

    const formatted = formatNumber(
      temperature,
      this.hass.locale,
      formatOptions
    );
    return html`${formatted}${blankBeforeUnit(unit, this.hass.locale)}${unit}`;
  }

  private _renderCurrent(temperature: number, style: "normal" | "big") {
    const formatOptions: Intl.NumberFormatOptions = {
      maximumFractionDigits: 1,
    };
    if (style === "big") {
      return html`
        <ha-big-number
          .value=${temperature}
          .unit=${this.hass.config.unit_system.temperature}
          .hass=${this.hass}
          .formatOptions=${formatOptions}
        ></ha-big-number>
      `;
    }

    return html`
      ${this.hass.formatEntityAttributeValue(
        this.stateObj,
        "current_temperature",
        temperature
      )}
    `;
  }

  private _renderPrimary() {
    const currentTemperature = this.stateObj.attributes.current_temperature;

    if (currentTemperature != null && this.showCurrentAsPrimary) {
      return this._renderCurrent(currentTemperature, "big");
    }

    if (this._supportsTargetTemperature && !this.showCurrentAsPrimary) {
      return this._renderTarget(this._targetTemperature.value!, "big");
    }

    if (this._supportsTargetTemperatureRange && !this.showCurrentAsPrimary) {
      return html`
        <div class="dual">
          <button
            @click=${this._handleSelectTemp}
            .target=${"low"}
            class="target-button ${classMap({
              selected: this._selectTargetTemperature === "low",
            })}"
          >
            ${this._renderTarget(this._targetTemperature.low!, "big")}
          </button>
          <button
            @click=${this._handleSelectTemp}
            .target=${"high"}
            class="target-button ${classMap({
              selected: this._selectTargetTemperature === "high",
            })}"
          >
            ${this._renderTarget(this._targetTemperature.high!, "big")}
          </button>
        </div>
      `;
    }

    if (this.stateObj.state !== UNAVAILABLE) {
      return html`
        <p class="primary-state">
          ${this.hass.formatEntityState(this.stateObj)}
        </p>
      `;
    }

    return nothing;
  }

  private _renderSecondary() {
    if (!this.showSecondary) {
      return html`<p class="label secondary"></p>`;
    }

    const currentTemperature = this.stateObj.attributes.current_temperature;

    if (currentTemperature && !this.showCurrentAsPrimary) {
      return html`
        <p class="label secondary">
          <ha-svg-icon .path=${mdiThermometer}></ha-svg-icon>
          ${this._renderCurrent(currentTemperature, "normal")}
        </p>
      `;
    }

    if (this._supportsTargetTemperature && this.showCurrentAsPrimary) {
      return html`
        <p class="label secondary">
          <ha-svg-icon .path=${mdiThermostat}></ha-svg-icon>
          ${this._renderTarget(this._targetTemperature.value!, "normal")}
        </p>
      `;
    }

    if (this._supportsTargetTemperatureRange && this.showCurrentAsPrimary) {
      return html`
        <p class="label secondary">
          <ha-svg-icon class="target-icon" .path=${mdiThermostat}></ha-svg-icon>
          <button
            @click=${this._handleSelectTemp}
            .target=${"low"}
            class="target-button ${classMap({
              selected: this._selectTargetTemperature === "low",
            })}"
          >
            ${this._renderTarget(this._targetTemperature.low!, "normal", true)}
          </button>
          <span>·</span>
          <button
            @click=${this._handleSelectTemp}
            .target=${"high"}
            class="target-button ${classMap({
              selected: this._selectTargetTemperature === "high",
            })}"
          >
            ${this._renderTarget(this._targetTemperature.high!, "normal", true)}
          </button>
        </p>
      `;
    }

    return html`<p class="label secondary"></p>`;
  }

  private _renderInfo() {
    return html`
      <div class="info">
        ${this._renderLabel()}${this._renderPrimary()}${this._renderSecondary()}
      </div>
    `;
  }

  get _supportsTargetTemperature() {
    return (
      supportsFeature(this.stateObj, ClimateEntityFeature.TARGET_TEMPERATURE) &&
      this._targetTemperature.value != null
    );
  }

  get _supportsTargetTemperatureRange() {
    return (
      supportsFeature(
        this.stateObj,
        ClimateEntityFeature.TARGET_TEMPERATURE_RANGE
      ) &&
      this._targetTemperature.low != null &&
      this._targetTemperature.high != null
    );
  }

  protected render() {
    const mode = this.stateObj.state;
    const action = this.stateObj.attributes.hvac_action;
    const active = stateActive(this.stateObj);

    const color = stateColor(this, this.stateObj);
    const lowColor = stateColor(this, this.stateObj, active ? "heat" : "off");
    const highColor = stateColor(this, this.stateObj, active ? "cool" : "off");

    let actionColor: string | undefined;
    if (action && action !== "idle" && action !== "off" && active) {
      actionColor = stateColor(
        this,
        this.stateObj,
        CLIMATE_HVAC_ACTION_TO_MODE[action]
      );
    }

    const containerSizeClass = this._sizeController.value
      ? ` ${this._sizeController.value}`
      : "";

    if (
      this._supportsTargetTemperature &&
      this.stateObj.state !== UNAVAILABLE
    ) {
      const heatCoolModes = this.stateObj.attributes.hvac_modes.filter((m) =>
        ["heat", "cool", "heat_cool"].includes(m)
      );
      const sliderMode =
        SLIDER_MODES[
          heatCoolModes.length === 1 && ["off", "auto"].includes(mode)
            ? heatCoolModes[0]
            : mode
        ];

      return html`
        <div
          class="container${containerSizeClass}"
          style=${styleMap({
            "--state-color": color,
            "--action-color": actionColor,
          })}
        >
          <ha-control-circular-slider
            .preventInteractionOnScroll=${this.preventInteractionOnScroll}
            .inactive=${!active}
            .mode=${sliderMode}
            .value=${this._targetTemperature.value}
            .min=${this._min}
            .max=${this._max}
            .step=${this._step}
            .current=${this.stateObj.attributes.current_temperature}
            @value-changed=${this._valueChanged}
            @value-changing=${this._valueChanging}
          >
          </ha-control-circular-slider>
          ${this._renderInfo()} ${this._renderTemperatureButtons("value")}
        </div>
      `;
    }

    if (
      this._supportsTargetTemperatureRange &&
      this.stateObj.state !== UNAVAILABLE
    ) {
      return html`
        <div
          class="container${containerSizeClass}"
          style=${styleMap({
            "--low-color": lowColor,
            "--high-color": highColor,
            "--action-color": actionColor,
          })}
        >
          <ha-control-circular-slider
            .preventInteractionOnScroll=${this.preventInteractionOnScroll}
            .inactive=${!active}
            dual
            .low=${this._targetTemperature.low}
            .high=${this._targetTemperature.high}
            .min=${this._min}
            .max=${this._max}
            .step=${this._step}
            .current=${this.stateObj.attributes.current_temperature}
            @low-changed=${this._valueChanged}
            @low-changing=${this._valueChanging}
            @high-changed=${this._valueChanged}
            @high-changing=${this._valueChanging}
          >
          </ha-control-circular-slider>
          ${this._renderInfo()}
          ${this._renderTemperatureButtons(this._selectTargetTemperature, true)}
        </div>
      `;
    }

    return html`
      <div
        class="container${containerSizeClass}"
        style=${styleMap({
          "--state-color": stateColor,
          "--action-color": actionColor,
        })}
      >
        <ha-control-circular-slider
          .preventInteractionOnScroll=${this.preventInteractionOnScroll}
          mode="full"
          .current=${this.stateObj.attributes.current_temperature}
          .min=${this._min}
          .max=${this._max}
          .step=${this._step}
          readonly
          .disabled=${!active}
        >
        </ha-control-circular-slider>
        ${this._renderInfo()}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      stateControlCircularSliderStyle,
      css`
        /* Dual target */
        .dual {
          display: flex;
          flex-direction: row;
          gap: 24px;
        }
        .target-button {
          outline: none;
          background: none;
          color: inherit;
          font-family: inherit;
          font-size: inherit;
          font-weight: inherit;
          -webkit-tap-highlight-color: transparent;
          border: none;
          opacity: 0.7;
          padding: 0;
          transition:
            opacity 180ms ease-in-out,
            transform 180ms ease-in-out;
          cursor: pointer;
        }
        .target-button:focus-visible {
          transform: scale(1.1);
        }
        .target-button.selected {
          opacity: 1;
        }
        .container.md .dual {
          gap: 16px;
        }
        .container.sm .dual,
        .container.xs .dual {
          gap: 8px;
        }
        .container.sm .target-icon {
          display: none;
        }
        .secondary {
          direction: ltr;
        }
        ha-control-circular-slider {
          --control-circular-slider-low-color: var(
            --low-color,
            var(--disabled-color)
          );
          --control-circular-slider-high-color: var(
            --high-color,
            var(--disabled-color)
          );
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-climate-temperature": HaStateControlClimateTemperature;
  }
}
