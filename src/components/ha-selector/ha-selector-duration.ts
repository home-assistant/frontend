import { html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { DurationSelector } from "../../data/selector";
import "../ha-duration-input";
import type { HaDurationData, HaDurationInput } from "../ha-duration-input";
import { createDurationData } from "../../common/datetime/create_duration_data";

@customElement("ha-selector-duration")
export class HaTimeDuration extends LitElement {
  @property({ attribute: false }) public selector!: DurationSelector;

  @property({ attribute: false }) public value?:
    HaDurationData | string | number;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @query("ha-duration-input", true) private _input?: HaDurationInput;

  public reportValidity(): boolean {
    return this._input?.reportValidity() ?? true;
  }

  private _data = memoizeOne(
    (
      selector: DurationSelector,
      value?: HaDurationData | string | number
    ): HaDurationData | undefined =>
      createDurationData(
        value,
        selector.duration?.enable_day,
        selector.duration?.enable_millisecond
      )
  );

  protected render() {
    return html`
      <ha-duration-input
        .label=${this.label}
        .helper=${this.helper}
        .data=${this._data(this.selector, this.value)}
        .disabled=${this.disabled}
        .required=${this.required}
        .enableDay=${this.selector.duration?.enable_day}
        .enableMillisecond=${this.selector.duration?.enable_millisecond}
        .allowNegative=${this.selector.duration?.allow_negative}
        .enableSecond=${this.selector.duration?.enable_second ?? true}
      ></ha-duration-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-duration": HaTimeDuration;
  }
}
