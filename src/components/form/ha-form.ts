import {
  customElement,
  LitElement,
  html,
  property,
  query,
  CSSResult,
  css,
  PropertyValues,
} from "lit-element";

import "./ha-form-string";
import "./ha-form-integer";
import "./ha-form-float";
import "./ha-form-boolean";
import "./ha-form-select";
import { fireEvent } from "../../common/dom/fire_event";

export interface HaFormSchema {
  type: "string" | "integer" | "float" | "boolean" | "select";
  required: boolean;
  name: string;
  valueMin?: number;
  valueMax?: number;
  options?: string[];
  description?: { unit_of_measurement?: string };
}

export interface HaFormData {
  [key: string]: any;
}

export interface HaFormElement extends LitElement {
  schema: HaFormSchema;
  data: HaFormData;
  label?: string;
  suffix?: string;
}

@customElement("ha-form")
export class HaForm extends LitElement implements HaFormElement {
  @property() public data!: HaFormData;
  @property() public schema!: HaFormSchema;
  @property() public error;
  @property() public computeError?: (schema: HaFormSchema, error) => string;
  @property() public computeLabel?: (schema: HaFormSchema) => string;
  @property() public computeSuffix?: (schema: HaFormSchema) => string;
  @query("ha-form") private _childForm?: HaForm;
  @query("#element") private _elementContainer?: HTMLDivElement;

  public focus() {
    const input = this._childForm
      ? this._childForm
      : this._elementContainer
      ? this._elementContainer.lastChild
      : undefined;

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
      <div id="element" @value-changed=${this._valueChanged}></div>
    `;
  }

  protected updated(changedProperties: PropertyValues) {
    const oldSchema: HaFormSchema = changedProperties.get(
      "schema"
    ) as HaFormSchema;
    if (
      !Array.isArray(this.schema) &&
      (!oldSchema || oldSchema.type !== this.schema.type)
    ) {
      const element = document.createElement(
        `ha-form-${this.schema.type}`
      ) as HaFormElement;
      element.schema = this.schema;
      element.data = this.data;
      element.label = this._computeLabel(this.schema);
      element.suffix = this._computeSuffix(this.schema);
      if (this._elementContainer!.lastChild) {
        this._elementContainer!.removeChild(this._elementContainer!.lastChild);
      }
      this._elementContainer!.append(element);
    } else if (this._elementContainer && this._elementContainer.lastChild) {
      const element = this._elementContainer!.lastChild as HaFormElement;
      element.schema = this.schema;
      element.data = this.data;
      element.label = this._computeLabel(this.schema);
      element.suffix = this._computeSuffix(this.schema);
    }
  }

  private _computeLabel(schema) {
    return this.computeLabel
      ? this.computeLabel(schema)
      : schema
      ? schema.name
      : "";
  }

  private _computeSuffix(schema) {
    return this.computeSuffix
      ? this.computeSuffix(schema)
      : schema && schema.description
      ? schema.description.unit_of_measurement
      : "";
  }

  private _computeError(error, schema) {
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
    this.data[schema.name] = ev.detail.value;
    fireEvent(
      this,
      "value-changed",
      {
        value: this.data,
      },
      { bubbles: false }
    );
  }

  static get styles(): CSSResult {
    return css`
      .error {
        color: red;
      }
    `;
  }
}
