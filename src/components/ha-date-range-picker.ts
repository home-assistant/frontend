import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list";
import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import { mdiCalendar } from "@mdi/js";
import {
  addDays,
  endOfDay,
  endOfWeek,
  startOfDay,
  startOfWeek,
} from "date-fns";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { calcDate } from "../common/datetime/calc_date";
import { firstWeekdayIndex } from "../common/datetime/first_weekday";
import { formatDate } from "../common/datetime/format_date";
import { formatDateTime } from "../common/datetime/format_date_time";
import { useAmPm } from "../common/datetime/use_am_pm";
import { computeRTLDirection } from "../common/util/compute_rtl";
import { HomeAssistant } from "../types";
import "./date-range-picker";
import "./ha-svg-icon";
import "./ha-textfield";
import "./ha-icon-button";

export interface DateRangePickerRanges {
  [key: string]: [Date, Date];
}

@customElement("ha-date-range-picker")
export class HaDateRangePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public startDate!: Date;

  @property() public endDate!: Date;

  @property() public ranges?: DateRangePickerRanges | false;

  @state() private _ranges?: DateRangePickerRanges;

  @property() public autoApply = false;

  @property() public timePicker = true;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) private _hour24format = false;

  @property({ type: String }) private _rtlDirection = "ltr";

  @property({ type: Boolean }) private minimal = false;

  @property() public openingDirection?: "right" | "left" | "center" | "inline";

  @state() private _calcedOpeningDirection?:
    | "right"
    | "left"
    | "center"
    | "inline";

  protected willUpdate(changedProps: PropertyValues) {
    if (
      (!this.hasUpdated && this.ranges === undefined) ||
      (changedProps.has("hass") &&
        this.hass?.localize !== changedProps.get("hass")?.localize)
    ) {
      const today = new Date();
      const weekStartsOn = firstWeekdayIndex(this.hass.locale);
      const weekStart = calcDate(
        today,
        startOfWeek,
        this.hass.locale,
        this.hass.config,
        {
          weekStartsOn,
        }
      );
      const weekEnd = calcDate(
        today,
        endOfWeek,
        this.hass.locale,
        this.hass.config,
        {
          weekStartsOn,
        }
      );

      this._ranges = {
        [this.hass.localize("ui.components.date-range-picker.ranges.today")]: [
          calcDate(today, startOfDay, this.hass.locale, this.hass.config, {
            weekStartsOn,
          }),
          calcDate(today, endOfDay, this.hass.locale, this.hass.config, {
            weekStartsOn,
          }),
        ],
        [this.hass.localize(
          "ui.components.date-range-picker.ranges.yesterday"
        )]: [
          calcDate(
            addDays(today, -1),
            startOfDay,
            this.hass.locale,
            this.hass.config,
            {
              weekStartsOn,
            }
          ),
          calcDate(
            addDays(today, -1),
            endOfDay,
            this.hass.locale,
            this.hass.config,
            {
              weekStartsOn,
            }
          ),
        ],
        [this.hass.localize(
          "ui.components.date-range-picker.ranges.this_week"
        )]: [weekStart, weekEnd],
        [this.hass.localize(
          "ui.components.date-range-picker.ranges.last_week"
        )]: [addDays(weekStart, -7), addDays(weekEnd, -7)],
      };
    }
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass || oldHass.locale !== this.hass.locale) {
        this._hour24format = !useAmPm(this.hass.locale);
        this._rtlDirection = computeRTLDirection(this.hass);
      }
    }
  }

  protected render(): TemplateResult {
    return html`
      <date-range-picker
        ?disabled=${this.disabled}
        ?auto-apply=${this.autoApply}
        time-picker=${this.timePicker}
        twentyfour-hours=${this._hour24format}
        start-date=${this.startDate}
        end-date=${this.endDate}
        ?ranges=${this.ranges !== false}
        opening-direction=${this.openingDirection ||
        this._calcedOpeningDirection}
        first-day=${firstWeekdayIndex(this.hass.locale)}
      >
        <div slot="input" class="date-range-inputs" @click=${this._handleClick}>
          ${!this.minimal
            ? html`<ha-svg-icon .path=${mdiCalendar}></ha-svg-icon>
                <ha-textfield
                  .value=${this.timePicker
                    ? formatDateTime(
                        this.startDate,
                        this.hass.locale,
                        this.hass.config
                      )
                    : formatDate(
                        this.startDate,
                        this.hass.locale,
                        this.hass.config
                      )}
                  .label=${this.hass.localize(
                    "ui.components.date-range-picker.start_date"
                  )}
                  .disabled=${this.disabled}
                  @click=${this._handleInputClick}
                  readonly
                ></ha-textfield>
                <ha-textfield
                  .value=${this.timePicker
                    ? formatDateTime(
                        this.endDate,
                        this.hass.locale,
                        this.hass.config
                      )
                    : formatDate(
                        this.endDate,
                        this.hass.locale,
                        this.hass.config
                      )}
                  .label=${this.hass.localize(
                    "ui.components.date-range-picker.end_date"
                  )}
                  .disabled=${this.disabled}
                  @click=${this._handleInputClick}
                  readonly
                ></ha-textfield>`
            : html`<ha-icon-button
                .label=${this.hass.localize(
                  "ui.components.date-range-picker.select_date_range"
                )}
                .path=${mdiCalendar}
              ></ha-icon-button>`}
        </div>
        ${this.ranges !== false && (this.ranges || this._ranges)
          ? html`<div
              slot="ranges"
              class="date-range-ranges"
              .dir=${this._rtlDirection}
            >
              <mwc-list @action=${this._setDateRange} activatable>
                ${Object.keys(this.ranges || this._ranges!).map(
                  (name) => html`<mwc-list-item>${name}</mwc-list-item>`
                )}
              </mwc-list>
            </div>`
          : nothing}
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

  private _setDateRange(ev: CustomEvent<ActionDetail>) {
    const dateRange = Object.values(this.ranges || this._ranges!)[
      ev.detail.index
    ];
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

  private _handleClick() {
    // calculate opening direction if not set
    if (!this._dateRangePicker.open && !this.openingDirection) {
      const datePickerPosition = this.getBoundingClientRect().x;
      let opens: "right" | "left" | "center" | "inline";
      if (datePickerPosition > (2 * window.innerWidth) / 3) {
        opens = "left";
      } else if (datePickerPosition < window.innerWidth / 3) {
        opens = "right";
      } else {
        opens = "center";
      }
      this._calcedOpeningDirection = opens;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-svg-icon {
        margin-right: 8px;
        margin-inline-end: 8px;
        margin-inline-start: initial;
        direction: var(--direction);
      }

      ha-icon-button {
        direction: var(--direction);
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

      ha-textfield {
        display: inline-block;
        max-width: 250px;
        min-width: 220px;
      }

      ha-textfield:last-child {
        margin-left: 8px;
        margin-inline-start: 8px;
        margin-inline-end: initial;
        direction: var(--direction);
      }

      @media only screen and (max-width: 800px) {
        .date-range-ranges {
          border-right: none;
          border-bottom: 1px solid var(--divider-color);
        }
      }

      @media only screen and (max-width: 500px) {
        ha-textfield {
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
