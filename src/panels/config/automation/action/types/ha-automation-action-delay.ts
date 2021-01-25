import "@polymer/paper-input/paper-input";
import { customElement, html, LitElement, property } from "lit-element";
import "../../../../../components/entity/ha-entity-picker";
import "../../../../../components/ha-service-picker";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { DelayAction } from "../../../../../data/script";
import { HomeAssistant } from "../../../../../types";
import { ActionElement } from "../ha-automation-action-row";
import {
  HaFormTimeData,
  HaFormTimeSchema,
} from "../../../../../components/ha-form/ha-form";

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

    const schema: HaFormTimeSchema = {
      type: "positive_time_period_dict",
      name: "",
      enableMillisec: true,
    };

    return html`
      <ha-form
        .data=${data}
        .schema=${schema}
        @value-changed=${this._valueChanged}
      >
      </ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const configValue = "delay";
    const value = ev.detail.value;

    const newValue = { ...this.action };
    if (value) {
      newValue[configValue] = ev.detail.value;
    }
    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-delay": HaDelayAction;
  }
}
