import { customElement, html, LitElement, property } from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import { HomeAssistant } from "../../types";
import "@polymer/paper-input/paper-textarea";

@customElement("ha-selector-text")
export class HaTextSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public value?: any;

  @property() public label?: string;

  protected render() {
    return html`<paper-textarea
      .label=${this.label}
      .value="${this.value}"
      @keydown=${this._ignoreKeydown}
      @value-changed="${this._handleChange}"
      autocapitalize="none"
      autocomplete="off"
      spellcheck="false"
    ></paper-textarea>`;
  }

  private _handleChange(ev) {
    const value = ev.target.value;
    if (this.value === value) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }

  private _ignoreKeydown(ev: KeyboardEvent) {
    ev.stopPropagation();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-text": HaTextSelector;
  }
}
