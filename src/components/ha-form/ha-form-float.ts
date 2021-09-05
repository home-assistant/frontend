import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { HaFormElement, HaFormFloatData, HaFormFloatSchema } from "./ha-form";

@customElement("ha-form-float")
export class HaFormFloat extends LitElement implements HaFormElement {
  @property() public schema!: HaFormFloatSchema;

  @property() public data!: HaFormFloatData;

  @property() public label!: string;

  @property() public suffix!: string;

  @query("paper-input", true) private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <paper-input
        .label=${this.label}
        .value=${this._value}
        .required=${this.schema.required}
        .autoValidate=${this.schema.required}
        @value-changed=${this._valueChanged}
      >
        <span suffix slot="suffix">${this.suffix}</span>
      </paper-input>
    `;
  }

  private get _value() {
    return this.data;
  }

  private _valueChanged(ev: Event) {
    const value: number | undefined = (ev.target as PaperInputElement).value
      ? Number((ev.target as PaperInputElement).value)
      : undefined;
    if (this._value === value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-float": HaFormFloat;
  }
}
