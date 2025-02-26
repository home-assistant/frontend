import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list";
import type { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import { mdiCalendar } from "@mdi/js";
import {
  addDays,
  subHours,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  isThisYear,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { calcDate, shiftDateRange } from "../common/datetime/calc_date";
import { firstWeekdayIndex } from "../common/datetime/first_weekday";
import {
  formatShortDateTime,
  formatShortDateTimeWithYear,
} from "../common/datetime/format_date_time";
import { useAmPm } from "../common/datetime/use_am_pm";
import { fireEvent } from "../common/dom/fire_event";
import { TimeZone } from "../data/translation";
import type { HomeAssistant } from "../types";
import "./date-range-picker";
import "./ha-icon-button";
import "./ha-icon-button-next";
import "./ha-icon-button-prev";
import "./ha-textarea";

export type DateRangePickerRanges = Record<string, [Date, Date]>;

@customElement("ha-date-range-picker")
export class HaDateRangePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public startDate!: Date;

  @property({ attribute: false }) public endDate!: Date;

  @property({ attribute: false }) public ranges?: DateRangePickerRanges | false;

  @state() private _ranges?: DateRangePickerRanges;

  @property({ attribute: "auto-apply", type: Boolean })
  public autoApply = false;

  @property({ attribute: "time-picker", type: Boolean })
  public timePicker = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public minimal = false;

  @state() private _hour24format = false;

  @property({ attribute: "extended-presets", type: Boolean })
  public extendedPresets = false;

  @property({ attribute: false }) public openingDirection?:
    | "right"
    | "left"
    | "center"
    | "inline";

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
        ...(this.extendedPresets
          ? {
              [this.hass.localize(
                "ui.components.date-range-picker.ranges.this_month"
              )]: [
                calcDate(
                  today,
                  startOfMonth,
                  this.hass.locale,
                  this.hass.config,
                  {
                    weekStartsOn,
                  }
                ),
                calcDate(
                  today,
                  endOfMonth,
                  this.hass.locale,
                  this.hass.config,
                  {
                    weekStartsOn,
                  }
                ),
              ],
              [this.hass.localize(
                "ui.components.date-range-picker.ranges.this_year"
              )]: [
                calcDate(
                  today,
                  startOfYear,
                  this.hass.locale,
                  this.hass.config,
                  {
                    weekStartsOn,
                  }
                ),
                calcDate(today, endOfYear, this.hass.locale, this.hass.config, {
                  weekStartsOn,
                }),
              ],
              [this.hass.localize(
                "ui.components.date-range-picker.ranges.now-1h"
              )]: [
                calcDate(
                  today,
                  subHours,
                  this.hass.locale,
                  this.hass.config,
                  1
                ),
                calcDate(
                  today,
                  subHours,
                  this.hass.locale,
                  this.hass.config,
                  0
                ),
              ],
              [this.hass.localize(
                "ui.components.date-range-picker.ranges.now-12h"
              )]: [
                calcDate(
                  today,
                  subHours,
                  this.hass.locale,
                  this.hass.config,
                  12
                ),
                calcDate(
                  today,
                  subHours,
                  this.hass.locale,
                  this.hass.config,
                  0
                ),
              ],
              [this.hass.localize(
                "ui.components.date-range-picker.ranges.now-24h"
              )]: [
                calcDate(
                  today,
                  subHours,
                  this.hass.locale,
                  this.hass.config,
                  24
                ),
                calcDate(
                  today,
                  subHours,
                  this.hass.locale,
                  this.hass.config,
                  0
                ),
              ],
              [this.hass.localize(
                "ui.components.date-range-picker.ranges.now-7d"
              )]: [
                calcDate(
                  today,
                  subHours,
                  this.hass.locale,
                  this.hass.config,
                  24 * 7
                ),
                calcDate(
                  today,
                  subHours,
                  this.hass.locale,
                  this.hass.config,
                  0
                ),
              ],
              [this.hass.localize(
                "ui.components.date-range-picker.ranges.now-30d"
              )]: [
                calcDate(
                  today,
                  subHours,
                  this.hass.locale,
                  this.hass.config,
                  24 * 30
                ),
                calcDate(
                  today,
                  subHours,
                  this.hass.locale,
                  this.hass.config,
                  0
                ),
              ],
            }
          : {}),
      };
    }
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass || oldHass.locale !== this.hass.locale) {
        this._hour24format = !useAmPm(this.hass.locale);
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
        start-date=${this._formatDate(this.startDate)}
        end-date=${this._formatDate(this.endDate)}
        ?ranges=${this.ranges !== false}
        opening-direction=${ifDefined(
          this.openingDirection || this._calcedOpeningDirection
        )}
        first-day=${firstWeekdayIndex(this.hass.locale)}
        language=${this.hass.locale.language}
        @change=${this._handleChange}
      >
        <div slot="input" class="date-range-inputs" @click=${this._handleClick}>
          ${!this.minimal
            ? html`<ha-textarea
                  mobile-multiline
                  .value=${(isThisYear(this.startDate)
                    ? formatShortDateTime(
                        this.startDate,
                        this.hass.locale,
                        this.hass.config
                      )
                    : formatShortDateTimeWithYear(
                        this.startDate,
                        this.hass.locale,
                        this.hass.config
                      )) +
                  (window.innerWidth >= 459 ? " - " : " - \n") +
                  (isThisYear(this.endDate)
                    ? formatShortDateTime(
                        this.endDate,
                        this.hass.locale,
                        this.hass.config
                      )
                    : formatShortDateTimeWithYear(
                        this.endDate,
                        this.hass.locale,
                        this.hass.config
                      ))}
                  .label=${this.hass.localize(
                    "ui.components.date-range-picker.start_date"
                  ) +
                  " - " +
                  this.hass.localize(
                    "ui.components.date-range-picker.end_date"
                  )}
                  .disabled=${this.disabled}
                  @click=${this._handleInputClick}
                  readonly
                ></ha-textarea>
                <ha-icon-button-prev
                  .label=${this.hass.localize("ui.common.previous")}
                  @click=${this._handlePrev}
                >
                </ha-icon-button-prev>
                <ha-icon-button-next
                  .label=${this.hass.localize("ui.common.next")}
                  @click=${this._handleNext}
                >
                </ha-icon-button-next>`
            : html`<ha-icon-button
                .label=${this.hass.localize(
                  "ui.components.date-range-picker.select_date_range"
                )}
                .path=${mdiCalendar}
              ></ha-icon-button>`}
        </div>
        ${this.ranges !== false && (this.ranges || this._ranges)
          ? html`<div slot="ranges" class="date-range-ranges">
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

  private _handleNext(ev: MouseEvent): void {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    this._shift(true);
  }

  private _handlePrev(ev: MouseEvent): void {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    this._shift(false);
  }

  private _shift(forward: boolean) {
    if (!this.startDate) return;
    const { start, end } = shiftDateRange(
      this.startDate,
      this.endDate,
      forward,
      this.hass.locale,
      this.hass.config
    );
    this.startDate = start;
    this.endDate = end;
    const dateRange = [start, end];
    const dateRangePicker = this._dateRangePicker;
    dateRangePicker.clickRange(dateRange);
    dateRangePicker.clickedApply();
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
    if (this.hass.locale.time_zone === TimeZone.server) {
      const dateRangePicker = this._dateRangePicker;

      const startDate = fromZonedTime(
        dateRangePicker.start,
        this.hass.config.time_zone
      );
      const endDate = fromZonedTime(
        dateRangePicker.end,
        this.hass.config.time_zone
      );

      dateRangePicker.clickRange([startDate, endDate]);
    }

    this._dateRangePicker.clickedApply();
  }

  private _formatDate(date: Date): string {
    if (this.hass.locale.time_zone === TimeZone.server) {
      return toZonedTime(date, this.hass.config.time_zone).toISOString();
    }
    return date.toISOString();
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

  private _handleChange(ev: CustomEvent) {
    ev.stopPropagation();
    const startDate = ev.detail.startDate;
    const endDate = ev.detail.endDate;

    fireEvent(this, "value-changed", {
      value: { startDate, endDate },
    });
  }

  static styles = css`
    ha-icon-button {
      direction: var(--direction);
    }

    .date-range-inputs {
      display: flex;
      align-items: center;
      gap: 8px;
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

    ha-textarea {
      display: inline-block;
      width: 340px;
    }
    @media only screen and (max-width: 460px) {
      ha-textarea {
        width: 100%;
      }
    }
    @media only screen and (max-width: 800px) {
      .date-range-ranges {
        border-right: none;
        border-bottom: 1px solid var(--divider-color);
      }
    }

    @media only screen and (max-height: 940px) and (max-width: 800px) {
      .date-range-ranges {
        overflow: auto;
        max-height: calc(70vh - 330px);
        min-height: 160px;
      }

      :host([header-position]) .date-range-ranges {
        max-height: calc(90vh - 430px);
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-date-range-picker": HaDateRangePicker;
  }
}
