import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import type { UserSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../user/ha-user-picker";
import "../user/ha-users-picker";

@customElement("ha-selector-user")
export class HaUserSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: UserSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    if (this.selector.user?.multiple) {
      return html`
        <ha-users-picker
          .hass=${this.hass}
          .value=${this.value}
          .label=${this.label}
          .helper=${this.helper}
          .disabled=${this.disabled}
          .required=${this.required}
          .includeSystem=${this.selector.user.include_system}
        ></ha-users-picker>
      `;
    }

    return html`
      <ha-user-picker
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        .includeSystem=${this.selector.user?.include_system}
      ></ha-user-picker>
    `;
  }

  static get styles() {
    return css`
      ha-user-picker {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-user": HaUserSelector;
  }
}
