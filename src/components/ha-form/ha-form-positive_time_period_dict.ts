import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../ha-duration-input";
import { HaFormElement, HaFormTimeData, HaFormTimeSchema } from "./ha-form";

@customElement("ha-form-positive_time_period_dict")
export class HaFormTimePeriod extends LitElement implements HaFormElement {
  @property() public schema!: HaFormTimeSchema;

  @property() public data!: HaFormTimeData;

  @property() public label!: string;

  @property() public suffix!: string;

  @query("ha-time-input", true) private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-duration-input
        .label=${this.label}
        .required=${this.schema.required}
        .data=${this.data}
      ></ha-duration-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-positive_time_period_dict": HaFormTimePeriod;
  }
}
