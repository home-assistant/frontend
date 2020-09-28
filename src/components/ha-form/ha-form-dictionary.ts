import "../ha-icon-button";
import "@polymer/paper-input/paper-input";
import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import type {
  HaFormElement,
  HaFormDictionaryData,
  HaFormDictionarySchema,
  HaFormData,
  HaFormSchema,
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

  protected render(): TemplateResult {
    const boolSchema = { type: "boolean" };
    console.log(
      "XXX HERE schema=%s data=%s",
      JSON.stringify(this.schema),
      JSON.stringify(this.data)
    );
    console.log("XXX dictionary nesting=%s", JSON.stringify(this.nesting));
    if (this.schema.optional) console.log("XXX OPTIONAL");
    return html`
      ${this.schema.optional
        ? html` <ha-form-boolean .schema=${boolSchema}></ha-form-boolean> `
        : ""}
      <ha-form
        .schema=${this.schema.dictionary}
        .data=${this.data || {}}
        @value-changed=${this._valueChanged}
        .computeError=${this.computeError}
        .computeLabel=${this.computeLabel}
        .computeSuffix=${this.computeSuffix}
        .nesting=${this.nesting}
      >
      </ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this.data) this.data = new Map<string, HaFormData>(); // XXX need to match different params either as list or map
    console.log("XXX A");
    ev.stopPropagation();
    console.log("XXX B %s", JSON.stringify(ev.target as HaFormElement));
    const schema = (ev.target as HaFormElement).schema as HaFormSchema;
    console.log("XXX C");
    const data = this.data as HaFormDictionaryData;
    console.log(
      "XXX D schema.name=%s value=%s",
      schema.name,
      JSON.stringify(ev.detail.value)
    );
    data[schema.name] = ev.detail.value;
    console.log("XXX E");
    fireEvent(this, "value-changed", {
      value: { ...ev.detail.value },
    });
    console.log("XXX G");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-dictionary": HaFormDictionary;
  }
}
