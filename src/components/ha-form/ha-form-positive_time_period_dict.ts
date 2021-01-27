import {
  customElement,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import "../ha-time-input";
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
      <ha-time-input
        .label=${this.label}
        .required=${this.schema.required}
        .data=${this.data}
      ></ha-time-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-positive_time_period_dict": HaFormTimePeriod;
  }
}
