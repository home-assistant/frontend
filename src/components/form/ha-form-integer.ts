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

import "../ha-paper-slider";
import "@polymer/paper-input/paper-input";
// Not duplicate, is for typing
// tslint:disable-next-line
import { PaperInputElement } from "@polymer/paper-input/paper-input";
import { PaperSliderElement } from "@polymer/paper-slider/paper-slider";

@customElement("ha-form-integer")
export class HaFormInteger extends LitElement implements HaFormElement {
  @property() public schema!: HaFormSchema;
  @property() public data!: { [key: string]: any };
  @property() public label!: string;
  @property() public suffix!: string;
  @query("paper-input ha-paper-slider") private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return "valueMin" in this.schema && "valueMax" in this.schema
      ? html`
          <div>
            ${this.label}
            <ha-paper-slider
              pin=""
              .value=${this.data}
              .min=${this.schema.valueMin}
              .max=${this.schema.valueMax}
              @change=${this._valueChanged}
            ></ha-paper-slider>
          </div>
        `
      : html`
          <paper-input
            type="number"
            .label=${this.label}
            .value=${this.data}
            .required=${this.schema.required}
            .auto-validate=${this.schema.required}
            @change=${this._valueChanged}
          ></paper-input>
        `;
  }

  private _valueChanged(ev: Event) {
    fireEvent(
      this,
      "value-changed",
      {
        value: Number(
          (ev.target as PaperInputElement | PaperSliderElement).value
        ),
      },
      { bubbles: false }
    );
  }
}
