import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { StringSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "@material/mwc-textfield/mwc-textfield";
import "@material/mwc-textarea/mwc-textarea";

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
      return html`<mwc-textarea
        .label=${this.label}
        .placeholder=${this.placeholder}
        .value=${this.value || ""}
        .disabled=${this.disabled}
        @input=${this._handleChange}
        autocapitalize="none"
        autocomplete="off"
        spellcheck="false"
        required
      ></mwc-textarea>`;
    }
    return html`<mwc-textfield
      .value=${this.value || ""}
      .placeholder=${this.placeholder || ""}
      .disabled=${this.disabled}
      @input=${this._handleChange}
      .label=${this.label || ""}
      required
    ></mwc-textfield>`;
  }

  private _handleChange(ev) {
    const value = ev.target.value;
    if (this.value === value) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }

  static get styles(): CSSResultGroup {
    return css`
      mwc-textfield,
      mwc-textarea {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-text": HaTextSelector;
  }
}
