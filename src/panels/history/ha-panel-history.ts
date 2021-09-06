import { mdiRefresh } from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import {
  addDays,
  endOfToday,
  endOfWeek,
  endOfYesterday,
  startOfToday,
  startOfWeek,
  startOfYesterday,
} from "date-fns";
import { css, html, LitElement, PropertyValues } from "lit";
import { property, state } from "lit/decorators";
import { computeRTL } from "../../common/util/compute_rtl";
import "../../components/chart/state-history-charts";
import "../../components/entity/ha-entity-picker";
import "../../components/ha-circular-progress";
import "../../components/ha-date-range-picker";
import type { DateRangePickerRanges } from "../../components/ha-date-range-picker";
import "../../components/ha-menu-button";
import { computeHistory, fetchDate } from "../../data/history";
import "../../layouts/ha-app-layout";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";

class HaPanelHistory extends LitElement {
  @property() hass!: HomeAssistant;

  @property({ reflect: true, type: Boolean }) narrow!: boolean;

  @property() _startDate: Date;

  @property() _endDate: Date;

  @property() _entityId = "";

  @property() _isLoading = false;

  @property() _stateHistory?;

  @property({ reflect: true, type: Boolean }) rtl = false;

  @state() private _ranges?: DateRangePickerRanges;

  public constructor() {
    super();

    const start = new Date();
    start.setHours(start.getHours() - 2, 0, 0, 0);
    this._startDate = start;

    const end = new Date();
    end.setHours(end.getHours() + 1, 0, 0, 0);
    this._endDate = end;
  }

  protected render() {
    return html`
      <ha-app-layout>
        <app-header slot="header" fixed>
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>${this.hass.localize("panel.history")}</div>
            <mwc-icon-button
              @click=${this._refreshHistory}
              .disabled=${this._isLoading}
            >
              <ha-svg-icon .path=${mdiRefresh}></ha-svg-icon>
            </mwc-icon-button>
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

            <ha-entity-picker
              .hass=${this.hass}
              .value=${this._entityId}
              .label=${this.hass.localize(
                "ui.components.entity.entity-picker.entity"
              )}
              .disabled=${this._isLoading}
              @change=${this._entityPicked}
            ></ha-entity-picker>
          </div>
          ${this._isLoading
            ? html`<div class="progress-wrapper">
                <ha-circular-progress
                  active
                  alt=${this.hass.localize("ui.common.loading")}
                ></ha-circular-progress>
              </div>`
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
      </ha-app-layout>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    const today = new Date();
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);

    this._ranges = {
      [this.hass.localize("ui.components.date-range-picker.ranges.today")]: [
        startOfToday(),
        endOfToday(),
      ],
      [this.hass.localize("ui.components.date-range-picker.ranges.yesterday")]:
        [startOfYesterday(), endOfYesterday()],
      [this.hass.localize("ui.components.date-range-picker.ranges.this_week")]:
        [weekStart, weekEnd],
      [this.hass.localize("ui.components.date-range-picker.ranges.last_week")]:
        [addDays(weekStart, -7), addDays(weekEnd, -7)],
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

  private _refreshHistory() {
    this._getHistory();
  }

  private async _getHistory() {
    this._isLoading = true;
    const dateHistory = await fetchDate(
      this.hass,
      this._startDate,
      this._endDate,
      this._entityId
    );
    this._stateHistory = computeHistory(
      this.hass,
      dateHistory,
      this.hass.localize
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

  private _entityPicked(ev) {
    this._entityId = ev.target.value;
  }

  static get styles() {
    return [
      haStyle,
      css`
        .content {
          padding: 0 16px 16px;
        }

        .progress-wrapper {
          height: calc(100vh - 136px);
        }

        :host([narrow]) .progress-wrapper {
          height: calc(100vh - 198px);
        }

        .progress-wrapper {
          position: relative;
        }

        ha-date-range-picker {
          margin-right: 16px;
          max-width: 100%;
        }

        :host([narrow]) ha-date-range-picker {
          margin-right: 0;
        }

        ha-circular-progress {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        }

        ha-entity-picker {
          display: inline-block;
          flex-grow: 1;
          max-width: 400px;
        }

        :host([narrow]) ha-entity-picker {
          max-width: none;
          width: 100%;
        }
      `,
    ];
  }
}

customElements.define("ha-panel-history", HaPanelHistory);
