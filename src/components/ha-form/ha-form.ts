import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
} from "lit-element";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../common/dom/fire_event";
import "./ha-form-boolean";
import "./ha-form-float";
import "./ha-form-integer";
import "./ha-form-multi_select";
import "./ha-form-positive_time_period_dict";
import "./ha-form-select";
import "./ha-form-string";
import "./ha-form-constant";
import "./ha-form-dictionary";

export type HaFormSchema =
  | HaFormConstantSchema
  | HaFormStringSchema
  | HaFormIntegerSchema
  | HaFormFloatSchema
  | HaFormBooleanSchema
  | HaFormSelectSchema
  | HaFormMultiSelectSchema
  | HaFormTimeSchema
  | HaFormDictionarySchema;

export interface HaFormBaseSchema {
  name: string;
  default?: HaFormData;
  required?: boolean;
  optional?: boolean;
  description?: { suffix?: string; suggested_value?: HaFormData };
}

export interface HaFormConstantSchema extends HaFormBaseSchema {
  type: "constant";
  value: string;
}

export interface HaFormIntegerSchema extends HaFormBaseSchema {
  type: "integer";
  default?: HaFormIntegerData;
  valueMin?: number;
  valueMax?: number;
}

export interface HaFormSelectSchema extends HaFormBaseSchema {
  type: "select";
  options?: string[] | Array<[string, string]>;
}

export interface HaFormMultiSelectSchema extends HaFormBaseSchema {
  type: "multi_select";
  options?: { [key: string]: string } | string[] | Array<[string, string]>;
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

export interface HaFormDictionarySchema extends HaFormBaseSchema {
  type: "dictionary";
  dictionary?: HaFormSchema[];
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
  | HaFormMultiSelectData
  | HaFormTimeData
  | HaFormDictionaryData;

export type HaFormStringData = string;
export type HaFormIntegerData = number;
export type HaFormFloatData = number;
export type HaFormBooleanData = boolean;
export type HaFormSelectData = string;
export type HaFormMultiSelectData = string[];
export type HaFormDictionaryData = Map<string, HaFormData>;
export interface HaFormTimeData {
  hours?: number;
  minutes?: number;
  seconds?: number;
}

export interface HaFormElement extends LitElement {
  schema: HaFormSchema | HaFormSchema[];
  data?: HaFormDataContainer | HaFormData;
  label?: string;
  suffix?: string;
  // computeError?: (schema: HaFormSchema, error) => string;
  // computeLabel?: (nesting: string) => string;
  // computeSuffix?: (schema: HaFormSchema) => string;
}

@customElement("ha-form")
export class HaForm extends LitElement implements HaFormElement {
  @property() public data!: HaFormDataContainer | HaFormData;

  @property() public schema!: HaFormSchema | HaFormSchema[];

  @property() public error;

  @property() public computeError?: (schema: HaFormSchema, error) => string;

  @property() public computeLabel?: (nesting: string) => string;

  @property() public computeSuffix?: (schema: HaFormSchema) => string;

  @property() public nesting = "";

  public focus() {
    const input =
      this.shadowRoot!.getElementById("child-form") ||
      this.shadowRoot!.querySelector("ha-form");
    if (!input) {
      return;
    }
    (input as HTMLElement).focus();
  }

  protected render() {
    console.log(
      "XXX form nesting=%s schema=%s",
      JSON.stringify(this.nesting),
      JSON.stringify(this.schema)
    );
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
              .nesting=${this._addNesting(this.nesting, item)}
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
      ${dynamicElement(`ha-form-${this.schema.type}`, {
        schema: this.schema,
        data: this.data,
        label: this._computeLabel(this.nesting),
        suffix: this._computeSuffix(this.schema),
        id: "child-form",
        // computeError: this.computeError,
        // computeLabel: this.computeLabel,
        // computeSuffix: this.computeSuffix,
        nesting: this.nesting,
      })}
    `;
  }

  private _addNesting(nesting: string, schema: HaFormSchema) {
    return nesting ? `${this.nesting}.${schema.name}` : schema.name;
  }

  private _computeLabel(nesting: string) {
    console.log("XXX _computeLabel");
    return this.computeLabel ? this.computeLabel(nesting) : nesting || "";
  }

  private _computeSuffix(schema: HaFormSchema) {
    return this.computeSuffix
      ? this.computeSuffix(schema)
      : schema && schema.description
      ? schema.description.suffix
      : "";
  }

  private _computeError(error, schema: HaFormSchema | HaFormSchema[]) {
    return this.computeError ? this.computeError(error, schema) : error;
  }

  private _getValue(obj, item) {
    if (obj) {
      return obj[item.name];
    }
    return null;
  }

  private _valueChanged(ev: CustomEvent) {
    console.log("XXX A %s ---", JSON.stringify(this.schema));
    ev.stopPropagation();
    console.log("XXX A1");
    const schema = (ev.target as HaFormElement).schema as HaFormSchema;
    console.log("XXX A2");
    const data = this.data as HaFormDataContainer;
    console.log("XXX A3 schema.name=%s value=", schema.name, ev.detail.value);
    data[schema.name] = ev.detail.value;
    console.log("XXX A4");
    fireEvent(this, "value-changed", {
      value: { ...data },
    });
    console.log("XXX A5");
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
