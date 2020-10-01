import "../ha-icon-button";
import "@polymer/paper-input/paper-input";
import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  css,
  CSSResultArray,
  PropertyValues,
  internalProperty,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import type {
  HaFormElement,
  HaFormDictionaryData,
  HaFormDictionarySchema,
  HaFormData,
  HaFormSchema,
  HaFormBooleanSchema,
} from "./ha-form";

@customElement("ha-form-dictionary")
export class HaFormDictionary extends LitElement implements HaFormElement {
  @property() public schema!: HaFormDictionarySchema;

  @property() public data!: HaFormDictionaryData;

  @property() public label!: string;

  @property() public suffix!: string;

  @property() public computeError?: (schema: HaFormSchema, error) => string;

  @property() public computeLabel?: (nesting: string) => string;

  @property() public computeSuffix?: (schema: HaFormSchema) => string;

  @property() public nesting = "";

  @internalProperty() private _showParams = true;

  private _saveData = this.data || ({} as HaFormDictionaryData);

  protected render(): TemplateResult {
    const boolSchema = { type: "boolean" } as HaFormBooleanSchema;
    return html`
      ${this._showParams
        ? html`
            <hr></hr>
            <h4>${this._computeLabel("title")}</h4>
            ${this._computeLabel("description")}
          `
        : ""}
      ${this.schema.optional
        ? html`
            <ha-form-boolean
              .schema=${boolSchema}
              .data=${this._showParams}
              label=${this._computeLabel("optional") ||
              `Configure ${this.nesting}`}
              @value-changed=${this._showParamsChanged}
            ></ha-form-boolean>
          `
        : ""}
      ${this._showParams
        ? html`
            <ha-form
              .schema=${this.schema.dictionary}
              .data=${this.data}
              @value-changed=${this._valueChanged}
              .computeError=${this.computeError}
              .computeLabel=${this.computeLabel}
              .computeSuffix=${this.computeSuffix}
              .nesting=${this.nesting}
              id="inner-form"
            >
            </ha-form>
            <hr></hr>
          `
        : ""}
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (this.schema.optional && !this.data) this._showParams = false;
  }

  private _showParamsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._showParams = ev.detail.value;
    fireEvent(this, "value-changed", {
      value: this._showParams ? this._saveData : "",
    });
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._saveData = ev.detail.value;
    fireEvent(this, "value-changed", {
      value: { ...ev.detail.value },
    });
  }

  private _computeLabel(param: string) {
    if (this.computeLabel) return this.computeLabel(`${this.nesting}.${param}`);
    return param || "";
  }

  static get styles(): CSSResultArray {
    return [
      css`
        hr {
          margin-left: -1em;
          margin-right: -1em;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-dictionary": HaFormDictionary;
  }
}
