import { html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { DurationSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-duration-input";
import type { HaDurationData, HaDurationInput } from "../ha-duration-input";

@customElement("ha-selector-duration")
export class HaTimeDuration extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: DurationSelector;

  @property({ attribute: false }) public value?:
    | HaDurationData
    | string
    | number;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @query("ha-duration-input", true) private _input?: HaDurationInput;

  public reportValidity(): boolean {
    return this._input?.reportValidity() ?? true;
  }

  private _data = memoizeOne(
    (value?: HaDurationData | string | number): HaDurationData | undefined => {
      if (typeof value === "number") {
        return { seconds: value };
      }
      if (typeof value === "string") {
        const negative = value.trim()[0] === "-";
        const parts = value
          .split(":")
          .map((p) => (negative && p ? -Math.abs(Number(p)) : Number(p)));

        if (parts.length === 1) {
          return { seconds: parts[0] };
        }
        if (parts.length === 2) {
          return { hours: parts[0], minutes: parts[1] };
        }
        if (parts.length === 3) {
          return {
            hours: parts[0],
            minutes: parts[1],
            seconds: parts[2],
          };
        }
        return undefined;
      }
      return value;
    }
  );

  protected render() {
    return html`
      <ha-duration-input
        .label=${this.label}
        .helper=${this.helper}
        .data=${this._data(this.value)}
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
