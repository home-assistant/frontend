import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import {
  endOfToday,
  addDays,
  endOfDay,
  startOfToday,
  endOfWeek,
  endOfMonth,
  startOfDay,
  startOfWeek,
  startOfMonth,
  addMonths,
  addWeeks,
  startOfYear,
  addYears,
  endOfYear,
  isWithinInterval,
  differenceInDays,
} from "date-fns";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  formatDate,
  formatDateMonthYear,
  formatDateShort,
  formatDateYear,
} from "../../../common/datetime/format_date";
import { EnergyData, getEnergyDataCollection } from "../../../data/energy";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant, ToggleButton } from "../../../types";
import "@material/mwc-icon-button/mwc-icon-button";
import "../../../components/ha-svg-icon";
import "@material/mwc-button/mwc-button";
import "../../../components/ha-button-toggle-group";
import { toggleAttribute } from "../../../common/dom/toggle_attribute";

const viewButtons: ToggleButton[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

@customElement("hui-energy-period-selector")
export class HuiEnergyPeriodSelector extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public collectionKey?: string;

  @state() _startDate?: Date;

  @state() _endDate?: Date;

  @state() private _period?: "day" | "week" | "month" | "year";

  public connectedCallback() {
    super.connectedCallback();
    toggleAttribute(this, "narrow", this.offsetWidth < 600);
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this.collectionKey,
      }).subscribe((data) => this._updateDates(data)),
    ];
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._startDate) {
      return html``;
    }

    return html`
      <div class="row">
        <div class="label">
          ${this._period === "day"
            ? formatDate(this._startDate, this.hass.locale)
            : this._period === "month"
            ? formatDateMonthYear(this._startDate, this.hass.locale)
            : this._period === "year"
            ? formatDateYear(this._startDate, this.hass.locale)
            : `${formatDateShort(
                this._startDate,
                this.hass.locale
              )} - ${formatDateShort(
                this._endDate || new Date(),
                this.hass.locale
              )}`}
          <mwc-icon-button label="Previous" @click=${this._pickPrevious}>
            <ha-svg-icon .path=${mdiChevronLeft}></ha-svg-icon>
          </mwc-icon-button>
          <mwc-icon-button label="Next" @click=${this._pickNext}>
            <ha-svg-icon .path=${mdiChevronRight}></ha-svg-icon>
          </mwc-icon-button>
          <mwc-button dense outlined @click=${this._pickToday}>
            Today
          </mwc-button>
        </div>
        <div class="period">
          <ha-button-toggle-group
            .buttons=${viewButtons}
            .active=${this._period}
            dense
            @value-changed=${this._handleView}
          ></ha-button-toggle-group>
        </div>
      </div>
    `;
  }

  private _handleView(ev: CustomEvent): void {
    this._period = ev.detail.value;
    const today = startOfToday();
    const start =
      !this._startDate ||
      isWithinInterval(today, {
        start: this._startDate,
        end: this._endDate || endOfToday(),
      })
        ? today
        : this._startDate;

    this._setDate(
      this._period === "day"
        ? startOfDay(start)
        : this._period === "week"
        ? startOfWeek(start, { weekStartsOn: 1 })
        : this._period === "month"
        ? startOfMonth(start)
        : startOfYear(start)
    );
  }

  private _pickToday() {
    this._setDate(
      this._period === "day"
        ? startOfToday()
        : this._period === "week"
        ? startOfWeek(new Date(), { weekStartsOn: 1 })
        : this._period === "month"
        ? startOfMonth(new Date())
        : startOfYear(new Date())
    );
  }

  private _pickPrevious() {
    const newStart =
      this._period === "day"
        ? addDays(this._startDate!, -1)
        : this._period === "week"
        ? addWeeks(this._startDate!, -1)
        : this._period === "month"
        ? addMonths(this._startDate!, -1)
        : addYears(this._startDate!, -1);
    this._setDate(newStart);
  }

  private _pickNext() {
    const newStart =
      this._period === "day"
        ? addDays(this._startDate!, 1)
        : this._period === "week"
        ? addWeeks(this._startDate!, 1)
        : this._period === "month"
        ? addMonths(this._startDate!, 1)
        : addYears(this._startDate!, 1);
    this._setDate(newStart);
  }

  private _setDate(startDate: Date) {
    const endDate =
      this._period === "day"
        ? endOfDay(startDate)
        : this._period === "week"
        ? endOfWeek(startDate, { weekStartsOn: 1 })
        : this._period === "month"
        ? endOfMonth(startDate)
        : endOfYear(startDate);

    const energyCollection = getEnergyDataCollection(this.hass, {
      key: this.collectionKey,
    });
    energyCollection.setPeriod(startDate, endDate);
    energyCollection.refresh();
  }

  private _updateDates(energyData: EnergyData): void {
    this._startDate = energyData.start;
    this._endDate = energyData.end || endOfToday();
    const dayDifference = differenceInDays(this._endDate, this._startDate);
    this._period =
      dayDifference < 1
        ? "day"
        : dayDifference === 6
        ? "week"
        : dayDifference > 26 && dayDifference < 31 // 28, 29, 30 or 31 days in a month
        ? "month"
        : dayDifference === 364 || dayDifference === 365 // Leap year
        ? "year"
        : undefined;
  }

  static get styles(): CSSResultGroup {
    return css`
      .row {
        display: flex;
        justify-content: flex-end;
      }
      :host([narrow]) .row {
        flex-direction: column-reverse;
      }
      :host([narrow]) .period {
        margin-bottom: 8px;
      }
      .label {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        font-size: 20px;
      }
      .period {
        display: flex;
        justify-content: flex-end;
      }
      :host {
        --mdc-button-outline-color: currentColor;
        --primary-color: currentColor;
        --mdc-theme-primary: currentColor;
        --mdc-button-disabled-outline-color: var(--disabled-text-color);
        --mdc-button-disabled-ink-color: var(--disabled-text-color);
        --mdc-icon-button-ripple-opacity: 0.2;
      }
      mwc-icon-button {
        --mdc-icon-button-size: 28px;
      }
      ha-button-toggle-group {
        padding-left: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-period-selector": HuiEnergyPeriodSelector;
  }
}
