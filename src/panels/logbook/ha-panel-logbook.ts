import { mdiRefresh } from "@mdi/js";
import "@material/mwc-icon-button";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  addDays,
  endOfToday,
  endOfWeek,
  endOfYesterday,
  startOfToday,
  startOfWeek,
  startOfYesterday,
} from "date-fns";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { computeRTL } from "../../common/util/compute_rtl";
import "../../components/entity/ha-entity-picker";
import "../../components/ha-circular-progress";
import "../../components/ha-date-range-picker";
import type { DateRangePickerRanges } from "../../components/ha-date-range-picker";
import "../../components/ha-menu-button";
import {
  clearLogbookCache,
  getLogbookData,
  LogbookEntry,
} from "../../data/logbook";
import { loadTraceContexts, TraceContexts } from "../../data/trace";
import { fetchUsers } from "../../data/user";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import "../../layouts/ha-app-layout";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import "./ha-logbook";

@customElement("ha-panel-logbook")
export class HaPanelLogbook extends LitElement {
  @property() hass!: HomeAssistant;

  @property({ reflect: true, type: Boolean }) narrow!: boolean;

  @property() _startDate: Date;

  @property() _endDate: Date;

  @property() _entityId = "";

  @property() _isLoading = false;

  @property() _entries: LogbookEntry[] = [];

  @property({ reflect: true, type: Boolean }) rtl = false;

  @state() private _ranges?: DateRangePickerRanges;

  private _fetchUserPromise?: Promise<void>;

  @state() private _userIdToName = {};

  @state() private _traceContexts: TraceContexts = {};

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
            <div main-title>${this.hass.localize("panel.logbook")}</div>
            <mwc-icon-button
              @click=${this._refreshLogbook}
              .disabled=${this._isLoading}
            >
              <ha-svg-icon .path=${mdiRefresh}></ha-svg-icon>
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
          ? html`
              <div class="progress-wrapper">
                <ha-circular-progress
                  active
                  alt=${this.hass.localize("ui.common.loading")}
                ></ha-circular-progress>
              </div>
            `
          : html`
              <ha-logbook
                .hass=${this.hass}
                .entries=${this._entries}
                .userIdToName=${this._userIdToName}
                .traceContexts=${this._traceContexts}
                virtualize
              ></ha-logbook>
            `}
      </ha-app-layout>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("title");

    this._fetchUserPromise = this._fetchUserNames();

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

  protected updated(changedProps: PropertyValues<this>) {
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

  private async _fetchUserNames() {
    const userIdToName = {};

    // Start loading users
    const userProm = this.hass.user?.is_admin && fetchUsers(this.hass);

    // Process persons
    Object.values(this.hass.states).forEach((entity) => {
      if (
        entity.attributes.user_id &&
        computeStateDomain(entity) === "person"
      ) {
        this._userIdToName[entity.attributes.user_id] =
          entity.attributes.friendly_name;
      }
    });

    // Process users
    if (userProm) {
      const users = await userProm;
      for (const user of users) {
        if (!(user.id in userIdToName)) {
          userIdToName[user.id] = user.name;
        }
      }
    }

    this._userIdToName = userIdToName;
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
    let entries;
    let traceContexts;

    try {
      [entries, traceContexts] = await Promise.all([
        getLogbookData(
          this.hass,
          this._startDate.toISOString(),
          this._endDate.toISOString(),
          this._entityId
        ),
        isComponentLoaded(this.hass, "trace") && this.hass.user?.is_admin
          ? loadTraceContexts(this.hass)
          : {},
        this._fetchUserPromise,
      ]);
    } catch (err) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.components.logbook.retrieval_error"),
        text: err.message,
      });
    }

    this._entries = entries;
    this._traceContexts = traceContexts;
    this._isLoading = false;
  }

  static get styles() {
    return [
      haStyle,
      css`
        ha-logbook,
        .progress-wrapper {
          height: calc(100vh - 136px);
        }

        :host([narrow]) ha-logbook,
        :host([narrow]) .progress-wrapper {
          height: calc(100vh - 198px);
        }

        ha-date-range-picker {
          margin-right: 16px;
          max-width: 100%;
        }

        :host([narrow]) ha-date-range-picker {
          margin-right: 0;
        }

        .progress-wrapper {
          position: relative;
        }

        ha-circular-progress {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
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
        }

        :host([narrow]) ha-entity-picker {
          max-width: none;
          width: 100%;
        }
      `,
    ];
  }
}
