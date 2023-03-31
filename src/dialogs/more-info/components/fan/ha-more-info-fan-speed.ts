import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeAttributeNameDisplay } from "../../../../common/entity/compute_attribute_display";
import { computeStateDisplay } from "../../../../common/entity/compute_state_display";
import { stateColorCss } from "../../../../common/entity/state_color";
import "../../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../../components/ha-control-select";
import "../../../../components/ha-control-slider";
import { UNAVAILABLE } from "../../../../data/entity";
import {
  computeFanSpeedCount,
  computeFanSpeedIcon,
  FanEntity,
  fanPercentageToSpeed,
  FanSpeed,
  fanSpeedToPercentage,
  FAN_SPEEDS,
  FAN_SPEED_COUNT_MAX_FOR_BUTTONS,
} from "../../../../data/fan";
import { HomeAssistant } from "../../../../types";

@customElement("ha-more-info-fan-speed")
export class HaMoreInfoFanSpeed extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: FanEntity;

  @state() value?: number;

  protected updated(changedProp: Map<string | number | symbol, unknown>): void {
    if (changedProp.has("stateObj")) {
      this.value =
        this.stateObj.attributes.percentage != null
          ? Math.max(Math.round(this.stateObj.attributes.percentage), 1)
          : undefined;
    }
  }

  private _speedValueChanged(ev: CustomEvent) {
    const speed = (ev.detail as any).value as FanSpeed;

    const percentage = fanSpeedToPercentage(this.stateObj, speed);

    this.hass.callService("fan", "set_percentage", {
      entity_id: this.stateObj!.entity_id,
      percentage: percentage,
    });
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this.hass.callService("fan", "set_percentage", {
      entity_id: this.stateObj!.entity_id,
      percentage: value,
    });
  }

  private _localizeSpeed(speed: FanSpeed) {
    if (speed === "on" || speed === "off") {
      return computeStateDisplay(
        this.hass.localize,
        this.stateObj,
        this.hass.locale,
        this.hass.entities,
        speed
      );
    }
    return (
      this.hass.localize(`ui.dialogs.more_info_control.fan.speed.${speed}`) ||
      speed
    );
  }

  protected render() {
    const color = stateColorCss(this.stateObj);

    const speedCount = computeFanSpeedCount(this.stateObj);

    if (speedCount <= FAN_SPEED_COUNT_MAX_FOR_BUTTONS) {
      const options = FAN_SPEEDS[speedCount]!.map<ControlSelectOption>(
        (speed) => ({
          value: speed,
          label: this._localizeSpeed(speed),
          path: computeFanSpeedIcon(this.stateObj, speed),
        })
      ).reverse();

      const speed = fanPercentageToSpeed(
        this.stateObj,
        this.stateObj.attributes.percentage ?? 0
      );

      return html`
        <ha-control-select
          vertical
          .options=${options}
          .value=${speed}
          @value-changed=${this._speedValueChanged}
          .ariaLabel=${computeAttributeNameDisplay(
            this.hass.localize,
            this.stateObj,
            this.hass.entities,
            "percentage"
          )}
          style=${styleMap({
            "--control-select-color": color,
          })}
          .disabled=${this.stateObj.state === UNAVAILABLE}
        >
        </ha-control-select>
      `;
    }

    return html`
      <ha-control-slider
        vertical
        min="0"
        max="100"
        .value=${this.value}
        .step=${this.stateObj.attributes.percentage_step ?? 1}
        @value-changed=${this._valueChanged}
        .ariaLabel=${computeAttributeNameDisplay(
          this.hass.localize,
          this.stateObj,
          this.hass.entities,
          "percentage"
        )}
        style=${styleMap({
          "--control-slider-color": color,
        })}
        .disabled=${this.stateObj.state === UNAVAILABLE}
      >
      </ha-control-slider>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-control-slider {
        height: 45vh;
        max-height: 320px;
        min-height: 200px;
        --control-slider-thickness: 100px;
        --control-slider-border-radius: 24px;
        --control-slider-color: var(--primary-color);
        --control-slider-background: var(--disabled-color);
        --control-slider-background-opacity: 0.2;
      }
      ha-control-select {
        height: 45vh;
        max-height: 320px;
        min-height: 200px;
        --control-select-thickness: 100px;
        --control-select-border-radius: 24px;
        --control-select-color: var(--primary-color);
        --control-select-background: var(--disabled-color);
        --control-select-background-opacity: 0.2;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-fan-speed": HaMoreInfoFanSpeed;
  }
}
