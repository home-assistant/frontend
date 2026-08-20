import {
  mdiDotsVertical,
  mdiDownload,
  mdiFilterRemove,
  mdiRefresh,
  mdiTextBoxOutline,
  mdiTuneVariant,
} from "@mdi/js";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fromUnixTime } from "date-fns";
import { ensureArray } from "../../common/array/ensure-array";
import { storage } from "../../common/decorators/storage";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import { constructUrlCurrentPath } from "../../common/url/construct-url";
import {
  createHistoryLogbookUrl,
  decodeHistoryLogbookQueryParams,
  historyLogbookTargetFromQueryParams,
  historyLogbookTargetsEqual,
} from "../../common/url/history-logbook-query-params";
import {
  extractSearchParamsObject,
  removeSearchParam,
} from "../../common/url/search-params";
import { deepEqual } from "../../common/util/deep-equal";
import { shallowEqual } from "../../common/util/shallow-equal";
import "../../components/date-picker/ha-date-range-nav";
import "../../components/ha-button";
import "../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../components/ha-dropdown";
import "../../components/ha-dropdown-item";
import "../../components/ha-empty-state";
import "../../components/ha-filter-pane-chip";
import "../../components/ha-filter-pane";
import "../../components/ha-icon-button";
import {
  applySourceFilters,
  countSourceFilters,
  countTargets,
} from "../../components/ha-sources-picker";
import type { SourceFilters } from "../../components/ha-sources-picker";
import "../../components/ha-top-app-bar-fixed";
import type { HaEntityPickerEntityFilterFunc } from "../../data/entity/entity";
import type { EntitySources } from "../../data/entity/entity_sources";
import { fetchEntitySourcesWithCache } from "../../data/entity/entity_sources";
import { filterLogbookCompatibleEntities } from "../../data/logbook";
import { resolveEntityIDs } from "../../data/selector";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "./ha-logbook";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import { csvDownload, csvSafeString } from "../../util/csv";

const EMPTY_STATES: HomeAssistant["states"] = {};

interface LogbookState {
  time: { range: [Date, Date] };
  targetPickerValue: HassServiceTarget;
}

@customElement("ha-panel-logbook")
export class HaPanelLogbook extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() _time: { range: [Date, Date] };

  @state() _entityIds?: string[];

  @state()
  private _showBack?: boolean;

  @state() private _filters: SourceFilters = {};

  @state() private _showSources?: boolean;

  @state() private _entitySources?: EntitySources;

  @state() private _targetPickerValue: HassServiceTarget = {};

  // Remembers the last user-picked selection as a fallback for visits without
  // URL params. Kept separate from _targetPickerValue because localStorage is
  // synced across tabs and would leak one tab's selection into the others.
  @storage({
    key: "logbookPickedValue",
    state: false,
    subscribe: false,
  })
  private _storedTargetPickerValue?: HassServiceTarget;

  @storage({
    key: "logbookSourceFilters",
    state: false,
    subscribe: false,
  })
  private _storedFilters?: SourceFilters;

  public constructor() {
    super();
    this._time = this._defaultState.time;
  }

  protected render() {
    const entityIds = this._getEntityIds();
    const filterCount = countSourceFilters(this._filters);
    const sourceCount = countTargets(this._targetPickerValue) + filterCount;
    const sourcesLabel = sourceCount
      ? this.hass.localize("ui.panel.logbook.sources_count", {
          count: entityIds?.length ?? 0,
        })
      : this.hass.localize("ui.panel.logbook.sources");

    return html`
      <ha-top-app-bar-fixed
        .narrow=${this.narrow}
        .backButton=${!!this._showBack}
      >
        <div slot="title">${this.hass.localize("panel.logbook")}</div>

        <ha-dropdown slot="actionItems" @wa-select=${this._handleMenuAction}>
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>

          <ha-dropdown-item value="refresh">
            ${this.hass.localize("ui.common.refresh")}
            <ha-svg-icon slot="icon" .path=${mdiRefresh}></ha-svg-icon>
          </ha-dropdown-item>

          <ha-dropdown-item value="download">
            ${this.hass.localize("ui.panel.logbook.download_data")}
            <ha-svg-icon slot="icon" .path=${mdiDownload}></ha-svg-icon>
          </ha-dropdown-item>

          <ha-dropdown-item value="reset" .disabled=${this._isDefaultState()}>
            ${this.hass.localize("ui.common.reset")}
            <ha-svg-icon slot="icon" .path=${mdiFilterRemove}></ha-svg-icon>
          </ha-dropdown-item>
        </ha-dropdown>

        <div class="content">
          <div class="main">
            ${
              this._sourcesShown()
                ? html`<ha-filter-pane
                    .narrow=${this.narrow}
                    .label=${sourcesLabel}
                    .path=${mdiTuneVariant}
                    .count=${sourceCount}
                    .resultCount=${entityIds?.length}
                    @close-filter-pane=${this._closeSources}
                    @clear-filter=${this._clearSources}
                  >
                    <ha-sources-picker
                      .hass=${this.hass}
                      .value=${this._targetPickerValue}
                      .filters=${this._filters}
                      .entityFilter=${this._filterFunc}
                      .description=${this.hass.localize(
                        "ui.panel.logbook.no_targets"
                      )}
                      @value-changed=${this._targetsChanged}
                      @source-filters-changed=${this._filtersChanged}
                    ></ha-sources-picker>
                  </ha-filter-pane>`
                : nothing
            }
            <div class="content-column">
              <div class="toolbar">
                ${
                  this._sourcesShown() && !this.narrow
                    ? nothing
                    : html`<ha-filter-pane-chip
                        .label=${sourcesLabel}
                        .path=${mdiTuneVariant}
                        .count=${filterCount}
                        .active=${sourceCount > 0}
                        @click=${this._toggleSources}
                      ></ha-filter-pane-chip>`
                }
                <ha-date-range-nav
                  .startDate=${this._time.range[0]}
                  .endDate=${this._time.range[1]}
                  @value-changed=${this._dateRangeChanged}
                  time-picker
                ></ha-date-range-nav>
              </div>

              <ha-logbook
                .hass=${this.hass}
                .time=${this._time}
                .entityIds=${entityIds}
                .narrow=${this.narrow}
                show-cause
                virtualize
              >
                ${
                  sourceCount > 0
                    ? html`<ha-empty-state
                        slot="empty"
                        .icon=${mdiTextBoxOutline}
                        .heading=${this.hass.localize(
                          "ui.panel.logbook.no_results_title"
                        )}
                        .description=${this.hass.localize(
                          "ui.panel.logbook.no_results"
                        )}
                      >
                        <ha-button
                          appearance="plain"
                          @click=${this._openSources}
                        >
                          ${this.hass.localize(
                            "ui.panel.logbook.change_sources"
                          )}
                        </ha-button>
                      </ha-empty-state>`
                    : nothing
                }
              </ha-logbook>
            </div>
          </div>
        </div>
      </ha-top-app-bar-fixed>
    `;
  }

  private _sourcesShown(): boolean {
    return this._showSources ?? !this.narrow;
  }

  private _toggleSources() {
    this._showSources = !this._sourcesShown();
  }

  private _openSources() {
    this._showSources = true;
  }

  private _closeSources() {
    this._showSources = false;
  }

  private _filtersChanged(
    ev: HASSDomEvent<HASSDomEvents["source-filters-changed"]>
  ) {
    this._filters = ev.detail.value;
    this._storedFilters = this._filters;
  }

  private _clearSources() {
    this._filters = {};
    this._storedFilters = this._filters;
    this._targetPickerValue = {};
    this._storedTargetPickerValue = this._targetPickerValue;
    this._updatePath();
  }

  private _filterFunc: HaEntityPickerEntityFilterFunc = (entity) =>
    filterLogbookCompatibleEntities(entity);

  protected willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);

    if (this.hasUpdated) {
      return;
    }

    this._applyURLParams();
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("title");
    fetchEntitySourcesWithCache(this.hass).then((sources) => {
      this._entitySources = sources;
    });

    const searchParams = extractSearchParamsObject();
    if (searchParams.back === "1" && history.length > 1) {
      this._showBack = true;
      navigate(constructUrlCurrentPath(removeSearchParam("back")), {
        replace: true,
      });
    }
  }

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("location-changed", this._locationChanged);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("location-changed", this._locationChanged);
  }

  private _locationChanged = () => {
    this._applyURLParams();
  };

  /** The entities to show activity for, or undefined for all of them. */
  private _getEntityIds(): string[] | undefined {
    const hasTargets = countTargets(this._targetPickerValue) > 0;
    const targetEntities = hasTargets
      ? this.__filterTargetEntityIds(
          this.__resolveTargetEntityIds(
            this._targetPickerValue,
            this.hass.entities,
            this.hass.devices,
            this.hass.areas
          ),
          this._targetPickerValue.entity_id,
          this.hass.entities,
          this.hass.states
        )
      : undefined;

    if (!countSourceFilters(this._filters)) {
      return targetEntities;
    }

    return this.__filterEntityIds(
      targetEntities ?? this.__logbookEntityIds(this.hass.states),
      this._filters,
      // Only the device class filter reads the states.
      this._filters.deviceClasses?.length ? this.hass.states : EMPTY_STATES,
      this.hass.entities,
      this._entitySources
    );
  }

  private __resolveTargetEntityIds = memoizeOne(
    (
      targetPickerValue: HassServiceTarget,
      entities: HomeAssistant["entities"],
      devices: HomeAssistant["devices"],
      areas: HomeAssistant["areas"]
    ): string[] =>
      resolveEntityIDs(this.hass, targetPickerValue, entities, devices, areas)
  );

  // Same rules as the target picker, so that the chip and the picker agree.
  private __filterTargetEntityIds = memoizeOne(
    (
      entityIds: string[],
      pickedEntityIds: string | string[] | undefined,
      entities: HomeAssistant["entities"],
      states: HomeAssistant["states"]
    ): string[] => {
      const picked = new Set(ensureArray(pickedEntityIds));
      return this._stableEntityIds(
        entityIds.filter((entityId) => {
          if (picked.has(entityId)) {
            return true;
          }
          const stateObj = states[entityId];
          return (
            !entities[entityId]?.hidden &&
            stateObj &&
            filterLogbookCompatibleEntities(stateObj)
          );
        })
      );
    }
  );

  private __logbookEntityIds = memoizeOne(
    (states: HomeAssistant["states"]): string[] =>
      this._stableEntityIds(
        Object.values(states)
          .filter((stateObj) => filterLogbookCompatibleEntities(stateObj))
          .map((stateObj) => stateObj.entity_id)
      )
  );

  private __filterEntityIds = memoizeOne(applySourceFilters);

  private _lastEntityIds?: string[];

  // A list keyed on the states must keep its identity or ha-logbook resubscribes.
  private _stableEntityIds(entityIds: string[]): string[] {
    if (this._lastEntityIds && shallowEqual(this._lastEntityIds, entityIds)) {
      return this._lastEntityIds;
    }
    this._lastEntityIds = entityIds;
    return entityIds;
  }

  private _applyURLParams() {
    const queryParams = decodeHistoryLogbookQueryParams(
      extractSearchParamsObject()
    );
    const targetPickerValue = historyLogbookTargetFromQueryParams(queryParams);
    if (targetPickerValue) {
      this._targetPickerValue = targetPickerValue;
    } else if (!this.hasUpdated && this._storedTargetPickerValue) {
      this._targetPickerValue = this._storedTargetPickerValue;
    }

    // A target linked from another page must not be narrowed by the filters.
    if (
      targetPickerValue &&
      !historyLogbookTargetsEqual(
        targetPickerValue,
        this._storedTargetPickerValue ?? {}
      )
    ) {
      this._filters = {};
    } else if (!this.hasUpdated && this._storedFilters) {
      this._filters = this._storedFilters;
    }

    if (queryParams.start_date || queryParams.end_date) {
      const startDate = queryParams.start_date ?? this._time.range[0];
      const endDate = queryParams.end_date ?? this._time.range[1];

      // Only set if date has changed.
      if (
        startDate.getTime() !== this._time.range[0].getTime() ||
        endDate.getTime() !== this._time.range[1].getTime()
      ) {
        this._time = {
          range: [
            queryParams.start_date ?? this._time.range[0],
            queryParams.end_date ?? this._time.range[1],
          ],
        };
      }
    }
  }

  private _dateRangeChanged(ev) {
    const startDate = ev.detail.value.startDate;
    const endDate = ev.detail.value.endDate;
    this._time = {
      range: [startDate, endDate],
    };
    this._updatePath();
  }

  private _targetsChanged(ev) {
    this._targetPickerValue = ev.detail.value || {};
    this._storedTargetPickerValue = this._targetPickerValue;
    this._updatePath();
  }

  private _updatePath() {
    navigate(
      createHistoryLogbookUrl(
        "/logbook",
        this._targetPickerValue,
        this._time.range[0],
        this._time.range[1]
      ),
      { replace: true }
    );
  }

  private get _defaultState(): LogbookState {
    const start = new Date();
    start.setHours(start.getHours() - 1, 0, 0, 0);

    const end = new Date();
    end.setHours(end.getHours() + 2, 0, 0, 0);

    return {
      time: { range: [start, end] },
      targetPickerValue: {},
    };
  }

  private _isDefaultState(): boolean {
    return (
      !countSourceFilters(this._filters) &&
      deepEqual(
        { time: this._time, targetPickerValue: this._targetPickerValue },
        this._defaultState
      )
    );
  }

  private _resetLogbook() {
    const defaultState = this._defaultState;
    this._time = defaultState.time;
    this._targetPickerValue = defaultState.targetPickerValue;
    this._storedTargetPickerValue = undefined;
    this._filters = {};
    this._storedFilters = undefined;
    navigate("/logbook", { replace: true });
  }

  private _refreshLogbook() {
    this.shadowRoot!.querySelector("ha-logbook")?.refresh();
  }

  private async _handleMenuAction(ev: HaDropdownSelectEvent) {
    const action = ev.detail.item.value;
    switch (action) {
      case "download":
        this._downloadData();
        break;
      case "refresh":
        this._refreshLogbook();
        break;
      case "reset":
        this._resetLogbook();
        break;
    }
  }

  private _downloadData() {
    const data =
      this.shadowRoot!.querySelector("ha-logbook")?.getEntries() || [];

    if (data.length === 0) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.logbook.download_data_error"),
        text: this.hass.localize("ui.panel.logbook.error_no_data"),
        warning: true,
      });
      return;
    }

    const headers = [
      "time",
      "entity_id",
      "state",
      "event_type",
      "name",
      "message",
      "source",
      "context_id",
      "context_user_id",
      "context_event_type",
      "context_domain",
      "context_service",
      "context_entity_id",
      "context_state",
      "context_source",
    ];
    const csv: string[][] = [headers];

    for (const d of data) {
      const time = fromUnixTime(d.when).toISOString();
      csv.push([
        time,
        d.entity_id || "",
        csvSafeString(d.state),
        csvSafeString(d.attributes?.event_type),
        csvSafeString(d.name),
        csvSafeString(d.message),
        csvSafeString(d.source),
        d.context_id || "",
        d.context_user_id || "",
        csvSafeString(d.context_event_type),
        d.context_domain || "",
        d.context_service || "",
        d.context_entity_id || "",
        csvSafeString(d.context_state),
        d.context_source || "",
      ]);
    }
    csvDownload(csv, "activity.csv");
  }

  static get styles() {
    return [
      haStyle,
      css`
        :host {
          --ha-generic-picker-width: min(400px, calc(100vw - 32px));
          --ha-generic-picker-max-width: 400px;
        }

        .content {
          display: flex;
          flex-direction: column;
          height: calc(
            100vh - var(--header-height, 0px) - var(
                --safe-area-inset-top,
                0px
              ) - var(--safe-area-inset-bottom, 0px)
          );
          box-sizing: border-box;
          overflow: hidden;
        }

        .main {
          display: flex;
          flex: 1;
          min-height: 0;
        }

        .content-column {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }

        .toolbar {
          display: flex;
          align-items: center;
          gap: var(--ha-space-4);
          box-sizing: border-box;
          height: 56px;
          flex-shrink: 0;
          padding: 0 16px;
          background: var(--primary-background-color);
          border-bottom: 1px solid var(--divider-color);
          direction: var(--direction);
          overflow-x: auto;
          scrollbar-width: none;
        }

        .toolbar::-webkit-scrollbar {
          display: none;
        }

        .toolbar > * {
          flex-shrink: 0;
        }

        ha-logbook {
          flex: 1;
          min-height: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-logbook": HaPanelLogbook;
  }
}
