import { html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import type { TimeSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-time-input";
import type { HaTimeInput } from "../ha-time-input";

@customElement("ha-selector-time")
export class HaTimeSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: TimeSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @query("ha-time-input") private _input?: HaTimeInput;

  public reportValidity(): boolean {
    return this._input?.reportValidity() ?? true;
  }

  protected render() {
    return html`
      <ha-time-input
        .value=${typeof this.value === "string" ? this.value : undefined}
        .locale=${this.hass.locale}
        .disabled=${this.disabled}
        .required=${this.required}
        clearable
        .helper=${this.helper}
        .label=${this.label}
        .enableSecond=${!this.selector.time?.no_second}
      ></ha-time-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-time": HaTimeSelector;
  }
}
