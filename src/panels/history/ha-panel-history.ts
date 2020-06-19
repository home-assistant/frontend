import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import { computeRTL } from "../../common/util/compute_rtl";
import "../../components/ha-menu-button";
import "../../components/state-history-charts";
import { LitElement, css, property, PropertyValues } from "lit-element";
import { html } from "lit-html";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import type { DateRangePickerRanges } from "../../components/ha-date-range-picker";
import "../../components/ha-date-range-picker";
import { fetchDate, computeHistory } from "../../data/history";
import "@polymer/paper-spinner/paper-spinner";

class HaPanelHistory extends LitElement {
  @property() hass!: HomeAssistant;

  @property({ reflect: true, type: Boolean }) narrow!: boolean;

  @property() _startDate: Date;

  @property() _endDate: Date;

  @property() _entityId = "";

  @property() _isLoading = false;

  @property() _stateHistory?;

  @property({ reflect: true, type: Boolean }) rtl = false;

  @property() private _ranges?: DateRangePickerRanges;

  public constructor() {
    super();

    const start = new Date();
    start.setHours(start.getHours() - 2);
    start.setMinutes(0);
    start.setSeconds(0);
    this._startDate = start;

    const end = new Date();
    end.setHours(end.getHours() + 1);
    end.setMinutes(0);
    end.setSeconds(0);
    this._endDate = end;
  }

  protected render() {
    return html`
      <app-header-layout has-scrolling-region>
        <app-header slot="header" fixed>
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>${this.hass.localize("panel.history")}</div>
          </app-toolbar>
        </app-header>

        <div class="flex content">
          <div class="flex layout horizontal wrap">
            <ha-date-range-picker
              .hass=${this.hass}
              ?disabled=${this._isLoading}
              .startDate=${this._startDate}
              .endDate=${this._endDate}
              .ranges=${this._ranges}
              @change=${this._dateRangeChanged}
            ></ha-date-range-picker>
          </div>
          ${this._isLoading
            ? html`<paper-spinner
                active
                alt=${this.hass.localize("ui.common.loading")}
              ></paper-spinner>`
            : html`
                <state-history-charts
                  .hass=${this.hass}
                  .historyData=${this._stateHistory}
                  .endTime=${this._endDate}
                  no-single
                >
                </state-history-charts>
              `}
        </div>
      </app-header-layout>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);
    todayEnd.setMilliseconds(todayEnd.getMilliseconds() - 1);

    const todayCopy = new Date(today);

    const yesterday = new Date(todayCopy.setDate(today.getDate() - 1));
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setDate(yesterdayEnd.getDate() + 1);
    yesterdayEnd.setMilliseconds(yesterdayEnd.getMilliseconds() - 1);

    const thisWeekStart = new Date(
      todayCopy.setDate(today.getDate() - today.getDay())
    );
    const thisWeekEnd = new Date(
      todayCopy.setDate(today.getDate() - today.getDay() + 7)
    );
    thisWeekEnd.setMilliseconds(thisWeekEnd.getMilliseconds() - 1);

    const lastWeekStart = new Date(
      todayCopy.setDate(today.getDate() - today.getDay() - 7)
    );
    const lastWeekEnd = new Date(
      todayCopy.setDate(today.getDate() - today.getDay())
    );
    lastWeekEnd.setMilliseconds(lastWeekEnd.getMilliseconds() - 1);

    this._ranges = {
      [this.hass.localize("ui.panel.history.ranges.today")]: [today, todayEnd],
      [this.hass.localize("ui.panel.history.ranges.yesterday")]: [
        yesterday,
        yesterdayEnd,
      ],
      [this.hass.localize("ui.panel.history.ranges.this_week")]: [
        thisWeekStart,
        thisWeekEnd,
      ],
      [this.hass.localize("ui.panel.history.ranges.last_week")]: [
        lastWeekStart,
        lastWeekEnd,
      ],
    };
  }

  protected updated(changedProps: PropertyValues) {
    if (
      changedProps.has("_startDate") ||
      changedProps.has("_endDate") ||
      changedProps.has("_entityId")
    ) {
      this._getHistory();
    }

    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass || oldHass.language !== this.hass.language) {
        this.rtl = computeRTL(this.hass);
      }
    }
  }

  private async _getHistory() {
    this._isLoading = true;
    const dateHistory = await fetchDate(
      this.hass,
      this._startDate,
      this._endDate
    );
    this._stateHistory = computeHistory(
      this.hass,
      dateHistory,
      this.hass.localize,
      this.hass.language
    );
    this._isLoading = false;
  }

  private _dateRangeChanged(ev) {
    this._startDate = ev.detail.startDate;
    const endDate = ev.detail.endDate;
    if (endDate.getHours() === 0 && endDate.getMinutes() === 0) {
      endDate.setDate(endDate.getDate() + 1);
      endDate.setMilliseconds(endDate.getMilliseconds() - 1);
    }
    this._endDate = endDate;
  }

  static get styles() {
    return [
      haStyle,
      css`
        .content {
          padding: 0 16px 16px;
        }
        paper-spinner {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        }
      `,
    ];
  }
}

customElements.define("ha-panel-history", HaPanelHistory);
