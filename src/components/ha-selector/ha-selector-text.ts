import { customElement, html, LitElement, property } from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import { HomeAssistant } from "../../types";
import "@polymer/paper-input/paper-textarea";
import "@polymer/paper-input/paper-input";
import { StringSelector } from "../../data/selector";

@customElement("ha-selector-text")
export class HaTextSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public value?: any;

  @property() public label?: string;

  @property() public selector!: StringSelector;

  protected render() {
    if (this.selector.text?.multiline) {
      return html`<paper-textarea
        .label=${this.label}
        .value="${this.value}"
        @value-changed="${this._handleChange}"
        autocapitalize="none"
        autocomplete="off"
        spellcheck="false"
      ></paper-textarea>`;
    }
    return html`<paper-input
      required
      .value=${this.value}
      @value-changed=${this._handleChange}
      .label=${this.label}
    ></paper-input>`;
  }

  private _handleChange(ev) {
    const value = ev.target.value;
    if (this.value === value) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-text": HaTextSelector;
  }
}
