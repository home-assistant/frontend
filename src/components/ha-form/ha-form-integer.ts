import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { HaCheckbox } from "../ha-checkbox";
import "../ha-slider";
import { HaTextField } from "../ha-textfield";
import { HaFormElement, HaFormIntegerData, HaFormIntegerSchema } from "./types";

@customElement("ha-form-integer")
export class HaFormInteger extends LitElement implements HaFormElement {
  @property({ attribute: false }) public schema!: HaFormIntegerSchema;

  @property({ attribute: false }) public data?: HaFormIntegerData;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @query("ha-textfield ha-slider") private _input?:
    | HaTextField
    | HTMLInputElement;

  private _lastValue?: HaFormIntegerData;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    if (
      this.schema.valueMin !== undefined &&
      this.schema.valueMax !== undefined &&
      this.schema.valueMax - this.schema.valueMin < 256
    ) {
      return html`
        <div>
          ${this.label}
          <div class="flex">
            ${!this.schema.required
              ? html`
                  <ha-checkbox
                    @change=${this._handleCheckboxChange}
                    .checked=${this.data !== undefined}
                    .disabled=${this.disabled}
                  ></ha-checkbox>
                `
              : ""}
            <ha-slider
              labeled
              .value=${this._value}
              .min=${this.schema.valueMin}
              .max=${this.schema.valueMax}
              .disabled=${this.disabled ||
              (this.data === undefined && !this.schema.required)}
              @change=${this._valueChanged}
            ></ha-slider>
          </div>
          ${this.helper
            ? html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
            : ""}
        </div>
      `;
    }

    return html`
      <ha-textfield
        type="number"
        inputMode="numeric"
        .label=${this.label}
        .helper=${this.helper}
        helperPersistent
        .value=${this.data !== undefined ? this.data : ""}
        .disabled=${this.disabled}
        .required=${this.schema.required}
        .autoValidate=${this.schema.required}
        .suffix=${this.schema.description?.suffix}
        .validationMessage=${this.schema.required ? "Required" : undefined}
        @input=${this._valueChanged}
      ></ha-textfield>
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

    if (!this.schema.required) {
      return this.schema.valueMin || 0;
    }

    return (
      (this.schema.description?.suggested_value !== undefined &&
        this.schema.description?.suggested_value !== null) ||
      this.schema.default ||
      this.schema.valueMin ||
      0
    );
  }

  private _handleCheckboxChange(ev: Event) {
    const checked = (ev.target as HaCheckbox).checked;
    let value: HaFormIntegerData | undefined;
    if (checked) {
      for (const candidate of [
        this._lastValue,
        this.schema.description?.suggested_value as HaFormIntegerData,
        this.schema.default,
        0,
      ]) {
        if (candidate !== undefined) {
          value = candidate;
          break;
        }
      }
    } else {
      // We track last value so user can disable and enable a field without losing
      // their value.
      this._lastValue = this.data;
    }
    fireEvent(this, "value-changed", {
      value,
    });
  }

  private _valueChanged(ev: Event) {
    const source = ev.target as HaTextField | HTMLInputElement;
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
      ha-slider {
        flex: 1;
      }
      ha-textfield {
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
