import type { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical } from "@mdi/js";
import {
  differenceInDays,
  differenceInMonths,
  endOfDay,
  endOfToday,
  endOfWeek,
  isFirstDayOfMonth,
  isLastDayOfMonth,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  calcDate,
  calcDateProperty,
  calcDateDifferenceProperty,
  shiftDateRange,
} from "../../../common/datetime/calc_date";
import { firstWeekdayIndex } from "../../../common/datetime/first_weekday";
import {
  formatDate,
  formatDateMonthYear,
  formatDateShort,
  formatDateVeryShort,
  formatDateYear,
} from "../../../common/datetime/format_date";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-button-menu";
import "../../../components/ha-button";
import "../../../components/ha-check-list-item";
import "../../../components/ha-date-range-picker";
import type { DateRangePickerRanges } from "../../../components/ha-date-range-picker";
import "../../../components/ha-icon-button-next";
import "../../../components/ha-icon-button-prev";
import type { EnergyData } from "../../../data/energy";
import { getEnergyDataCollection } from "../../../data/energy";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";
import { calcDateRange } from "../../../common/datetime/calc_date_range";
import type { DateRange } from "../../../common/datetime/calc_date_range";

const RANGE_KEYS: DateRange[] = [
  "today",
  "yesterday",
  "this_week",
  "this_month",
  "this_quarter",
  "this_year",
  "now-7d",
  "now-30d",
  "now-12m",
];

@customElement("hui-energy-period-selector")
export class HuiEnergyPeriodSelector extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "collection-key" }) public collectionKey?: string;

  @property({ type: Boolean, reflect: true }) public narrow?;

  @state() _startDate?: Date;

  @state() _endDate?: Date;

  @state() private _ranges: DateRangePickerRanges = {};

  @state() private _compare = false;

  private _resizeObserver?: ResizeObserver;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this.collectionKey,
      }).subscribe((data) => this._updateDates(data)),
    ];
  }

  private _measure() {
    this.narrow = this.offsetWidth < 450;
  }

  private async _attachObserver(): Promise<void> {
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(
        debounce(() => this._measure(), 250, false)
      );
    }
    this._resizeObserver.observe(this);
  }

  protected firstUpdated(): void {
    this._attachObserver();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.updateComplete.then(() => this._attachObserver());
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      this._measure();
    }

    if (
      !this.hasUpdated ||
      (changedProps.has("hass") &&
        this.hass?.localize !== changedProps.get("hass")?.localize)
    ) {
      // pre defined date ranges
      this._ranges = {};
      RANGE_KEYS.forEach((key) => {
        this._ranges[
          this.hass.localize(`ui.components.date-range-picker.ranges.${key}`)
        ] = calcDateRange(this.hass, key);
      });
    }
  }

  protected render() {
    if (!this.hass || !this._startDate) {
      return nothing;
    }

    const simpleRange = this._simpleRange(
      this._startDate,
      this._endDate,
      this.hass.locale,
      this.hass.config
    );

    return html`
      <div class="row">
        <div class="label">
          ${simpleRange === "day"
            ? this.narrow
              ? formatDateShort(
                  this._startDate,
                  this.hass.locale,
                  this.hass.config
                )
              : formatDate(this._startDate, this.hass.locale, this.hass.config)
            : simpleRange === "month"
              ? formatDateMonthYear(
                  this._startDate,
                  this.hass.locale,
                  this.hass.config
                )
              : simpleRange === "year"
                ? formatDateYear(
                    this._startDate,
                    this.hass.locale,
                    this.hass.config
                  )
                : `${formatDateVeryShort(
                    this._startDate,
                    this.hass.locale,
                    this.hass.config
                  )} – ${formatDateVeryShort(
                    this._endDate || new Date(),
                    this.hass.locale,
                    this.hass.config
                  )}`}
        </div>
        <div class="time-handle">
          <ha-icon-button-prev
            .label=${this.hass.localize(
              "ui.panel.lovelace.components.energy_period_selector.previous"
            )}
            @click=${this._pickPrevious}
          ></ha-icon-button-prev>
          <ha-icon-button-next
            .label=${this.hass.localize(
              "ui.panel.lovelace.components.energy_period_selector.next"
            )}
            @click=${this._pickNext}
          ></ha-icon-button-next>
          <ha-date-range-picker
            .hass=${this.hass}
            .startDate=${this._startDate}
            .endDate=${this._endDate || new Date()}
            .ranges=${this._ranges}
            @value-changed=${this._dateRangeChanged}
            @preset-selected=${this._presetSelected}
            minimal
            header-position
          ></ha-date-range-picker>
        </div>

        ${!this.narrow
          ? html`<ha-button
              appearance="filled"
              size="small"
              click=${this._pickNow}
            >
              ${this.hass.localize(
                "ui.panel.lovelace.components.energy_period_selector.now"
              )}
            </ha-button>`
          : nothing}

        <ha-button-menu>
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <ha-check-list-item
            left
            @request-selected=${this._toggleCompare}
            .selected=${this._compare}
          >
            ${this.hass.localize(
              "ui.panel.lovelace.components.energy_period_selector.compare"
            )}
          </ha-check-list-item>
          <slot name="overflow-menu"></slot>
        </ha-button-menu>
      </div>
    `;
  }

  private _simpleRange = memoizeOne(
    (startDate, endDate, locale, config): string => {
      if (differenceInDays(endDate!, startDate!) === 0) {
        return "day";
      }
      if (
        (calcDateProperty(
          startDate,
          isFirstDayOfMonth,
          locale,
          config
        ) as boolean) &&
        (calcDateProperty(endDate, isLastDayOfMonth, locale, config) as boolean)
      ) {
        if (
          (calcDateDifferenceProperty(
            endDate,
            startDate,
            differenceInMonths,
            locale,
            config
          ) as number) === 0
        ) {
          return "month";
        }
        if (
          (calcDateDifferenceProperty(
            endDate,
            startDate,
            differenceInMonths,
            locale,
            config
          ) as number) === 2 &&
          startDate.getMonth() % 3 === 0
        ) {
          return "quarter";
        }
      }
      if (
        calcDateProperty(startDate, isFirstDayOfMonth, locale, config) &&
        calcDateProperty(endDate, isLastDayOfMonth, locale, config) &&
        calcDateDifferenceProperty(
          endDate,
          startDate,
          differenceInMonths,
          locale,
          config
        ) === 11
      ) {
        return "year";
      }
      return "other";
    }
  );

  private _updateCollectionPeriod() {
    const energyCollection = getEnergyDataCollection(this.hass, {
      key: this.collectionKey,
    });
    energyCollection.setPeriod(this._startDate!, this._endDate!);
    energyCollection.refresh();
  }

  private _dateRangeChanged(ev) {
    this._startDate = calcDate(
      ev.detail.value.startDate,
      startOfDay,
      this.hass.locale,
      this.hass.config
    );
    this._endDate = calcDate(
      ev.detail.value.endDate,
      endOfDay,
      this.hass.locale,
      this.hass.config
    );

    this._updateCollectionPeriod();
  }

  private _presetSelected(ev) {
    localStorage.setItem(
      `energy-default-period-_${this.collectionKey || "energy"}`,
      RANGE_KEYS[ev.detail.index]
    );
  }

  private _pickNow() {
    if (!this._startDate) return;

    const range = this._simpleRange(
      this._startDate,
      this._endDate,
      this.hass.locale,
      this.hass.config
    );
    const today = new Date();
    if (range === "month") {
      [this._startDate, this._endDate] = calcDateRange(this.hass, "this_month");
    } else if (range === "quarter") {
      [this._startDate, this._endDate] = calcDateRange(
        this.hass,
        "this_quarter"
      );
    } else if (range === "year") {
      [this._startDate, this._endDate] = calcDateRange(this.hass, "this_year");
    } else {
      const weekStartsOn = firstWeekdayIndex(this.hass.locale);
      const weekStart = calcDate(
        this._endDate!,
        startOfWeek,
        this.hass.locale,
        this.hass.config,
        {
          weekStartsOn,
        }
      );
      const weekEnd = calcDate(
        this._endDate!,
        endOfWeek,
        this.hass.locale,
        this.hass.config,
        {
          weekStartsOn,
        }
      );

      // Check if a single week is selected
      if (
        this._startDate.getTime() === weekStart.getTime() &&
        this._endDate!.getTime() === weekEnd.getTime()
      ) {
        // Pick current week
        [this._startDate, this._endDate] = calcDateRange(
          this.hass,
          "this_week"
        );
      } else {
        // Custom date range
        const difference = calcDateDifferenceProperty(
          this._endDate!,
          this._startDate,
          differenceInDays,
          this.hass.locale,
          this.hass.config
        ) as number;
        this._startDate = calcDate(
          calcDate(
            today,
            subDays,
            this.hass.locale,
            this.hass.config,
            difference
          ),
          startOfDay,
          this.hass.locale,
          this.hass.config,
          {
            weekStartsOn,
          }
        );
        this._endDate = calcDate(
          today,
          endOfDay,
          this.hass.locale,
          this.hass.config,
          {
            weekStartsOn,
          }
        );
      }
    }

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
    const { start, end } = shiftDateRange(
      this._startDate,
      this._endDate!,
      forward,
      this.hass.locale,
      this.hass.config
    );
    this._startDate = start;
    this._endDate = end;
    this._updateCollectionPeriod();
  }

  private _updateDates(energyData: EnergyData): void {
    this._compare = energyData.startCompare !== undefined;
    this._startDate = energyData.start;
    this._endDate = energyData.end || endOfToday();
  }

  private _toggleCompare(ev: CustomEvent<RequestSelectedDetail>) {
    if (ev.detail.source !== "interaction") {
      return;
    }
    this._compare = ev.detail.selected;
    const energyCollection = getEnergyDataCollection(this.hass, {
      key: this.collectionKey,
    });
    energyCollection.setCompare(this._compare);
    energyCollection.refresh();
  }

  static styles = css`
    .row {
      display: flex;
      align-items: center;
    }
    :host .time-handle {
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }
    :host([narrow]) .time-handle {
      margin-left: auto;
      margin-inline-start: auto;
      margin-inline-end: initial;
    }
    .label {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      font-size: var(--ha-font-size-xl);
      margin-left: auto;
      margin-inline-start: auto;
      margin-inline-end: initial;
    }
    :host([narrow]) .label {
      margin-left: unset;
      margin-inline-start: unset;
      margin-inline-end: initial;
    }
    ha-button {
      margin-left: 8px;
      margin-inline-start: 8px;
      margin-inline-end: initial;
      flex-shrink: 0;
      --ha-button-theme-color: currentColor;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-period-selector": HuiEnergyPeriodSelector;
  }
}
