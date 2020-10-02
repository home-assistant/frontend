import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  PropertyValues,
} from "lit-element";
import { HomeAssistant } from "../types";
import { mdiCalendar } from "@mdi/js";
import { formatDateTime } from "../common/datetime/format_date_time";
import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list-item";
import "./ha-svg-icon";
import "@polymer/paper-input/paper-input";
import "@material/mwc-list/mwc-list";
import "./date-range-picker";
import { computeRTLDirection } from "../common/util/compute_rtl";
import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";

export interface DateRangePickerRanges {
  [key: string]: [Date, Date];
}

@customElement("ha-date-range-picker")
export class HaDateRangePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public startDate!: Date;

  @property() public endDate!: Date;

  @property() public ranges?: DateRangePickerRanges;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) private _hour24format = false;

  @property({ type: String }) private _rtlDirection = "ltr";

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass || oldHass.language !== this.hass.language) {
        this._hour24format = this._compute24hourFormat();
        this._rtlDirection = computeRTLDirection(this.hass);
      }
    }
  }

  protected render(): TemplateResult {
    return html`
      <date-range-picker
        ?disabled=${this.disabled}
        twentyfour-hours=${this._hour24format}
        start-date=${this.startDate}
        end-date=${this.endDate}
        ?ranges=${this.ranges !== undefined}
      >
        <div slot="input" class="date-range-inputs">
          <ha-svg-icon .path=${mdiCalendar}></ha-svg-icon>
          <paper-input
            .value=${formatDateTime(this.startDate, this.hass.language)}
            .label=${this.hass.localize(
              "ui.components.date-range-picker.start_date"
            )}
            .disabled=${this.disabled}
            @click=${this._handleInputClick}
            readonly
          ></paper-input>
          <paper-input
            .value=${formatDateTime(this.endDate, this.hass.language)}
            label=${this.hass.localize(
              "ui.components.date-range-picker.end_date"
            )}
            .disabled=${this.disabled}
            @click=${this._handleInputClick}
            readonly
          ></paper-input>
        </div>
        ${this.ranges
          ? html`<div
              slot="ranges"
              class="date-range-ranges"
              .dir=${this._rtlDirection}
            >
              <mwc-list @action=${this._setDateRange} activatable>
                ${Object.keys(this.ranges).map(
                  (name) => html`<mwc-list-item>
                    ${name}
                  </mwc-list-item>`
                )}
              </mwc-list>
            </div>`
          : ""}
        <div slot="footer" class="date-range-footer">
          <mwc-button @click=${this._cancelDateRange}
            >${this.hass.localize("ui.common.cancel")}</mwc-button
          >
          <mwc-button @click=${this._applyDateRange}
            >${this.hass.localize(
              "ui.components.date-range-picker.select"
            )}</mwc-button
          >
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

  private _setDateRange(ev: CustomEvent<ActionDetail>) {
    const dateRange = Object.values(this.ranges!)[ev.detail.index];
    const dateRangePicker = this._dateRangePicker;
    dateRangePicker.clickRange(dateRange);
    dateRangePicker.clickedApply();
  }

  private _cancelDateRange() {
    this._dateRangePicker.clickCancel();
  }

  private _applyDateRange() {
    this._dateRangePicker.clickedApply();
  }

  private get _dateRangePicker() {
    const dateRangePicker = this.shadowRoot!.querySelector(
      "date-range-picker"
    ) as any;
    return dateRangePicker.vueComponent.$children[0];
  }

  private _handleInputClick() {
    // close the date picker, so it will open again on the click event
    if (this._dateRangePicker.open) {
      this._dateRangePicker.open = false;
    }
  }

  static get styles(): CSSResult {
    return css`
      ha-svg-icon {
        margin-right: 8px;
      }

      .date-range-inputs {
        display: flex;
        align-items: center;
      }

      .date-range-ranges {
        border-right: 1px solid var(--divider-color);
      }

      .date-range-footer {
        display: flex;
        justify-content: flex-end;
        padding: 8px;
        border-top: 1px solid var(--divider-color);
      }

      paper-input {
        display: inline-block;
        max-width: 250px;
        min-width: 200px;
      }

      paper-input:last-child {
        margin-left: 8px;
      }

      @media only screen and (max-width: 800px) {
        .date-range-ranges {
          border-right: none;
          border-bottom: 1px solid var(--divider-color);
        }
      }

      @media only screen and (max-width: 500px) {
        paper-input {
          min-width: inherit;
        }

        ha-svg-icon {
          display: none;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-date-range-picker": HaDateRangePicker;
  }
}
