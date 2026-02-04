import {
  mdiChevronLeft,
  mdiChevronRight,
  mdiDotsVertical,
  mdiCheckboxBlankOutline,
  mdiCheckboxOutline,
  mdiHomeClock,
} from "@mdi/js";
import {
  differenceInCalendarYears,
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
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { mainWindow } from "../../../common/dom/get_main_window";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import {
  calcDate,
  calcDateDifferenceProperty,
  calcDateProperty,
  shiftDateRange,
} from "../../../common/datetime/calc_date";
import type { DateRange } from "../../../common/datetime/calc_date_range";
import { calcDateRange } from "../../../common/datetime/calc_date_range";
import { firstWeekdayIndex } from "../../../common/datetime/first_weekday";
import {
  formatDateMonth,
  formatDateVeryShort,
  formatDateYear,
} from "../../../common/datetime/format_date";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-button";
import "../../../components/ha-date-range-picker";
import type {
  DateRangePickerRanges,
  HaDateRangePicker,
} from "../../../components/ha-date-range-picker";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-dialog-header";
import "../../../components/ha-icon-button-next";
import "../../../components/ha-icon-button-prev";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import type { EnergyData } from "../../../data/energy";
import { CompareMode, getEnergyDataCollection } from "../../../data/energy";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";

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

interface OverflowMenuItem {
  path: string;
  label: string;
  tooltip?: string;
  disabled?: boolean;
  alwaysCollapse?: boolean;
  hidden?: boolean;
  action: () => void;
}

@customElement("hui-energy-period-selector")
export class HuiEnergyPeriodSelector extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "collection-key" }) public collectionKey?: string;

  @property({ type: Boolean, reflect: true }) public narrow?: boolean;

  @property({ type: Boolean, reflect: true }) public fixed?: boolean;

  @property({ type: Boolean, attribute: "allow-compare" }) public allowCompare =
    true;

  @property({ attribute: "vertical-opening-direction" })
  public verticalOpeningDirection?: "up" | "down";

  @state() _datepickerOpen = false;

  @state() _startDate?: Date;

  @state() _endDate?: Date;

  @state() private _ranges: DateRangePickerRanges = {};

  @state() private _compare = false;

  @state() private _collapseButtons = false;

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
    this._collapseButtons = this.offsetWidth < 300;
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

    const today = new Date();
    const showStartYear =
      calcDateDifferenceProperty(
        today,
        this._startDate,
        differenceInCalendarYears,
        this.hass.locale,
        this.hass.config
      ) !== 0;
    const showBothYear =
      this._endDate &&
      calcDateDifferenceProperty(
        this._endDate,
        this._startDate,
        differenceInCalendarYears,
        this.hass.locale,
        this.hass.config
      ) !== 0;
    const showSubtitleYear =
      simpleRange !== "year" && (showStartYear || showBothYear);

    const buttons = [
      {
        path:
          mainWindow.document.dir === "rtl" ? mdiChevronRight : mdiChevronLeft,
        label: this.hass.localize(
          "ui.panel.lovelace.components.energy_period_selector.previous"
        ),
        action: () => this._pickPrevious(),
      },
      {
        path:
          mainWindow.document.dir === "rtl" ? mdiChevronLeft : mdiChevronRight,
        label: this.hass.localize(
          "ui.panel.lovelace.components.energy_period_selector.next"
        ),
        action: () => this._pickNext(),
      },
      {
        path: mdiHomeClock,
        label: this.hass.localize(
          "ui.panel.lovelace.components.energy_period_selector.now"
        ),
        alwaysCollapse: true,
        hidden: !this.narrow,
        action: () => this._pickNow(),
      },
      {
        path: this._compare ? mdiCheckboxOutline : mdiCheckboxBlankOutline,
        disabled: !this.allowCompare,
        alwaysCollapse: true,
        label: this.hass.localize(
          "ui.panel.lovelace.components.energy_period_selector.compare"
        ),
        action: () => this._toggleCompare(),
      },
    ] as OverflowMenuItem[];

    return html`
      <div
        class=${classMap({
          row: true,
          "datepicker-open": this._datepickerOpen,
        })}
      >
        <div class="backdrop"></div>
        <ha-dialog-header
          subtitle-position="below"
          class="label"
          clickable-header
          @header-click=${this._openDatePicker}
        >
          <slot name="headerNavigationIcon" slot="navigationIcon">
            <ha-date-range-picker
              .hass=${this.hass}
              .startDate=${this._startDate}
              .endDate=${this._endDate || new Date()}
              .ranges=${this._ranges}
              @value-changed=${this._dateRangeChanged}
              @preset-selected=${this._presetSelected}
              @toggle=${this._handleDatepickerToggle}
              minimal
              header-position
              .verticalOpeningDirection=${this.verticalOpeningDirection}
            ></ha-date-range-picker>
          </slot>
          <slot name="headerSubtitle" slot="title"
            ><span
              >${simpleRange === "year"
                ? html`${formatDateYear(
                    this._startDate,
                    this.hass.locale,
                    this.hass.config
                  )}`
                : html`${simpleRange === "month"
                    ? html`${formatDateMonth(
                        this._startDate,
                        this.hass.locale,
                        this.hass.config
                      )}`
                    : simpleRange === "day"
                      ? html`${formatDateVeryShort(
                          this._startDate,
                          this.hass.locale,
                          this.hass.config
                        )}`
                      : html`${formatDateVeryShort(
                          this._startDate,
                          this.hass.locale,
                          this.hass.config
                        )}&ndash;${formatDateVeryShort(
                          this._endDate || new Date(),
                          this.hass.locale,
                          this.hass.config
                        )} `} `}</span
            ></slot
          >
          <slot name="headerSubtitle" slot="subtitle"
            >${showSubtitleYear
              ? html`<span
                  >${formatDateYear(
                    this._startDate,
                    this.hass.locale,
                    this.hass.config
                  )}${showBothYear
                    ? html`&ndash;${formatDateYear(
                        this._endDate || new Date(),
                        this.hass.locale,
                        this.hass.config
                      )}`
                    : ``}</span
                >`
              : nothing}</slot
          >
          <slot name="headerActionItems" slot="actionItems">
            <div class="overflow">
              ${!this.narrow
                ? html`<ha-button
                    appearance="filled"
                    size="small"
                    @click=${this._pickNow}
                  >
                    ${this.hass.localize(
                      "ui.panel.lovelace.components.energy_period_selector.now"
                    )}
                  </ha-button>`
                : nothing}
              ${buttons.map((item, index) =>
                this._collapseButtons || item.alwaysCollapse
                  ? nothing
                  : html`<ha-tooltip
                        .disabled=${!item.tooltip}
                        .for="icon-button-${index}"
                        >${item.tooltip ?? ""}</ha-tooltip
                      ><ha-icon-button
                        .id="icon-button-${index}"
                        @click=${item.action}
                        .label=${item.label}
                        .path=${item.path}
                        ?disabled=${item.disabled}
                      ></ha-icon-button>`
              )}
              ${this._collapseButtons || buttons.some((x) => x.alwaysCollapse)
                ? html`<ha-dropdown
                    @wa-show=${this._handleIconOverflowMenuOpened}
                    @click=${stopPropagation}
                  >
                    <ha-icon-button
                      .label=${this.hass.localize("ui.common.overflow_menu")}
                      .path=${mdiDotsVertical}
                      slot="trigger"
                    ></ha-icon-button>
                    ${buttons.map((item) =>
                      (this._collapseButtons || item.alwaysCollapse) &&
                      !item.hidden
                        ? html`<ha-dropdown-item
                            ?disabled=${item.disabled}
                            @click=${item.action}
                          >
                            <ha-svg-icon
                              slot="icon"
                              .path=${item.path}
                            ></ha-svg-icon>
                            ${item.label}
                          </ha-dropdown-item>`
                        : nothing
                    )}
                  </ha-dropdown>`
                : nothing}
            </div>
          </slot>
        </ha-dialog-header>
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
          differenceInCalendarYears,
          locale,
          config
        ) === 0 &&
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

  private get _datePicker(): HaDateRangePicker | undefined {
    return this.shadowRoot!.querySelector("ha-date-range-picker") ?? undefined;
  }

  protected _handleIconOverflowMenuOpened(ev: Event) {
    ev.stopPropagation();
  }

  private _openDatePicker(ev: Event) {
    const datePicker = this._datePicker;
    if (datePicker) datePicker.open();
    ev.stopPropagation();
  }

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

  private _handleDatepickerToggle(ev: CustomEvent<{ open: boolean }>) {
    this._datepickerOpen = ev.detail.open;
  }

  private _toggleCompare() {
    this._compare = !this._compare;
    const energyCollection = getEnergyDataCollection(this.hass, {
      key: this.collectionKey,
    });
    energyCollection.setCompare(
      this._compare ? CompareMode.PREVIOUS : CompareMode.NONE
    );
    energyCollection.refresh();
  }

  static styles = css`
    :host {
      display: block;
    }
    .row {
      justify-content: space-between;
      container-type: inline-size;
    }
    :host .overflow {
      display: flex;
      align-items: center;
    }
    .label {
      --ha-dialog-header-title-font-size: var(--ha-font-size-xl);
      --ha-dialog-header-subtitle-font-size: var(--ha-font-size-m);
    }
    @container (max-width: 360px) {
      :host([narrow]) .label {
        --ha-dialog-header-title-font-size: var(--ha-font-size-m);
        --ha-dialog-header-subtitle-font-size: var(--ha-font-size-s);
      }
    }
    @container (max-width: 320px) {
      :host([narrow]) .label {
        --ha-dialog-header-title-font-size: var(--ha-font-size-s);
        --ha-dialog-header-subtitle-font-size: var(--ha-font-size-s);
      }
    }
    ha-button {
      margin-left: 8px;
      margin-inline-start: 8px;
      margin-inline-end: initial;
      flex-shrink: 0;
      --ha-button-theme-color: currentColor;
    }
    .backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: var(--dialog-z-index, 8);
      -webkit-backdrop-filter: var(
        --ha-dialog-scrim-backdrop-filter,
        var(--dialog-backdrop-filter)
      );
      backdrop-filter: var(
        --ha-dialog-scrim-backdrop-filter,
        var(--dialog-backdrop-filter)
      );
      pointer-events: none;
      opacity: 0;
      transition: opacity var(--ha-animation-duration-slow) ease-in-out;
    }
    .datepicker-open .backdrop {
      opacity: 1;
      pointer-events: auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-period-selector": HuiEnergyPeriodSelector;
  }
}
