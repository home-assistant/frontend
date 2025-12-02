import type { CSSResultGroup } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { formatNumber } from "../common/number/format_number";
import { blankBeforeUnit } from "../common/translations/blank_before_unit";
import type { HomeAssistant } from "../types";

@customElement("ha-big-number")
export class HaBigNumber extends LitElement {
  @property({ type: Number }) public value!: number;

  @property() public unit?: string;

  @property({ attribute: "unit-position" })
  public unitPosition: "top" | "bottom" = "top";

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false })
  public formatOptions: Intl.NumberFormatOptions = {};

  protected render() {
    const formatted = formatNumber(
      this.value,
      this.hass?.locale,
      this.formatOptions
    );
    const [integer] = formatted.includes(".")
      ? formatted.split(".")
      : formatted.split(",");

    const temperatureDecimal = formatted.replace(integer, "");

    const formattedValue = `${this.value}${
      this.unit
        ? `${blankBeforeUnit(this.unit, this.hass?.locale)}${this.unit}`
        : ""
    }`;

    const unitBottom = this.unitPosition === "bottom";

    return html`
      <p class="value">
        <span aria-hidden="true" class="displayed-value">
          <span>${integer}</span>
          <span class="addon ${classMap({ bottom: unitBottom })}">
            <span class="decimal">${temperatureDecimal}</span>
            <span class="unit">${this.unit}</span>
          </span>
        </span>
        <span class="visually-hidden">${formattedValue}</span>
      </p>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          font-size: 57px;
          line-height: 1.12;
          letter-spacing: -0.25px;
        }
        .value {
          display: flex;
          margin: 0;
          direction: ltr;
        }
        .displayed-value {
          display: inline-flex;
          flex-direction: row;
          align-items: flex-end;
        }
        .addon {
          display: flex;
          flex-direction: column-reverse;
          padding: 4px 0;
        }
        .addon.bottom {
          flex-direction: row;
          align-items: baseline;
        }
        .addon.bottom .unit {
          margin-bottom: 4px;
          margin-left: 2px;
        }
        .value .decimal {
          font-size: 0.42em;
          line-height: 1.33;
          min-height: 1.33em;
        }
        .value .unit {
          font-size: 0.33em;
          line-height: var(--ha-line-height-condensed);
        }
        /* Accessibility */
        .visually-hidden {
          position: absolute;
          overflow: hidden;
          clip: rect(0 0 0 0);
          height: 1px;
          width: 1px;
          margin: -1px;
          padding: 0;
          border: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-big-number": HaBigNumber;
  }
}
