import {
  customElement,
  LitElement,
  html,
  property,
  TemplateResult,
  query,
} from "lit-element";

import { HaFormElement, HaFormStringData, HaFormStringSchema } from "./ha-form";
import { fireEvent } from "../../common/dom/fire_event";

import "@polymer/paper-input/paper-input";
import "@polymer/paper-icon-button/paper-icon-button";
// Not duplicate, is for typing
// tslint:disable-next-line
import { PaperInputElement } from "@polymer/paper-input/paper-input";

@customElement("ha-form-string")
export class HaFormString extends LitElement implements HaFormElement {
  @property() public schema!: HaFormStringSchema;
  @property() public data!: HaFormStringData;
  @property() public label!: string;
  @property() public suffix!: string;
  @property() private _unmaskedPassword = false;
  @query("paper-input") private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return this.schema.name.includes("password")
      ? html`
          <paper-input
            .type=${this._unmaskedPassword ? "text" : "password"}
            .label=${this.label}
            .value=${this.data}
            .required=${this.schema.required}
            .autoValidate=${this.schema.required}
            @value-changed=${this._valueChanged}
          >
            <paper-icon-button
              toggles
              .active=${this._unmaskedPassword}
              slot="suffix"
              .icon=${this._unmaskedPassword ? "hass:eye-off" : "hass:eye"}
              id="iconButton"
              title="Click to toggle between masked and clear password"
              @click=${this._toggleUnmaskedPassword}
            >
            </paper-icon-button>
          </paper-input>
        `
      : html`
          <paper-input
            .label=${this.label}
            .value=${this.data}
            .required=${this.schema.required}
            .autoValidate=${this.schema.required}
            error-message="Required"
            @value-changed=${this._valueChanged}
          ></paper-input>
        `;
  }

  private _toggleUnmaskedPassword(ev: Event) {
    this._unmaskedPassword = (ev.target as any).active;
  }

  private _valueChanged(ev: Event) {
    const value = (ev.target as PaperInputElement).value;
    if (this.data === value) {
      return;
    }
    fireEvent(
      this,
      "value-changed",
      {
        value,
      },
      { bubbles: false }
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-string": HaFormString;
  }
}
