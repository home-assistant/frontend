import {
  customElement,
  LitElement,
  html,
  property,
  TemplateResult,
  query,
  CSSResult,
  css,
} from "lit-element";
import {
  HaFormElement,
  HaFormIntegerData,
  HaFormIntegerSchema,
} from "./ha-form";
import { fireEvent } from "../../common/dom/fire_event";

import "../ha-paper-slider";
import "@polymer/paper-input/paper-input";
// Not duplicate, is for typing
// tslint:disable-next-line
import { PaperInputElement } from "@polymer/paper-input/paper-input";
import { PaperSliderElement } from "@polymer/paper-slider/paper-slider";
import { HaCheckbox } from "../ha-checkbox";

@customElement("ha-form-integer")
export class HaFormInteger extends LitElement implements HaFormElement {
  @property() public schema!: HaFormIntegerSchema;
  @property() public data?: HaFormIntegerData;
  @property() public label?: string;
  @property() public suffix?: string;
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
            <div class="flex">
              ${this.schema.optional && this.schema.default === undefined
                ? html`
                    <ha-checkbox
                      @change=${this._handleCheckboxChange}
                      .checked=${this.data !== undefined}
                    ></ha-checkbox>
                  `
                : ""}
              <ha-paper-slider
                pin=""
                .value=${this._value}
                .min=${this.schema.valueMin}
                .max=${this.schema.valueMax}
                .disabled=${this.data === undefined}
                @value-changed=${this._valueChanged}
              ></ha-paper-slider>
            </div>
          </div>
        `
      : html`
          <paper-input
            type="number"
            .label=${this.label}
            .value=${this._value}
            .required=${this.schema.required}
            .autoValidate=${this.schema.required}
            @value-changed=${this._valueChanged}
          ></paper-input>
        `;
  }

  private get _value() {
    return this.data || this.schema.default || 0;
  }

  private _handleCheckboxChange(ev: Event) {
    const checked = (ev.target as HaCheckbox).checked;
    fireEvent(this, "value-changed", {
      value: checked ? this._value : undefined,
    });
  }

  private _valueChanged(ev: Event) {
    const value = Number(
      (ev.target as PaperInputElement | PaperSliderElement).value
    );
    if (this._value === value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value,
    });
  }

  static get styles(): CSSResult {
    return css`
      .flex {
        display: flex;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-integer": HaFormInteger;
  }
}
