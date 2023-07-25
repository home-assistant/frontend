import "@material/mwc-button/mwc-button";
import { mdiCompare, mdiCompareRemove } from "@mdi/js";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInDays,
  endOfDay,
  endOfMonth,
  endOfToday,
  endOfWeek,
  endOfYear,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfToday,
  startOfWeek,
  startOfYear,
} from "date-fns/esm";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
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
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import "../../../components/ha-button-toggle-group";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-next";
import "../../../components/ha-icon-button-prev";
import { EnergyData, getEnergyDataCollection } from "../../../data/energy";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant, ToggleButton } from "../../../types";

@customElement("hui-energy-period-selector")
export class HuiEnergyPeriodSelector extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public collectionKey?: string;

  @property({ type: Boolean, reflect: true }) public narrow?;

  @state() _startDate?: Date;

  @state() _endDate?: Date;

  @state() private _period?: "day" | "week" | "month" | "year";

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

  protected render() {
    if (!this.hass || !this._startDate) {
      return nothing;
    }

    const viewButtons: ToggleButton[] = [
      {
        label: this.hass.localize(
          "ui.panel.lovelace.components.energy_period_selector.day"
        ),
        value: "day",
      },
      {
        label: this.hass.localize(
          "ui.panel.lovelace.components.energy_period_selector.week"
        ),
        value: "week",
      },
      {
        label: this.hass.localize(
          "ui.panel.lovelace.components.energy_period_selector.month"
        ),
        value: "month",
      },
      {
        label: this.hass.localize(
          "ui.panel.lovelace.components.energy_period_selector.year"
        ),
        value: "year",
      },
    ];

    return html`
      <div class="row">
        <div class="label">
          ${this._period === "day"
            ? formatDate(this._startDate, this.hass.locale, this.hass.config)
            : this._period === "month"
            ? formatDateMonthYear(
                this._startDate,
                this.hass.locale,
                this.hass.config
              )
            : this._period === "year"
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
          <mwc-button dense outlined @click=${this._pickToday}>
            ${this.hass.localize(
              "ui.panel.lovelace.components.energy_period_selector.today"
            )}
          </mwc-button>
        </div>
        <div class="period">
          <ha-button-toggle-group
            .buttons=${viewButtons}
            .active=${this._period}
            dense
            @value-changed=${this._handleView}
            .dir=${computeRTLDirection(this.hass)}
          ></ha-button-toggle-group>
          ${this.narrow
            ? html`<ha-icon-button
                class="compare ${this._compare ? "active" : ""}"
                .path=${this._compare ? mdiCompareRemove : mdiCompare}
                @click=${this._toggleCompare}
                dense
                outlined
              >
                ${this.hass.localize(
                  "ui.panel.lovelace.components.energy_period_selector.compare"
                )}
              </ha-icon-button>`
            : html`<mwc-button
                class="compare ${this._compare ? "active" : ""}"
                @click=${this._toggleCompare}
                dense
                outlined
              >
                ${this.hass.localize(
                  "ui.panel.lovelace.components.energy_period_selector.compare"
                )}
              </mwc-button>`}
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

    const weekStartsOn = firstWeekdayIndex(this.hass.locale);

    this._setDate(
      this._period === "day"
        ? calcDate(start, startOfDay, this.hass.locale, this.hass.config)
        : this._period === "week"
        ? calcDate(start, startOfWeek, this.hass.locale, this.hass.config, {
            weekStartsOn,
          })
        : this._period === "month"
        ? calcDate(start, startOfMonth, this.hass.locale, this.hass.config)
        : calcDate(start, startOfYear, this.hass.locale, this.hass.config)
    );
  }

  private _pickToday() {
    const weekStartsOn = firstWeekdayIndex(this.hass.locale);

    this._setDate(
      this._period === "day"
        ? calcDate(new Date(), startOfDay, this.hass.locale, this.hass.config)
        : this._period === "week"
        ? calcDate(
            new Date(),
            startOfWeek,
            this.hass.locale,
            this.hass.config,
            {
              weekStartsOn,
            }
          )
        : this._period === "month"
        ? calcDate(new Date(), startOfMonth, this.hass.locale, this.hass.config)
        : calcDate(new Date(), startOfYear, this.hass.locale, this.hass.config)
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
    const weekStartsOn = firstWeekdayIndex(this.hass.locale);

    const endDate =
      this._period === "day"
        ? calcDate(startDate, endOfDay, this.hass.locale, this.hass.config)
        : this._period === "week"
        ? calcDate(startDate, endOfWeek, this.hass.locale, this.hass.config, {
            weekStartsOn,
          })
        : this._period === "month"
        ? calcDate(startDate, endOfMonth, this.hass.locale, this.hass.config)
        : calcDate(startDate, endOfYear, this.hass.locale, this.hass.config);

    const energyCollection = getEnergyDataCollection(this.hass, {
      key: this.collectionKey,
    });
    energyCollection.setPeriod(startDate, endDate);
    energyCollection.refresh();
  }

  private _updateDates(energyData: EnergyData): void {
    this._compare = energyData.startCompare !== undefined;
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
        flex-direction: column-reverse;
      }
      .label {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        font-size: 20px;
      }
      .period {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        align-items: center;
      }
      :host([narrow]) .period {
        margin-bottom: 8px;
      }
      mwc-button {
        margin-left: 8px;
      }
      ha-icon-button {
        margin-left: 4px;
        --mdc-icon-size: 20px;
      }
      ha-icon-button.active::before,
      mwc-button.active::before {
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        position: absolute;
        background-color: currentColor;
        opacity: 0;
        pointer-events: none;
        content: "";
        transition:
          opacity 15ms linear,
          background-color 15ms linear;
        opacity: var(--mdc-icon-button-ripple-opacity, 0.12);
      }
      ha-icon-button.active::before {
        border-radius: 50%;
      }
      .compare {
        position: relative;
      }
      :host {
        --mdc-button-outline-color: currentColor;
        --primary-color: currentColor;
        --mdc-theme-primary: currentColor;
        --mdc-theme-on-primary: currentColor;
        --mdc-button-disabled-outline-color: var(--disabled-text-color);
        --mdc-button-disabled-ink-color: var(--disabled-text-color);
        --mdc-icon-button-ripple-opacity: 0.2;
      }
      ha-icon-button {
        --mdc-icon-button-size: 28px;
      }
      ha-button-toggle-group {
        padding-left: 8px;
        padding-inline-start: 8px;
        direction: var(--direction);
      }
      mwc-button {
        flex-shrink: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-period-selector": HuiEnergyPeriodSelector;
  }
}
