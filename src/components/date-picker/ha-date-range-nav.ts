import { mdiCalendar } from "@mdi/js";
import { css, html } from "lit";
import { customElement } from "lit/decorators";
import "../chips/ha-assist-chip";
import "../ha-icon-button-next";
import "../ha-icon-button-prev";
import "../ha-svg-icon";
import {
  haDateRangePickerStyles,
  HaDateRangePicker,
} from "./ha-date-range-picker";

/**
 * Date range picker as a single pill that also steps through ranges: a
 * previous button, the selected range and a next button. Meant for a toolbar,
 * next to other chips.
 */
@customElement("ha-date-range-nav")
export class HaDateRangeNav extends HaDateRangePicker {
  protected override _renderField() {
    return html`
      <ha-icon-button-prev
        class="step"
        .label=${this._i18n.localize("ui.common.previous")}
        .disabled=${this.disabled}
        @click=${this._handlePrev}
      ></ha-icon-button-prev>
      <ha-assist-chip
        id="field"
        class="range"
        .label=${this._formatRange(" – ")}
        .disabled=${this.disabled}
        @click=${this._openPicker}
      >
        <ha-svg-icon slot="icon" .path=${mdiCalendar}></ha-svg-icon>
      </ha-assist-chip>
      <ha-icon-button-next
        class="step"
        .label=${this._i18n.localize("ui.common.next")}
        .disabled=${this.disabled}
        @click=${this._handleNext}
      ></ha-icon-button-next>
    `;
  }

  static override styles = [
    haDateRangePickerStyles,
    css`
      /* The three controls read as one pill, with the range chip's borders as
         the dividers between them. */
      .date-range-inputs {
        gap: 0;
        border: 1px solid var(--outline-color);
        border-radius: var(--ha-assist-chip-container-shape, 10px);
        background: var(--ha-assist-chip-container-color, transparent);
        overflow: hidden;
        width: fit-content;
      }

      .step {
        --ha-icon-button-size: 32px;
        --mdc-icon-size: 20px;
      }

      .range {
        --md-assist-chip-outline-color: transparent;
        --ha-assist-chip-container-shape: 0;
        --ha-assist-chip-container-color: transparent;
        border-inline: 1px solid var(--divider-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-date-range-nav": HaDateRangeNav;
  }
}
