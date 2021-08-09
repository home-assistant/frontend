import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import {
  endOfToday,
  addDays,
  endOfDay,
  startOfToday,
  endOfWeek,
  endOfMonth,
  startOfWeek,
  startOfMonth,
  addMonths,
  addWeeks,
  startOfYear,
  addYears,
  endOfYear,
  isSameWeek,
  isSameDay,
  isSameMonth,
  isSameYear,
} from "date-fns";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  formatDate,
  formatDateShort,
} from "../../../common/datetime/format_date";
import { EnergyData, getEnergyDataCollection } from "../../../data/energy";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant, ToggleButton } from "../../../types";
import "@material/mwc-icon-button/mwc-icon-button";
import "../../../components/ha-svg-icon";
import "@material/mwc-button/mwc-button";
import "../../../components/ha-button-toggle-group";

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
            ? this._startDate.toLocaleString(this.hass.locale.language, {
                month: "long",
              })
            : this._period === "year"
            ? this._startDate.toLocaleString(this.hass.locale.language, {
                year: "numeric",
              })
            : `${formatDateShort(
                this._startDate,
                this.hass.locale
              )} - ${formatDateShort(
                this._endDate || new Date(),
                this.hass.locale
              )}`}
        </div>

        <mwc-icon-button label="Previous" @click=${this._pickPrevious}>
          <ha-svg-icon .path=${mdiChevronLeft}></ha-svg-icon>
        </mwc-icon-button>
        <mwc-icon-button label="Next" @click=${this._pickNext}>
          <ha-svg-icon .path=${mdiChevronRight}></ha-svg-icon>
        </mwc-icon-button>

        <mwc-button dense outlined @click=${this._pickToday}>
          Today
        </mwc-button>
        <ha-button-toggle-group
          .buttons=${viewButtons}
          .active=${this._period}
          dense
          @value-changed=${this._handleView}
        ></ha-button-toggle-group>
      </div>
    `;
  }

  private _handleView(ev: CustomEvent): void {
    this._period = ev.detail.value;
    const currentStart = this._startDate || startOfToday();
    this._setDate(
      this._period === "day"
        ? currentStart
        : this._period === "week"
        ? startOfWeek(currentStart, { weekStartsOn: 1 })
        : this._period === "month"
        ? startOfMonth(currentStart)
        : startOfYear(currentStart)
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
    this._period = isSameDay(this._startDate, this._endDate)
      ? "day"
      : isSameWeek(this._startDate, this._endDate, { weekStartsOn: 1 })
      ? "week"
      : isSameMonth(this._startDate, this._endDate)
      ? "month"
      : isSameYear(this._startDate, this._endDate)
      ? "year"
      : undefined;
  }

  static get styles(): CSSResultGroup {
    return css`
      .row {
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }
      .label {
        padding: 0 8px;
        text-align: center;
        font-size: 20px;
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
      mwc-button,
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
