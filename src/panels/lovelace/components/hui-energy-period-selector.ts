import "@material/mwc-button/mwc-button";
import {
  addDays,
  addMonths,
  differenceInDays,
  endOfDay,
  endOfMonth,
  endOfToday,
  endOfWeek,
  endOfQuarter,
  endOfYear,
  isFirstDayOfMonth,
  isLastDayOfMonth,
  differenceInMonths,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfQuarter,
  startOfYear,
} from "date-fns/esm";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { calcDate } from "../../../common/datetime/calc_date";
import { firstWeekdayIndex } from "../../../common/datetime/first_weekday";
import {
  formatDate,
  formatDateMonthYear,
  formatDateShort,
  formatDateYear,
} from "../../../common/datetime/format_date";
import { toggleAttribute } from "../../../common/dom/toggle_attribute";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-next";
import "../../../components/ha-icon-button-prev";
import { EnergyData, getEnergyDataCollection } from "../../../data/energy";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../types";
import "../../../components/ha-date-range-picker";
import type { DateRangePickerRanges } from "../../../components/ha-date-range-picker";

@customElement("hui-energy-period-selector")
export class HuiEnergyPeriodSelector extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public collectionKey?: string;

  @property({ type: Boolean, reflect: true }) public narrow?;

  @state() _startDate?: Date;

  @state() _endDate?: Date;

  @state() private _ranges?: DateRangePickerRanges;

  @state() private _compare = false;

  public connectedCallback() {
    super.connectedCallback();
    if (this.narrow !== false) {
      toggleAttribute(this, "narrow", this.offsetWidth < 600);
    }
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this.collectionKey,
      }).subscribe((data) => this._updateDates(data)),
    ];
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    const today = new Date();
    const weekStartsOn = firstWeekdayIndex(this.hass.locale);

    // pre defined date ranges
    this._ranges = {
      [this.hass.localize("ui.components.date-range-picker.ranges.today")]: [
        calcDate(today, startOfDay, this.hass.locale, this.hass.config, {
          weekStartsOn,
        }),
        calcDate(today, endOfDay, this.hass.locale, this.hass.config, {
          weekStartsOn,
        }),
      ],
      [this.hass.localize("ui.components.date-range-picker.ranges.yesterday")]:
        [
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
      [this.hass.localize("ui.components.date-range-picker.ranges.this_week")]:
        [
          calcDate(today, startOfWeek, this.hass.locale, this.hass.config, {
            weekStartsOn,
          }),
          calcDate(today, endOfWeek, this.hass.locale, this.hass.config, {
            weekStartsOn,
          }),
        ],
      [this.hass.localize("ui.components.date-range-picker.ranges.this_month")]:
        [
          calcDate(today, startOfMonth, this.hass.locale, this.hass.config),
          calcDate(today, endOfMonth, this.hass.locale, this.hass.config),
        ],
      [this.hass.localize(
        "ui.components.date-range-picker.ranges.this_quarter"
      )]: [
        calcDate(today, startOfQuarter, this.hass.locale, this.hass.config),
        calcDate(today, endOfQuarter, this.hass.locale, this.hass.config),
      ],
      [this.hass.localize("ui.components.date-range-picker.ranges.this_year")]:
        [
          calcDate(today, startOfYear, this.hass.locale, this.hass.config),
          calcDate(today, endOfYear, this.hass.locale, this.hass.config),
        ],
    };
  }

  protected render() {
    if (!this.hass || !this._startDate) {
      return nothing;
    }

    return html`
      <div class="row">
        <div class="label">
          ${this._simpleRange() === "day"
            ? formatDate(this._startDate, this.hass.locale, this.hass.config)
            : this._simpleRange() === "month"
            ? formatDateMonthYear(
                this._startDate,
                this.hass.locale,
                this.hass.config
              )
            : this._simpleRange() === "year"
            ? formatDateYear(
                this._startDate,
                this.hass.locale,
                this.hass.config
              )
            : `${formatDateShort(
                this._startDate,
                this.hass.locale,
                this.hass.config
              )} – ${formatDateShort(
                this._endDate || new Date(),
                this.hass.locale,
                this.hass.config
              )}`}
          <div class="time-handle">
            <ha-icon-button-prev
              .label=${this.hass.localize(
                "ui.panel.lovelace.components.energy_period_selector.previous"
              )}
              @click=${this._pickPrevious}
            ></ha-icon-button-prev>
            <ha-date-range-picker
              .hass=${this.hass}
              .startDate=${this._startDate}
              .endDate=${this._endDate || new Date()}
              .ranges=${this._ranges}
              @change=${this._dateRangeChanged}
              .timePicker=${false}
              minimal
            ></ha-date-range-picker>
            <ha-icon-button-next
              .label=${this.hass.localize(
                "ui.panel.lovelace.components.energy_period_selector.next"
              )}
              @click=${this._pickNext}
            ></ha-icon-button-next>
          </div>
        </div>

        <div class="buttons">
          <mwc-button
            class="compare ${this._compare ? "active" : nothing}"
            @click=${this._toggleCompare}
            dense
            outlined
          >
            ${this.hass.localize(
              "ui.panel.lovelace.components.energy_period_selector.compare"
            )}
          </mwc-button>
        </div>
      </div>
    `;
  }

  private _simpleRange(): string {
    if (differenceInDays(this._endDate!, this._startDate!) === 0) {
      return "day";
    }
    if (
      isFirstDayOfMonth(this._startDate!) &&
      isLastDayOfMonth(this._endDate!) &&
      differenceInMonths(this._endDate!, this._startDate!) === 0
    ) {
      return "month";
    }
    if (
      isFirstDayOfMonth(this._startDate!) &&
      isLastDayOfMonth(this._endDate!) &&
      differenceInMonths(this._endDate!, this._startDate!) === 11
    ) {
      return "year";
    }
    return "other";
  }

  private _updateCollectionPeriod() {
    const energyCollection = getEnergyDataCollection(this.hass, {
      key: this.collectionKey,
    });
    energyCollection.setPeriod(this._startDate!, this._endDate!);
    energyCollection.refresh();
  }

  private _dateRangeChanged(ev) {
    const weekStartsOn = firstWeekdayIndex(this.hass.locale);
    this._startDate = calcDate(
      ev.detail.startDate,
      startOfDay,
      this.hass.locale,
      this.hass.config,
      {
        weekStartsOn,
      }
    );
    this._endDate = calcDate(
      ev.detail.endDate,
      endOfDay,
      this.hass.locale,
      this.hass.config,
      {
        weekStartsOn,
      }
    );

    this._updateCollectionPeriod();
  }

  private _pickPrevious() {
    this._shift(false);
  }

  private _pickNext() {
    this._shift(true);
  }

  private _shift(forward: boolean) {
    if (!this._startDate) return;

    let start: Date;
    let end: Date;
    if (
      isFirstDayOfMonth(this._startDate) &&
      isLastDayOfMonth(this._endDate!)
    ) {
      // Shift date range with respect to month/year selection
      const difference =
        (differenceInMonths(this._endDate!, this._startDate) + 1) *
        (forward ? 1 : -1);
      start = addMonths(this._startDate, difference);
      end = endOfMonth(addMonths(this._endDate!, difference));
    } else {
      // Shift date range by period length
      const difference =
        (differenceInDays(this._endDate!, this._startDate) + 1) *
        (forward ? 1 : -1);
      start = addDays(this._startDate, difference);
      end = addDays(this._endDate!, difference);
    }

    this._startDate = start;
    this._endDate = end;

    this._updateCollectionPeriod();
  }

  private _updateDates(energyData: EnergyData): void {
    this._compare = energyData.startCompare !== undefined;
    this._startDate = energyData.start;
    this._endDate = energyData.end || endOfToday();
  }

  private _toggleCompare() {
    this._compare = !this._compare;
    const energyCollection = getEnergyDataCollection(this.hass, {
      key: this.collectionKey,
    });
    energyCollection.setCompare(this._compare);
    energyCollection.refresh();
  }

  static get styles(): CSSResultGroup {
    return css`
      .row {
        display: flex;
        justify-content: flex-end;
      }
      :host([narrow]) .row {
        flex-direction: column;
        justify-self: left;
      }
      .time-handle {
        display: flex;
        justify-content: flex-end;
        align-items: center;
      }
      .label {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        font-size: 20px;
      }
      .buttons {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        align-items: center;
      }
      .compare {
        position: relative;
      }
      mwc-button {
        margin-left: 8px;
        flex-shrink: 0;
        --mdc-button-outline-color: currentColor;
        --primary-color: currentColor;
        --mdc-theme-primary: currentColor;
        --mdc-theme-on-primary: currentColor;
        --mdc-button-disabled-outline-color: var(--disabled-text-color);
        --mdc-button-disabled-ink-color: var(--disabled-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-period-selector": HuiEnergyPeriodSelector;
  }
}
