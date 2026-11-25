import { mdiRefresh } from "@mdi/js";
import type { HassConfig } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { formatShortDateTimeWithSeconds } from "../../../../common/datetime/format_date_time";
import type {
  HASSDomEvent,
  HASSDomTargetEvent,
} from "../../../../common/dom/fire_event";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { computeStateDomain } from "../../../../common/entity/compute_state_domain";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  RowClickedEvent,
} from "../../../../components/data-table/ha-data-table";
import "../../../../components/date-picker/ha-date-range-nav";
import "../../../../components/ha-alert";
import "../../../../components/ha-icon-button";
import "../../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../../components/input/ha-input-search";
import type { LogbookActionCall } from "../../../../data/logbook";
import { getLogbookActionCalls } from "../../../../data/logbook";
import type { TraceContexts } from "../../../../data/trace";
import { loadTraceContexts } from "../../../../data/trace";
import { fetchUsers } from "../../../../data/user";
import { haStyle } from "../../../../resources/styles";
import type { FrontendLocaleData } from "../../../../data/translation";
import type { HomeAssistant } from "../../../../types";
import type { LogbookCause } from "../../../logbook/logbook-entry-model";
import {
  computeCausePhrase,
  computeContextCause,
  computeTraceLink,
  computeUserCause,
} from "../../../logbook/logbook-entry-model";
import { showActionCallDetailDialog } from "./show-dialog-action-call-detail";

interface ActionCallRow extends DataTableRowData {
  id: string;
  call: LogbookActionCall;
  name: string;
  action: string;
  targets: string;
  cause?: LogbookCause;
  // The user the call was made for, when the cause is something else.
  user?: LogbookCause;
  cause_phrase?: string;
  when: number;
}

const targetIds = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (id): id is string => typeof id === "string"
  );

// From the start of the previous hour to two hours ahead, like the activity
// panel, so calls made after loading show up on refresh.
const defaultRange = (): [Date, Date] => {
  const start = new Date();
  start.setHours(start.getHours() - 1, 0, 0, 0);
  const end = new Date();
  end.setHours(end.getHours() + 2, 0, 0, 0);
  return [start, end];
};

@customElement("tools-action-history")
class HaPanelToolsActionHistory extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() private _range = defaultRange();

  @state() private _calls: LogbookActionCall[] = [];

  @state() private _loading = true;

  @state() private _error?: string;

  @state() private _filter = "";

  @state() private _userIdToName: Record<string, string> = {};

  @state() private _systemUserIds = new Set<string>();

  private _traceContexts: TraceContexts = {};

  // Only the latest fetch is shown, in case an earlier one resolves later.
  private _fetch?: Promise<LogbookActionCall[]>;

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("services");
    this._fetchUsers();
    this._refresh();
  }

  private _rows = memoizeOne(
    (
      calls: LogbookActionCall[],
      localize: LocalizeFunc,
      userIdToName: Record<string, string>,
      systemUserIds: Set<string>,
      services: HomeAssistant["services"],
      _entities: HomeAssistant["entities"],
      devices: HomeAssistant["devices"],
      areas: HomeAssistant["areas"],
      floors: HomeAssistant["floors"]
    ): ActionCallRow[] =>
      calls.map((call, index) => {
        const action = `${call.domain}.${call.service}`;
        const user = computeUserCause(call, userIdToName, systemUserIds);
        // Names come from the registries, which are inputs. The states are
        // not, so the rows are not rebuilt on every state change.
        const cause = computeContextCause(this.hass, call) ?? user;
        const data = call.service_data;
        return {
          id: String(index),
          call,
          // Like scripts, not every action has a translated name.
          name:
            localize(
              `component.${call.domain}.services.${call.service}.name`
            ) ||
            services[call.domain]?.[call.service]?.name ||
            action,
          action,
          targets: [
            ...targetIds(data.entity_id).map((entityId) =>
              this.hass.states[entityId]
                ? this.hass.formatEntityName(this.hass.states[entityId])
                : entityId
            ),
            ...targetIds(data.device_id).map(
              (deviceId) =>
                (devices[deviceId] && computeDeviceName(devices[deviceId])) ||
                deviceId
            ),
            ...targetIds(data.area_id).map(
              (areaId) => areas[areaId]?.name ?? areaId
            ),
            ...targetIds(data.floor_id).map(
              (floorId) => floors[floorId]?.name ?? floorId
            ),
            ...targetIds(data.label_id),
          ].join(", "),
          cause,
          user: cause === user ? undefined : user,
          cause_phrase: cause ? computeCausePhrase(localize, cause) : undefined,
          when: call.when,
        };
      })
  );

  private _displayRows() {
    return this._rows(
      this._calls,
      this.hass.localize,
      this._userIdToName,
      this._systemUserIds,
      this.hass.services,
      this.hass.entities,
      this.hass.devices,
      this.hass.areas,
      this.hass.floors
    );
  }

  private _columns = memoizeOne(
    (
      localize: LocalizeFunc,
      narrow: boolean,
      locale: FrontendLocaleData,
      config: HassConfig
    ): DataTableColumnContainer<ActionCallRow> => ({
      name: {
        title: localize("ui.panel.config.tools.tabs.action_history.action"),
        main: true,
        sortable: true,
        filterable: true,
        flex: 2,
        // When narrow, the other columns are shown below the name instead.
        template: narrow
          ? undefined
          : (row) => html`
              <div class="primary">${row.name}</div>
              <div class="secondary">${row.action}</div>
            `,
      },
      action: {
        title: localize("ui.panel.config.tools.tabs.action_history.action_id"),
        filterable: true,
        hidden: true,
      },
      targets: {
        title: localize("ui.panel.config.tools.tabs.action_history.targets"),
        sortable: true,
        filterable: true,
        flex: 2,
      },
      cause_phrase: {
        title: localize("ui.panel.config.tools.tabs.action_history.cause"),
        sortable: true,
        filterable: true,
        groupable: true,
        flex: 2,
      },
      when: {
        title: localize("ui.panel.config.tools.tabs.action_history.time"),
        sortable: true,
        direction: "desc",
        minWidth: "176px",
        template: (row) =>
          formatShortDateTimeWithSeconds(
            new Date(row.when * 1000),
            locale,
            config
          ),
      },
    })
  );

  protected render() {
    const localize = this.hass.localize;

    const searchBar = html`<ha-input-search
      appearance="outlined"
      .value=${this._filter}
      @input=${this._handleSearchChange}
    ></ha-input-search>`;

    const controls = html`
      <ha-date-range-nav
        .startDate=${this._range[0]}
        .endDate=${this._range[1]}
        extended-presets
        time-picker
        @value-changed=${this._dateRangeChanged}
      ></ha-date-range-nav>
      <ha-icon-button
        .label=${localize("ui.common.refresh")}
        .path=${mdiRefresh}
        .disabled=${this._loading}
        @click=${this._refresh}
      ></ha-icon-button>
    `;

    return html`
      <div class="table-with-toolbars">
        ${
          this.narrow
            ? html`<div class="search-toolbar">${searchBar}</div>`
            : nothing
        }
        ${
          this._error
            ? html`<ha-alert alert-type="error">
                ${localize(
                  "ui.panel.config.tools.tabs.action_history.load_failed",
                  { error: this._error }
                )}
              </ha-alert>`
            : nothing
        }
        <ha-data-table
          .narrow=${this.narrow}
          .loading=${this._loading}
          .columns=${this._columns(
            localize,
            this.narrow,
            this.hass.locale,
            this.hass.config
          )}
          .data=${this._displayRows()}
          .noDataText=${localize(
            "ui.panel.config.tools.tabs.action_history.no_actions"
          )}
          .filter=${this._filter}
          clickable
          @row-click=${this._rowClicked}
        >
          ${
            this.narrow
              ? html`<div slot="header"></div>
                  <div slot="header-row" class="narrow-header-row">
                    ${controls}
                  </div>`
              : html`<div slot="header">
                  <div class="table-header">${searchBar}${controls}</div>
                </div>`
          }
        </ha-data-table>
      </div>
    `;
  }

  private async _refresh() {
    const [start, end] = this._range;
    const fetch = getLogbookActionCalls(
      this.hass,
      start.toISOString(),
      end.toISOString()
    );
    this._fetch = fetch;
    this._loading = true;
    this._error = undefined;
    try {
      const [calls, traceContexts] = await Promise.all([
        fetch,
        isComponentLoaded(this.hass.config, "trace")
          ? loadTraceContexts(this.hass).catch(() => this._traceContexts)
          : this._traceContexts,
      ]);
      if (this._fetch === fetch) {
        this._calls = calls;
        this._traceContexts = traceContexts;
      }
    } catch (err: unknown) {
      if (this._fetch === fetch) {
        this._calls = [];
        this._error = (err as { message?: string }).message ?? String(err);
      }
    } finally {
      if (this._fetch === fetch) {
        this._loading = false;
      }
    }
  }

  private async _fetchUsers() {
    const users = await fetchUsers(this.hass.callWS);
    const userIdToName: Record<string, string> = {};
    const systemUserIds = new Set<string>();
    for (const user of users) {
      userIdToName[user.id] = user.name;
      if (user.system_generated) {
        systemUserIds.add(user.id);
      }
    }
    // A person names their user, like in the activity panel.
    for (const stateObj of Object.values(this.hass.states)) {
      if (
        computeStateDomain(stateObj) === "person" &&
        stateObj.attributes.user_id
      ) {
        userIdToName[stateObj.attributes.user_id] =
          this.hass.formatEntityName(stateObj);
      }
    }
    this._userIdToName = userIdToName;
    this._systemUserIds = systemUserIds;
  }

  private _dateRangeChanged(
    ev: HASSDomEvent<{ value: { startDate: Date; endDate: Date } }>
  ) {
    this._range = [ev.detail.value.startDate, ev.detail.value.endDate];
    this._refresh();
  }

  private _handleSearchChange(ev: HASSDomTargetEvent<HaInputSearch>) {
    this._filter = ev.target.value ?? "";
  }

  private _rowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const row = this._displayRows()[Number(ev.detail.id)];
    showActionCallDetailDialog(this, {
      call: row.call,
      name: row.name,
      cause: row.cause,
      user: row.user,
      traceUrl: computeTraceLink(this._traceContexts, row.call.context_id),
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
          height: 100%;
        }

        .table-with-toolbars {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        ha-alert {
          display: block;
          margin: var(--ha-space-2) var(--ha-space-4) 0;
        }

        ha-data-table {
          width: 100%;
          flex-grow: 1;
          --data-table-border-width: 0;
          /* Same insets as the content padding of ha-top-app-bar-fixed */
          --data-table-inset-right: var(--safe-area-inset-right, 0px);
        }
        :host([narrow]) ha-data-table {
          --data-table-inset-left: var(--safe-area-inset-left, 0px);
        }

        .table-header {
          display: flex;
          align-items: center;
          height: 56px;
          width: 100%;
          padding-left: calc(
            var(--ha-space-4) + var(--data-table-inset-left, 0px)
          );
          padding-right: calc(
            var(--ha-space-4) + var(--data-table-inset-right, 0px)
          );
          gap: var(--ha-space-4);
          box-sizing: border-box;
          background: var(--primary-background-color);
          border-bottom: 1px solid var(--divider-color);
        }

        ha-input-search {
          flex: 1;
        }

        .search-toolbar {
          display: flex;
          align-items: center;
          padding: var(--ha-space-2) var(--ha-space-4) 0;
        }

        .narrow-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--ha-space-4);
          padding-left: calc(
            var(--ha-space-4) + var(--data-table-inset-left, 0px)
          );
          padding-right: calc(
            var(--ha-space-4) + var(--data-table-inset-right, 0px)
          );
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "tools-action-history": HaPanelToolsActionHistory;
  }
}
