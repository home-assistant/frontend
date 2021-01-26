import "@polymer/paper-input/paper-input";
import { customElement, html, LitElement, property } from "lit-element";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/entity/ha-entity-picker";
import { HaFormTimeData } from "../../../../../components/ha-form/ha-form";
import "../../../../../components/ha-service-picker";
import { DelayAction } from "../../../../../data/script";
import { HomeAssistant } from "../../../../../types";
import { ActionElement } from "../ha-automation-action-row";

@customElement("ha-automation-action-delay")
export class HaDelayAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public action!: DelayAction;

  public static get defaultConfig() {
    return { delay: "" };
  }

  protected render() {
    let data: HaFormTimeData = {};

    if (typeof this.action.delay !== "object") {
      const parts = this.action.delay?.toString().split(":") || [];
      data = {
        hours: Number(parts[0]),
        minutes: Number(parts[1]),
        seconds: Number(parts[2]),
        milliseconds: Number(parts[3]),
      };
    } else {
      const { days, minutes, seconds, milliseconds } = this.action.delay;
      let { hours } = this.action.delay || 0;
      hours = (hours || 0) + (days || 0) * 24;
      data = {
        hours: hours,
        minutes: minutes,
        seconds: seconds,
        milliseconds: milliseconds,
      };
    }

    return html`
      <ha-time-input
        .data=${data}
        enableMillisecond
        @value-changed=${this._valueChanged}
      ></ha-time-input>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;
    if (!value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { ...this.action, delay: value },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-delay": HaDelayAction;
  }
}
