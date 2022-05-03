import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { HomeAssistant } from "../../types";
import "../ha-yaml-editor";
import "../ha-input-helper-text";

@customElement("ha-selector-object")
export class HaObjectSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`<ha-yaml-editor
        .hass=${this.hass}
        .readonly=${this.disabled}
        .label=${this.label}
        .required=${this.required}
        .placeholder=${this.placeholder}
        .defaultValue=${this.value}
        @value-changed=${this._handleChange}
      ></ha-yaml-editor>
      ${this.helper
        ? html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
        : ""} `;
  }

  private _handleChange(ev) {
    const value = ev.target.value;
    if (!ev.target.isValid) {
      return;
    }
    if (this.value === value) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-object": HaObjectSelector;
  }
}
