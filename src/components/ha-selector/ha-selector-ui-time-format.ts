import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../ha-time-format-picker";

@customElement("ha-selector-ui_time_format")
export class HaSelectorUiTimeFormat extends LitElement {
  @property() public value?: string | string[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  protected render() {
    return html`
      <ha-time-format-picker
        .label=${this.label}
        .value=${this.value}
        .helper=${this.helper}
        .disabled=${this.disabled}
      >
      </ha-time-format-picker>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-ui_time_format": HaSelectorUiTimeFormat;
  }
}
