import {
  mdiFan,
  mdiFanOff,
  mdiFanSpeed1,
  mdiFanSpeed2,
  mdiFanSpeed3,
} from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
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
import { FanEntity } from "../../../../data/fan";
import { HomeAssistant } from "../../../../types";

type Speed = "off" | "low" | "medium" | "high" | "on";

const SPEEDS: Partial<Record<number, Speed[]>> = {
  2: ["off", "on"],
  3: ["off", "low", "high"],
  4: ["off", "low", "medium", "high"],
};

function percentageToSpeed(stateObj: HassEntity, value: number): string {
  const step = stateObj.attributes.percentage_step ?? 1;
  const speedValue = Math.round(value / step);
  const speedCount = Math.round(100 / step) + 1;

  const speeds = SPEEDS[speedCount];
  return speeds?.[speedValue] ?? "off";
}

function speedToPercentage(stateObj: HassEntity, speed: Speed): number {
  const step = stateObj.attributes.percentage_step ?? 1;
  const speedCount = Math.round(100 / step) + 1;

  const speeds = SPEEDS[speedCount];

  if (!speeds) {
    return 0;
  }

  const speedValue = speeds.indexOf(speed);
  if (speedValue === -1) {
    return 0;
  }
  return Math.round(speedValue * step);
}

const SPEED_ICON_NUMBER: string[] = [mdiFanSpeed1, mdiFanSpeed2, mdiFanSpeed3];

export function getFanSpeedCount(stateObj: HassEntity) {
  const step = stateObj.attributes.percentage_step ?? 1;
  const speedCount = Math.round(100 / step) + 1;
  return speedCount;
}

export const FAN_SPEED_COUNT_MAX_FOR_BUTTONS = 4;

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
    const speed = (ev.detail as any).value as Speed;

    const percentage = speedToPercentage(this.stateObj, speed);

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

  private _localizeSpeed(speed: Speed) {
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

    const speedCount = getFanSpeedCount(this.stateObj);

    if (speedCount <= FAN_SPEED_COUNT_MAX_FOR_BUTTONS) {
      const options = SPEEDS[speedCount]!.map<ControlSelectOption>(
        (speed, index) => ({
          value: speed,
          label: this._localizeSpeed(speed),
          path:
            speed === "on"
              ? mdiFan
              : speed === "off"
              ? mdiFanOff
              : SPEED_ICON_NUMBER[index - 1],
        })
      ).reverse();

      const speed = percentageToSpeed(
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
        >
        </ha-control-select>
      `;
    }

    return html`
      <ha-control-slider
        vertical
        .value=${this.value}
        min="0"
        max="100"
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
