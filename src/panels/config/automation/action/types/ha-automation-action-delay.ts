import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { hasTemplate } from "../../../../../common/string/has-template";
import type { HaDurationData } from "../../../../../components/ha-duration-input";
import "../../../../../components/ha-duration-input";
import { DelayAction } from "../../../../../data/script";
import { HomeAssistant } from "../../../../../types";
import { ActionElement } from "../ha-automation-action-row";

@customElement("ha-automation-action-delay")
export class HaDelayAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public action!: DelayAction;

  @property() public _timeData!: HaDurationData;

  public static get defaultConfig() {
    return { delay: "" };
  }

  protected updated(changedProperties: PropertyValues) {
    if (!changedProperties.has("action")) {
      return;
    }
    // Check for templates in action. If found, revert to YAML mode.
    if (this.action && hasTemplate(this.action)) {
      fireEvent(
        this,
        "ui-mode-not-available",
        Error(this.hass.localize("ui.errors.config.no_template_editor_support"))
      );
      return;
    }

    if (typeof this.action.delay !== "object") {
      if (typeof this.action.delay === "string" || isNaN(this.action.delay)) {
        const parts = this.action.delay?.toString().split(":") || [];
        this._timeData = {
          hours: Number(parts[0]) || 0,
          minutes: Number(parts[1]) || 0,
          seconds: Number(parts[2]) || 0,
          milliseconds: Number(parts[3]) || 0,
        };
      } else {
        this._timeData = { seconds: this.action.delay };
      }
      return;
    }
    const { days, minutes, seconds, milliseconds } = this.action.delay;
    let { hours } = this.action.delay || 0;
    hours = (hours || 0) + (days || 0) * 24;
    this._timeData = {
      hours: hours,
      minutes: minutes,
      seconds: seconds,
      milliseconds: milliseconds,
    };
  }

  protected render() {
    return html`<ha-duration-input
      .data=${this._timeData}
      enableMillisecond
      @value-changed=${this._valueChanged}
    ></ha-duration-input>`;
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
