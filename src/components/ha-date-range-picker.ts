import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { HomeAssistant } from "../types";
import { mdiCalendar } from "@mdi/js";
import { formatDateTime } from "../common/datetime/format_date_time";

const today = new Date();
today.setHours(0, 0, 0, 0);

const yesterday = new Date();
yesterday.setDate(today.getDate() - 1);
yesterday.setHours(0, 0, 0, 0);

const thisWeek = new Date();
thisWeek.setHours(0, 0, 0, 0);

const lastWeek = new Date();
lastWeek.setHours(0, 0, 0, 0);

@customElement("ha-date-range-picker")
export class HaDateRangePicker extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public startDate!: Date;

  @property() public endDate!: Date;

  @property({ type: Boolean }) public disabled = false;

  protected render(): TemplateResult {
    return html`
      <date-range-picker
        ?disabled=${this.disabled}
        twentyfour-hours=${this._compute24hourFormat()}
        start-date=${this.startDate}
        end-date=${this.endDate}
      >
        <div slot="input" class="date-range-inputs">
          <ha-svg-icon path=${mdiCalendar}></ha-svg-icon>
          <paper-input
            .value=${formatDateTime(this.startDate, this.hass.language)}
            label="From"
            .disabled=${this.disabled}
            readonly
            style="margin-right: 8px;"
          ></paper-input>
          <paper-input
            .value=${formatDateTime(this.endDate, this.hass.language)}
            label="Till"
            .disabled=${this.disabled}
            readonly
          ></paper-input>
        </div>
        <div slot="ranges" class="date-range-ranges">
          <mwc-list>
            <mwc-list-item
              @click=${this._setDateRange}
              .startDate=${today}
              .endDate=${today}
              >Today</mwc-list-item
            >
            <mwc-list-item
              @click=${this._setDateRange}
              .startDate=${yesterday}
              .endDate=${yesterday}
              >Yesterday</mwc-list-item
            >
            <mwc-list-item
              @click=${this._setDateRange}
              .startDate=${new Date(
                thisWeek.setDate(today.getDate() - today.getDay())
              )}
              .endDate=${new Date(
                thisWeek.setDate(today.getDate() - today.getDay() + 6)
              )}
              >This week</mwc-list-item
            >
            <mwc-list-item
              @click=${this._setDateRange}
              .startDate=${new Date(
                lastWeek.setDate(today.getDate() - today.getDay() - 7)
              )}
              .endDate=${new Date(
                lastWeek.setDate(today.getDate() - today.getDay() - 1)
              )}
              >Last week</mwc-list-item
            >
          </mwc-list>
        </div>
        <div slot="footer" class="date-range-footer">
          <mwc-button @click=${this._cancelDateRange}>Cancel</mwc-button>
          <mwc-button @click=${this._applyDateRange}>Select</mwc-button>
        </div>
      </date-range-picker>
    `;
  }

  private _compute24hourFormat() {
    return (
      new Intl.DateTimeFormat(this.hass.language, {
        hour: "numeric",
      })
        .formatToParts(new Date(2020, 0, 1, 13))
        .find((part) => part.type === "hour")!.value.length === 2
    );
  }

  private _setDateRange(ev) {
    const dateRangePicker = ev.currentTarget.closest("date-range-picker");
    const startDate = ev.target.startDate;
    const endDate = ev.target.endDate;
    dateRangePicker.vueComponent.$children[0].clickRange([startDate, endDate]);
    dateRangePicker.vueComponent.$children[0].clickedApply();
  }

  private _cancelDateRange(ev) {
    const dateRangePicker = ev.target.closest("date-range-picker");
    dateRangePicker.vueComponent.$children[0].clickCancel();
  }

  private _applyDateRange(ev) {
    const dateRangePicker = ev.target.closest("date-range-picker");
    dateRangePicker.vueComponent.$children[0].clickedApply();
  }

  static get styles(): CSSResult {
    return css`
      date-range-picker ha-svg-icon {
        margin-right: 8px;
      }

      .date-range-inputs {
        display: flex;
        align-items: center;
      }

      .date-range-ranges {
        border-right: 1px solid var(--divider-color);
      }

      @media only screen and (max-width: 800px) {
        .date-range-ranges {
          border-right: none;
          border-bottom: 1px solid var(--divider-color);
        }
      }

      .date-range-footer {
        display: flex;
        justify-content: flex-end;
        padding: 8px;
        border-top: 1px solid var(--divider-color);
      }

      date-range-picker paper-input {
        display: inline-block;
        max-width: 200px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-date-range-picker": HaDateRangePicker;
  }
}
