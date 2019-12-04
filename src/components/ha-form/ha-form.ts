import {
  customElement,
  LitElement,
  html,
  property,
  CSSResult,
  css,
} from "lit-element";

import "./ha-form-string";
import "./ha-form-integer";
import "./ha-form-float";
import "./ha-form-boolean";
import "./ha-form-select";
import "./ha-form-positive_time_period_dict";
import { fireEvent } from "../../common/dom/fire_event";
import { dynamicContentDirective } from "../../common/dom/dynamic-content-directive";

export type HaFormSchema =
  | HaFormStringSchema
  | HaFormIntegerSchema
  | HaFormFloatSchema
  | HaFormBooleanSchema
  | HaFormSelectSchema
  | HaFormTimeSchema;

export interface HaFormBaseSchema {
  name: string;
  default?: HaFormData;
  required?: boolean;
  optional?: boolean;
  description?: { suffix?: string };
}

export interface HaFormIntegerSchema extends HaFormBaseSchema {
  type: "integer";
  default?: HaFormIntegerData;
  valueMin?: number;
  valueMax?: number;
}

export interface HaFormSelectSchema extends HaFormBaseSchema {
  type: "select";
  options?: string[];
}

export interface HaFormFloatSchema extends HaFormBaseSchema {
  type: "float";
}

export interface HaFormStringSchema extends HaFormBaseSchema {
  type: "string";
  format?: string;
}

export interface HaFormBooleanSchema extends HaFormBaseSchema {
  type: "boolean";
}

export interface HaFormTimeSchema extends HaFormBaseSchema {
  type: "time";
}

export interface HaFormDataContainer {
  [key: string]: HaFormData;
}

export type HaFormData =
  | HaFormStringData
  | HaFormIntegerData
  | HaFormFloatData
  | HaFormBooleanData
  | HaFormSelectData
  | HaFormTimeData;

export type HaFormStringData = string;
export type HaFormIntegerData = number;
export type HaFormFloatData = number;
export type HaFormBooleanData = boolean;
export type HaFormSelectData = string;
export interface HaFormTimeData {
  hours?: number;
  minutes?: number;
  seconds?: number;
}

export interface HaFormElement extends LitElement {
  schema: HaFormSchema;
  data: HaFormDataContainer | HaFormData;
  label?: string;
  suffix?: string;
}

@customElement("ha-form")
export class HaForm extends LitElement implements HaFormElement {
  @property() public data!: HaFormDataContainer | HaFormData;
  @property() public schema!: HaFormSchema;
  @property() public error;
  @property() public computeError?: (schema: HaFormSchema, error) => string;
  @property() public computeLabel?: (schema: HaFormSchema) => string;
  @property() public computeSuffix?: (schema: HaFormSchema) => string;

  public focus() {
    const input =
      this.shadowRoot!.querySelector("ha-form") ||
      this.shadowRoot!.getElementById("child-form");
    if (!input) {
      return;
    }
    (input as HTMLElement).focus();
  }

  protected render() {
    if (Array.isArray(this.schema)) {
      return html`
        ${this.error && this.error.base
          ? html`
              <div class="error">
                ${this._computeError(this.error.base, this.schema)}
              </div>
            `
          : ""}
        ${this.schema.map(
          (item) => html`
            <ha-form
              .data=${this._getValue(this.data, item)}
              .schema=${item}
              .error=${this._getValue(this.error, item)}
              @value-changed=${this._valueChanged}
              .computeError=${this.computeError}
              .computeLabel=${this.computeLabel}
              .computeSuffix=${this.computeSuffix}
            ></ha-form>
          `
        )}
      `;
    }

    return html`
      ${this.error
        ? html`
            <div class="error">
              ${this._computeError(this.error, this.schema)}
            </div>
          `
        : ""}
      ${dynamicContentDirective(
        `ha-form-${this.schema.type}`,
        {
          schema: this.schema,
          data: this.data,
          label: this._computeLabel(this.schema),
          suffix: this._computeSuffix(this.schema),
        },
        { id: "child-form" }
      )}
    `;
  }

  private _computeLabel(schema: HaFormSchema) {
    return this.computeLabel
      ? this.computeLabel(schema)
      : schema
      ? schema.name
      : "";
  }

  private _computeSuffix(schema: HaFormSchema) {
    return this.computeSuffix
      ? this.computeSuffix(schema)
      : schema && schema.description
      ? schema.description.suffix
      : "";
  }

  private _computeError(error, schema: HaFormSchema) {
    return this.computeError ? this.computeError(error, schema) : error;
  }

  private _getValue(obj, item) {
    if (obj) {
      return obj[item.name];
    }
    return null;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const schema = (ev.target as HaFormElement).schema;
    const data = this.data as HaFormDataContainer;
    data[schema.name] = ev.detail.value;
    fireEvent(this, "value-changed", {
      value: { ...data },
    });
  }

  static get styles(): CSSResult {
    return css`
      .error {
        color: var(--error-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form": HaForm;
  }
}
