import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { AppSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-addon-picker";

@customElement("ha-selector-app")
export class HaAppSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: AppSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`<ha-addon-picker
      .hass=${this.hass}
      .value=${this.value}
      .label=${this.label}
      .helper=${this.helper}
      .disabled=${this.disabled}
      .required=${this.required}
    ></ha-addon-picker>`;
  }

  static styles = css`
    ha-addon-picker {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-app": HaAppSelector;
  }
}
