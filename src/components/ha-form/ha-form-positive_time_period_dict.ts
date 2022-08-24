import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../ha-duration-input";
import { HaFormElement, HaFormTimeData, HaFormTimeSchema } from "./types";

@customElement("ha-form-positive_time_period_dict")
export class HaFormTimePeriod extends LitElement implements HaFormElement {
  @property({ attribute: false }) public schema!: HaFormTimeSchema;

  @property({ attribute: false }) public data!: HaFormTimeData;

  @property() public label!: string;

  @property({ type: Boolean }) public disabled = false;

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
        ?required=${this.schema.required}
        .data=${this.data}
        .disabled=${this.disabled}
      ></ha-duration-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-positive_time_period_dict": HaFormTimePeriod;
  }
}
