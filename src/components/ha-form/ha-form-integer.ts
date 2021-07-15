import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { HaCheckbox } from "../ha-checkbox";
import "../ha-slider";
import type { HaSlider } from "../ha-slider";
import {
  HaFormElement,
  HaFormIntegerData,
  HaFormIntegerSchema,
} from "./ha-form";

@customElement("ha-form-integer")
export class HaFormInteger extends LitElement implements HaFormElement {
  @property() public schema!: HaFormIntegerSchema;

  @property() public data?: HaFormIntegerData;

  @property() public label?: string;

  @property() public suffix?: string;

  @query("paper-input ha-slider") private _input?: HTMLElement;

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
              <ha-slider
                pin
                editable
                .value=${this._value}
                .min=${this.schema.valueMin}
                .max=${this.schema.valueMax}
                .disabled=${this.data === undefined &&
                this.schema.optional &&
                this.schema.default === undefined}
                @value-changed=${this._valueChanged}
              ></ha-slider>
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
    return (
      this.data ||
      this.schema.description?.suggested_value ||
      this.schema.default ||
      0
    );
  }

  private _handleCheckboxChange(ev: Event) {
    const checked = (ev.target as HaCheckbox).checked;
    fireEvent(this, "value-changed", {
      value: checked ? this._value : undefined,
    });
  }

  private _valueChanged(ev: Event) {
    const value = Number((ev.target as PaperInputElement | HaSlider).value);
    if (this._value === value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      .flex {
        display: flex;
      }
      ha-slider {
        width: 100%;
        margin-right: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-integer": HaFormInteger;
  }
}
