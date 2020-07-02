import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "../../components/ha-icon-button";
import "../../components/ha-circular-progress";
import { computeRTL } from "../../common/util/compute_rtl";
import "../../components/entity/ha-entity-picker";
import "../../components/ha-menu-button";
import "./ha-logbook";
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
import { fetchUsers } from "../../data/user";
import {
  clearLogbookCache,
  getLogbookData,
  LogbookEntry,
} from "../../data/logbook";
import { mdiRefresh } from "@mdi/js";
import "../../components/ha-date-range-picker";
import type { DateRangePickerRanges } from "../../components/ha-date-range-picker";

@customElement("ha-panel-logbook")
export class HaPanelLogbook extends LitElement {
  @property() hass!: HomeAssistant;

  @property({ reflect: true, type: Boolean }) narrow!: boolean;

  @property({ attribute: false })
  private _userIdToName = {};

  @property() _startDate: Date;

  @property() _endDate: Date;

  @property() _entityId = "";

  @property() _isLoading = false;

  @property() _entries: LogbookEntry[] = [];

  @property({ reflect: true, type: Boolean }) rtl = false;

  @property() private _ranges?: DateRangePickerRanges;

  private _fetchUserDone?: Promise<unknown>;

  public constructor() {
    super();

    const start = new Date();
    start.setHours(start.getHours() - 2);
    start.setMinutes(0);
    start.setSeconds(0);
    start.setMilliseconds(0);
    this._startDate = start;

    const end = new Date();
    end.setHours(end.getHours() + 1);
    end.setMinutes(0);
    end.setSeconds(0);
    end.setMilliseconds(0);
    this._endDate = end;
  }

  protected render() {
    return html`
      <app-header-layout>
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

        ${this._isLoading ? html`` : ""}

        <div class="filters">
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
          ? html`<ha-circular-progress
              active
              alt=${this.hass.localize("ui.common.loading")}
            ></ha-circular-progress>`
          : html`<ha-logbook
              .hass=${this.hass}
              .entries=${this._entries}
              .userIdToName=${this._userIdToName}
            ></ha-logbook>`}
      </app-header-layout>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("title");

    this._fetchUserDone = this._fetchUsers();

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
      todayCopy.setDate(thisWeekStart.getDate() + 7)
    );
    thisWeekEnd.setMilliseconds(thisWeekEnd.getMilliseconds() - 1);

    const lastWeekStart = new Date(
      todayCopy.setDate(today.getDate() - today.getDay() - 7)
    );
    const lastWeekEnd = new Date(
      todayCopy.setDate(lastWeekStart.getDate() + 7)
    );
    lastWeekEnd.setMilliseconds(lastWeekEnd.getMilliseconds() - 1);

    this._ranges = {
      [this.hass.localize("ui.panel.logbook.ranges.today")]: [today, todayEnd],
      [this.hass.localize("ui.panel.logbook.ranges.yesterday")]: [
        yesterday,
        yesterdayEnd,
      ],
      [this.hass.localize("ui.panel.logbook.ranges.this_week")]: [
        thisWeekStart,
        thisWeekEnd,
      ],
      [this.hass.localize("ui.panel.logbook.ranges.last_week")]: [
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
      this._getData();
    }

    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass || oldHass.language !== this.hass.language) {
        this.rtl = computeRTL(this.hass);
      }
    }
  }

  private async _fetchUsers() {
    const users = await fetchUsers(this.hass);
    const userid_to_name = {};
    users.forEach((user) => {
      userid_to_name[user.id] = user.name;
    });
    this._userIdToName = userid_to_name;
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
    const [entries] = await Promise.all([
      getLogbookData(
        this.hass,
        this._startDate.toISOString(),
        this._endDate.toISOString(),
        this._entityId
      ),
      this._fetchUserDone,
    ]);
    // Fixed in TS 3.9 but upgrade out of scope for this PR.
    // @ts-ignore
    this._entries = entries;
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
      `,
    ];
  }
}
