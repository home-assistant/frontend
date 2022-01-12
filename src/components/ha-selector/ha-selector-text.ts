import "@polymer/paper-input/paper-input";
import "@polymer/paper-input/paper-textarea";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { StringSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";

@customElement("ha-selector-text")
export class HaTextSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public value?: any;

  @property() public label?: string;

  @property() public placeholder?: string;

  @property() public selector!: StringSelector;

  @property({ type: Boolean }) public disabled = false;

  protected render() {
    if (this.selector.text?.multiline) {
      return html`<paper-textarea
        .label=${this.label}
        .placeholder=${this.placeholder}
        .value=${this.value}
        .disabled=${this.disabled}
        @value-changed=${this._handleChange}
        autocapitalize="none"
        autocomplete="off"
        spellcheck="false"
      ></paper-textarea>`;
    }
    return html`<paper-input
      required
      .value=${this.value}
      .placeholder=${this.placeholder}
      .disabled=${this.disabled}
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
