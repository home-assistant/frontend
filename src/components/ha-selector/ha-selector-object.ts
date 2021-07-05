import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { HomeAssistant } from "../../types";
import "../ha-yaml-editor";

@customElement("ha-selector-object")
export class HaObjectSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public value?: any;

  @property() public label?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean }) public disabled = false;

  protected render() {
    return html`<ha-yaml-editor
      .disabled=${this.disabled}
      .placeholder=${this.placeholder}
      .defaultValue=${this.value}
      @value-changed=${this._handleChange}
    ></ha-yaml-editor>`;
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
