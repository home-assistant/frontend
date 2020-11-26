import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
} from "lit-element";
import { HomeAssistant } from "../../types";
import { TimeSelector } from "../../data/selector";
import { fireEvent } from "../../common/dom/fire_event";
import "../paper-time-input";

@customElement("ha-selector-time")
export class HaTimeSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: TimeSelector;

  @property() public value?: string;

  @property() public label?: string;

  protected render() {
    const parts = this.value?.split(":") || [];

    return html`${this.label}
      <paper-time-input
        .hour=${parts[0] ?? "0"}
        .min=${parts[1] ?? "00"}
        .sec=${parts[2] ?? "00"}
        .amPm=${false}
        @change=${this._timeChanged}
        hide-label
        enable-second
        format="24"
      ></paper-time-input> `;
  }

  private _timeChanged(ev) {
    fireEvent(this, "value-changed", {
      value: ev.target.value,
    });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-time": HaTimeSelector;
  }
}
