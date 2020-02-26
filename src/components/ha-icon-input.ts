import {
  html,
  css,
  LitElement,
  TemplateResult,
  property,
  customElement,
} from "lit-element";

import "@polymer/paper-input/paper-input";
import "./ha-icon";
import { fireEvent } from "../common/dom/fire_event";

@customElement("ha-icon-input")
export class HaIconInput extends LitElement {
  @property() public value?: string;
  @property() public label?: string;
  @property() public placeholder?: string;
  @property({ attribute: "error-message" }) public errorMessage?: string;
  @property({ type: Boolean }) public disabled = false;

  protected render(): TemplateResult {
    return html`
      <paper-input
        .value=${this.value}
        .label=${this.label}
        .placeholder=${this.placeholder}
        @value-changed=${this._valueChanged}
        .disabled=${this.disabled}
        auto-validate
        .errorMessage=${this.errorMessage}
        pattern="^\\S+:\\S+$"
      >
        ${this.value || this.placeholder
          ? html`
              <ha-icon .icon=${this.value || this.placeholder} slot="suffix">
              </ha-icon>
            `
          : ""}
      </paper-input>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    this.value = ev.detail.value;
    fireEvent(
      this,
      "value-changed",
      { value: ev.detail.value },
      {
        bubbles: false,
        composed: false,
      }
    );
  }

  static get styles() {
    return css`
      ha-icon {
        position: relative;
        bottom: 4px;
      }
    `;
  }
}
