import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { TimezoneSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-timezone-picker";

@customElement("ha-selector-timezone")
export class HaTimezoneSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: TimezoneSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  protected render() {
    return html`
      <ha-timezone-picker
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-timezone-picker>
    `;
  }

  static styles = css`
    ha-timezone-picker {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-timezone": HaTimezoneSelector;
  }
}
