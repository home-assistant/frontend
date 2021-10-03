import "@material/mwc-textfield";
import type { TextField } from "@material/mwc-textfield";
import "@material/mwc-slider";
import type { Slider } from "@material/mwc-slider";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  TemplateResult,
  PropertyValues,
} from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { HaCheckbox } from "../ha-checkbox";
import { HaFormElement, HaFormIntegerData, HaFormIntegerSchema } from "./types";

@customElement("ha-form-integer")
export class HaFormInteger extends LitElement implements HaFormElement {
  @property() public schema!: HaFormIntegerSchema;

  @property() public data?: HaFormIntegerData;

  @property() public label?: string;

  @query("paper-input ha-slider") private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    if ("valueMin" in this.schema && "valueMax" in this.schema) {
      return html`
        <div>
          ${this.label}
          <div class="flex">
            ${this.schema.optional
              ? html`
                  <ha-checkbox
                    @change=${this._handleCheckboxChange}
                    .checked=${this.data !== undefined}
                  ></ha-checkbox>
                `
              : ""}
            <mwc-slider
              discrete
              .value=${this._value}
              .min=${this.schema.valueMin}
              .max=${this.schema.valueMax}
              .disabled=${this.data === undefined && this.schema.optional}
              @change=${this._valueChanged}
            ></mwc-slider>
          </div>
        </div>
      `;
    }

    return html`
      <mwc-textfield
        type="number"
        .label=${this.label}
        .value=${this.data !== undefined ? this.data : ""}
        .required=${this.schema.required}
        .autoValidate=${this.schema.required}
        .suffix=${this.schema.description?.suffix}
        .validationMessage=${this.schema.required ? "Required" : undefined}
        @change=${this._valueChanged}
      ></mwc-textfield>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("schema")) {
      this.toggleAttribute(
        "own-margin",
        !("valueMin" in this.schema && "valueMax" in this.schema) &&
          !!this.schema.required
      );
    }
  }

  private get _value() {
    if (this.data !== undefined) {
      return this.data;
    }

    if (this.schema.optional) {
      return 0;
    }

    return this.schema.description?.suggested_value || this.schema.default || 0;
  }

  private _handleCheckboxChange(ev: Event) {
    const checked = (ev.target as HaCheckbox).checked;
    fireEvent(this, "value-changed", {
      value: checked
        ? this.schema.description?.suggested_value || this.schema.default || 0
        : undefined,
    });
  }

  private _valueChanged(ev: Event) {
    const source = ev.target as TextField | Slider;
    const rawValue = source.value;

    let value: number | undefined;

    if (rawValue !== "") {
      value = parseInt(String(rawValue));
    }

    if (this.data === value) {
      // parseInt will drop invalid text at the end, in that case update textfield
      const newRawValue = value === undefined ? "" : String(value);
      if (source.value !== newRawValue) {
        source.value = newRawValue;
      }
      return;
    }

    fireEvent(this, "value-changed", {
      value,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host([own-margin]) {
        margin-bottom: 5px;
      }
      .flex {
        display: flex;
      }
      mwc-slider {
        flex: 1;
      }
      mwc-textfield {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-integer": HaFormInteger;
  }
}
