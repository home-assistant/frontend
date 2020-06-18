import "@material/mwc-button";
import "@material/mwc-list";
import "@material/mwc-list/mwc-list-item";
import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "../../components/ha-icon-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-spinner/paper-spinner";
import { formatDateTime } from "../../common/datetime/format_date_time";
import { computeRTL } from "../../common/util/compute_rtl";
import "../../components/entity/ha-entity-picker";
import "../../components/ha-menu-button";
import "../../resources/ha-date-picker-style";
import "./ha-logbook";
import "../../components/date-range-picker";
import {
  LitElement,
  property,
  customElement,
  html,
  css,
  PropertyValues,
} from "lit-element";
import { HomeAssistant } from "../../types";
import { haStyle } from "../../resources/styles";
import { clearLogbookCache, getLogbookData } from "../../data/logbook";
import { mdiRefresh, mdiCalendar } from "@mdi/js";

const today = new Date();
today.setHours(0, 0, 0, 0);

const yesterday = new Date();
yesterday.setDate(today.getDate() - 1);
yesterday.setHours(0, 0, 0, 0);

const thisWeek = new Date();
thisWeek.setHours(0, 0, 0, 0);

const lastWeek = new Date();
lastWeek.setHours(0, 0, 0, 0);

@customElement("ha-panel-logbook")
export class HaPanelLogbook extends LitElement {
  @property() hass!: HomeAssistant;

  @property({ reflect: true, type: Boolean }) narrow!: boolean;

  @property() _startDate: Date;

  @property() _endDate: Date;

  @property() _entityId = "";

  @property() _isLoading = false;

  @property() _entries = [];

  @property({ reflect: true, type: Boolean }) rtl = false;

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
            <div main-title>${this.hass.localize("panel.logbook")}</div>
            <mwc-icon-button
              @click=${this._refreshLogbook}
              .disabled=${this._isLoading}
            >
              <ha-svg-icon path=${mdiRefresh}></ha-svg-icon>
            </mwc-icon-button>
          </app-toolbar>
        </app-header>

        ${this._isLoading
          ? html` <paper-spinner
              active
              alt=${this.hass.localize("ui.common.loading")}
            ></paper-spinner>`
          : ""}

        <div class="filters">
          <date-range-picker
            ?disabled=${this._isLoading}
            twentyfour-hours=${this._compute24hourFormat()}
            start-date=${this._startDate}
            end-date=${this._endDate}
            @change=${this._dateRangeChanged}
          >
            <div slot="input" style="display: flex; align-items: center;">
              <ha-svg-icon path=${mdiCalendar}></ha-svg-icon>
              <paper-input
                .value=${formatDateTime(this._startDate, this.hass.language)}
                label="From"
                .disabled=${this._isLoading}
                readonly=""
                style="margin-right: 8px;"
              ></paper-input>
              <paper-input
                .value=${formatDateTime(this._endDate, this.hass.language)}
                label="Till"
                .disabled=${this._isLoading}
                readonly=""
              ></paper-input>
            </div>
            <div
              slot="ranges"
              style="border-right: 1px solid var(--divider-color); border-bottom: 1px solid var(--divider-color)"
            >
              <mwc-list>
                <mwc-list-item
                  @click=${this._setDateRange}
                  .startDate=${today}
                  .endDate=${today}
                  >Today</mwc-list-item
                >
                <mwc-list-item
                  @click=${this._setDateRange}
                  .startDate=${yesterday}
                  .endDate=${yesterday}
                  >Yesterday</mwc-list-item
                >
                <mwc-list-item
                  @click=${this._setDateRange}
                  .startDate=${new Date(
                    thisWeek.setDate(today.getDate() - today.getDay())
                  )}
                  .endDate=${new Date(
                    thisWeek.setDate(today.getDate() - today.getDay() + 6)
                  )}
                  >This week</mwc-list-item
                >
                <mwc-list-item
                  @click=${this._setDateRange}
                  .startDate=${new Date(
                    lastWeek.setDate(today.getDate() - today.getDay() - 7)
                  )}
                  .endDate=${new Date(
                    lastWeek.setDate(today.getDate() - today.getDay() - 1)
                  )}
                  >Last week</mwc-list-item
                >
              </mwc-list>
            </div>
            <div
              slot="footer"
              style="display: flex; justify-content: flex-end; padding: 8px; border-top: 1px solid var(--divider-color)"
            >
              <mwc-button @click=${this._cancelDateRange}>Cancel</mwc-button>
              <mwc-button @click=${this._applyDateRange}>Select</mwc-button>
            </div>
          </date-range-picker>

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
          ? ""
          : html`<ha-logbook
              .hass=${this.hass}
              .entries=${this._entries}
            ></ha-logbook>`}
      </app-header-layout>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("title");
  }

  protected updated(changedProps: PropertyValues) {
    if (
      changedProps.has("_startDate") ||
      changedProps.has("_endDate") ||
      changedProps.has("_entityId")
    ) {
      this._getData();
    }

    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass || oldHass.language !== this.hass.language) {
        this.rtl = computeRTL(this.hass);
      }
    }
  }

  private _compute24hourFormat() {
    return (
      new Intl.DateTimeFormat(this.hass.language, {
        hour: "numeric",
      })
        .formatToParts(new Date(2020, 0, 1, 13))
        .find((part) => part.type === "hour")!.value.length === 2
    );
  }

  private _setDateRange(ev) {
    const dateRangePicker = ev.currentTarget.closest("date-range-picker");
    const startDate = ev.target.startDate;
    const endDate = ev.target.endDate;
    dateRangePicker.vueComponent.$children[0].clickRange([startDate, endDate]);
    dateRangePicker.vueComponent.$children[0].clickedApply();
  }

  private _cancelDateRange(ev) {
    const dateRangePicker = ev.target.closest("date-range-picker");
    dateRangePicker.vueComponent.$children[0].clickCancel();
  }

  private _applyDateRange(ev) {
    const dateRangePicker = ev.target.closest("date-range-picker");
    dateRangePicker.vueComponent.$children[0].clickedApply();
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

  private _refreshLogbook() {
    this._entries = [];
    clearLogbookCache(
      this._startDate.toISOString(),
      this._endDate.toISOString()
    );
    this._getData();
  }

  private async _getData() {
    this._isLoading = true;
    this._entries = await getLogbookData(
      this.hass,
      this._startDate.toISOString(),
      this._endDate.toISOString(),
      this._entityId
    );
    this._isLoading = false;
  }

  static get styles() {
    return [
      haStyle,
      css`
        ha-logbook {
          height: calc(100vh - 136px);
        }

        :host([narrow]) ha-logbook {
          height: calc(100vh - 198px);
        }

        date-range-picker {
          margin-right: 16px;
          max-width: 100%;
        }

        :host([narrow]) date-range-picker {
          margin-right: 0;
        }

        date-range-picker ha-icon {
          margin-right: 8px;
        }

        date-range-picker paper-input {
          display: inline-block;
          max-width: 200px;
        }

        paper-spinner {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        }

        .wrap {
          margin-bottom: 24px;
        }

        .filters {
          display: flex;
          align-items: flex-end;
          padding: 0 16px;
        }

        :host([narrow]) .filters {
          flex-wrap: wrap;
        }

        paper-item {
          cursor: pointer;
          white-space: nowrap;
        }

        ha-entity-picker {
          display: inline-block;
          flex-grow: 1;
          max-width: 400px;
          --paper-input-suffix: {
            height: 24px;
          }
        }

        :host([narrow]) ha-entity-picker {
          max-width: none;
          width: 100%;
        }

        [hidden] {
          display: none !important;
        }
      `,
    ];
  }
}
