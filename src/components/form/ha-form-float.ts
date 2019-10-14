import {
  customElement,
  LitElement,
  html,
  property,
  TemplateResult,
  query,
} from "lit-element";
import { HaFormElement, HaFormSchema } from "./ha-form";
import { fireEvent } from "../../common/dom/fire_event";

import "@polymer/paper-input/paper-input";
// Not duplicate, is for typing
// tslint:disable-next-line
import { PaperInputElement } from "@polymer/paper-input/paper-input";

@customElement("ha-form-float")
export class HaFormFloat extends LitElement implements HaFormElement {
  @property() public schema!: HaFormSchema;
  @property() public data!: { [key: string]: any };
  @property() public label!: string;
  @property() public suffix!: string;
  @query("paper-input") private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <paper-input
        .label=${this.label}
        .value=${this.data}
        .required=${this.schema.required}
        .auto-validate=${this.schema.required}
        @change=${this._valueChanged}
      >
        <span suffix="" slot="suffix">${this.suffix}</span>
      </paper-input>
    `;
  }

  private _valueChanged(ev: Event) {
    fireEvent(
      this,
      "value-changed",
      {
        value: Number((ev.target as PaperInputElement).value),
      },
      { bubbles: false }
    );
  }
}
