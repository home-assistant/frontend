import {
  mdiChartBoxOutline,
  mdiDotsVertical,
  mdiDownload,
  mdiImagePlus,
  mdiTuneVariant,
} from "@mdi/js";
import { differenceInHours } from "date-fns";
import type {
  HassServiceTarget,
  UnsubscribeFunc,
} from "home-assistant-js-websocket/dist/types";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { storage } from "../../common/decorators/storage";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { navigate } from "../../common/navigate";
import { constructUrlCurrentPath } from "../../common/url/construct-url";
import { shallowEqual } from "../../common/util/shallow-equal";
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
import { MIN_TIME_BETWEEN_UPDATES } from "../../components/chart/ha-chart-base";
import "../../components/chart/state-history-charts";
import type { StateHistoryCharts } from "../../components/chart/state-history-charts";
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
import "../../components/ha-spinner";
import "../../components/ha-top-app-bar-fixed";
import type { EntitySources } from "../../data/entity/entity_sources";
import { fetchEntitySourcesWithCache } from "../../data/entity/entity_sources";
import type { HistoryResult } from "../../data/history";
import {
  computeHistory,
  convertStatisticsToHistory,
  mergeHistoryResults,
  subscribeHistory,
} from "../../data/history";
import { fetchStatistics } from "../../data/recorder";
import { resolveEntityIDs } from "../../data/selector";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import { haStyle, haStyleScrollbar } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { addEntitiesToLovelaceView } from "../lovelace/editor/add-entities-to-view";
import { csvSafeString, csvDownload } from "../../util/csv";

const EMPTY_STATES: HomeAssistant["states"] = {};

@customElement("ha-panel-history")
class HaPanelHistory extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  @property({ reflect: true, type: Boolean }) public narrow = false;

  @property({ reflect: true, type: Boolean }) rtl = false;

  @state() private _startDate: Date;

  @state() private _endDate: Date;

  @state() private _targetPickerValue: HassServiceTarget = {};

  // Remembers the last user-picked selection as a fallback for visits without
  // URL params. Kept separate from _targetPickerValue because localStorage is
  // synced across tabs and would leak one tab's selection into the others.
  @storage({
    key: "historyPickedValue",
    state: false,
    subscribe: false,
  })
  private _storedTargetPickerValue?: HassServiceTarget;

  @state() private _isLoading = false;

  @state() private _filters: SourceFilters = {};

  @storage({
    key: "historySourceFilters",
    state: false,
    subscribe: false,
  })
  private _storedFilters?: SourceFilters;

  @state() private _showSources?: boolean;

  @state() private _entitySources?: EntitySources;

  @state() private _stateHistory?: HistoryResult;

  private _mungedStateHistory?: HistoryResult;

  @state() private _statisticsHistory?: HistoryResult;

  @state()
  private _showBack?: boolean;

  @query("state-history-charts")
  private _stateHistoryCharts?: StateHistoryCharts;

  private _subscribed?: Promise<UnsubscribeFunc | undefined>;

  private _fetchedEntityIds?: string[];

  private _statsFetchId = 0;

  private _interval?: number;

  public constructor() {
    super();

    const start = new Date();
    start.setHours(start.getHours() - 1, 0, 0, 0);
    this._startDate = start;

    const end = new Date();
    end.setHours(end.getHours() + 2, 0, 0, 0);
    this._endDate = end;
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._getHistory();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeHistory();
  }

  protected render() {
    const entityIds = this._getEntityIds();
    const targetCount = countTargets(this._targetPickerValue);
    const filterCount = countSourceFilters(this._filters);
    const sourceCount = targetCount + filterCount;
    const hasTargets = targetCount > 0;
    // A target whose entities are all filtered out fetches nothing.
    const loading =
      this._isLoading || (entityIds.length > 0 && !this._mungedStateHistory);
    const hasResults =
      !!this._mungedStateHistory &&
      (this._mungedStateHistory.line.length > 0 ||
        this._mungedStateHistory.timeline.length > 0);
    const sourcesLabel = sourceCount
      ? this.hass.localize("ui.panel.history.sources_count", {
          count: entityIds.length,
        })
      : this.hass.localize("ui.panel.history.sources");

    return html`
      <ha-top-app-bar-fixed
        .narrow=${this.narrow}
        .backButton=${!!this._showBack}
      >
        <h1 class="page-title" slot="title">
          ${this.hass.localize("panel.history")}
        </h1>
        <ha-dropdown slot="actionItems" @wa-select=${this._handleMenuAction}>
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>

          <ha-dropdown-item value="download" .disabled=${this._isLoading}>
            ${this.hass.localize("ui.panel.history.download_data")}
            <ha-svg-icon slot="icon" .path=${mdiDownload}></ha-svg-icon>
          </ha-dropdown-item>

          <ha-dropdown-item value="add-card" .disabled=${this._isLoading}>
            ${this.hass.localize("ui.panel.history.add_card")}
            <ha-svg-icon slot="icon" .path=${mdiImagePlus}></ha-svg-icon>
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
                    .resultCount=${hasTargets ? entityIds.length : undefined}
                    .disabled=${this._isLoading}
                    @close-filter-pane=${this._closeSources}
                    @clear-filter=${this._clearSources}
                  >
                    <ha-sources-picker
                      .hass=${this.hass}
                      .value=${this._targetPickerValue}
                      .filters=${this._filters}
                      .disabled=${this._isLoading}
                      .description=${this.hass.localize(
                        "ui.panel.history.no_targets"
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
                        .disabled=${this._isLoading}
                        @click=${this._toggleSources}
                      ></ha-filter-pane-chip>`
                }
                <ha-date-range-nav
                  .disabled=${this._isLoading}
                  .startDate=${this._startDate}
                  .endDate=${this._endDate}
                  extended-presets
                  time-picker
                  @value-changed=${this._dateRangeChanged}
                ></ha-date-range-nav>
              </div>
              <div class="results ha-scrollbar">
                ${
                  loading
                    ? html`<div class="progress-wrapper">
                        <ha-spinner></ha-spinner>
                      </div>`
                    : !hasTargets || !hasResults
                      ? this._renderEmptyState(hasTargets)
                      : html`
                          <state-history-charts
                            .hass=${this.hass}
                            .historyData=${this._mungedStateHistory}
                            .startTime=${this._startDate}
                            .endTime=${this._endDate}
                            .narrow=${this.narrow}
                            inside-labels
                            sync-charts
                          >
                          </state-history-charts>
                        `
                }
              </div>
            </div>
          </div>
        </div>
      </ha-top-app-bar-fixed>
    `;
  }

  private _renderEmptyState(hasTargets: boolean) {
    return html`
      <ha-empty-state
        .icon=${mdiChartBoxOutline}
        .heading=${this.hass.localize(
          hasTargets
            ? "ui.panel.history.no_results_title"
            : "ui.panel.history.start_search_title"
        )}
        .description=${this.hass.localize(
          hasTargets
            ? "ui.panel.history.no_results"
            : "ui.panel.history.start_search"
        )}
      >
        <ha-button appearance="plain" @click=${this._openSources}>
          ${this.hass.localize(
            hasTargets
              ? "ui.panel.history.change_sources"
              : "ui.panel.history.add_targets"
          )}
        </ha-button>
      </ha-empty-state>
    `;
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (
      changedProps.has("_stateHistory") ||
      changedProps.has("_statisticsHistory") ||
      changedProps.has("_startDate") ||
      changedProps.has("_endDate") ||
      changedProps.has("_targetPickerValue")
    ) {
      if (this._statisticsHistory && this._stateHistory) {
        this._mungedStateHistory = mergeHistoryResults(
          this._stateHistory,
          this._statisticsHistory
        );
      } else {
        this._mungedStateHistory =
          this._stateHistory || this._statisticsHistory;
      }
    }

    if (this.hasUpdated) {
      return;
    }

    const queryParams = decodeHistoryLogbookQueryParams(
      extractSearchParamsObject()
    );
    const urlTarget = historyLogbookTargetFromQueryParams(queryParams);
    const initialValue = urlTarget ?? this._storedTargetPickerValue;
    if (initialValue) {
      this._targetPickerValue = initialValue;
    }
    // A target linked from another page must not be narrowed by stored filters.
    if (
      this._storedFilters &&
      (!urlTarget ||
        historyLogbookTargetsEqual(
          urlTarget,
          this._storedTargetPickerValue ?? {}
        ))
    ) {
      this._filters = this._storedFilters;
    }
    if (queryParams.start_date) {
      this._startDate = queryParams.start_date;
    }
    if (queryParams.end_date) {
      this._endDate = queryParams.end_date;
    }
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
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

  protected updated(changedProps: PropertyValues) {
    if (
      changedProps.has("_startDate") ||
      changedProps.has("_endDate") ||
      !shallowEqual(this._getEntityIds(), this._fetchedEntityIds)
    ) {
      this._getHistory();
      this._getStats();
    }
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

  private async _getStats() {
    const statisticIds = this._getEntityIds();
    this._fetchedEntityIds = statisticIds;
    const fetchId = ++this._statsFetchId;

    if (statisticIds.length === 0) {
      this._statisticsHistory = undefined;
      return;
    }

    const statsStartDate = new Date(this._startDate);
    // History uses the end datapoint of the statistic, so if we want the
    // graph to start at 7AM, need to fetch the statistic from 6AM.
    statsStartDate.setHours(statsStartDate.getHours() - 1);

    let statistics;
    try {
      statistics = await fetchStatistics(
        this.hass!,
        statsStartDate,
        this._endDate,
        statisticIds,
        "hour",
        undefined,
        ["mean", "state"]
      );
    } catch (_err) {
      return;
    }

    if (fetchId !== this._statsFetchId) {
      return;
    }

    this._statisticsHistory = convertStatisticsToHistory(
      this.hass!,
      statistics,
      statisticIds,
      true
    );
  }

  private async _getHistory() {
    const entityIds = this._getEntityIds();
    this._fetchedEntityIds = entityIds;

    if (entityIds.length === 0) {
      // The running subscription would keep pushing the previous entities.
      this._unsubscribeHistory();
      this._stateHistory = undefined;
      this._isLoading = false;
      return;
    }

    this._isLoading = true;

    if (this._subscribed) {
      this._unsubscribeHistory();
    }

    const now = new Date();

    this._subscribed = subscribeHistory(
      this.hass,
      (history) => {
        this._isLoading = false;
        this._stateHistory = computeHistory(
          this.hass,
          history,
          entityIds,
          this.hass.localize,
          true
        );
      },
      this._startDate,
      this._endDate,
      entityIds
    );
    this._subscribed.catch(() => {
      this._isLoading = false;
      this._stateHistory = { line: [], timeline: [] };
      this._unsubscribeHistory();
    });
    if (this._endDate > now) {
      this._setRedrawTimer();
    }
  }

  private _setRedrawTimer() {
    clearInterval(this._interval);
    const now = new Date();
    const end = this._endDate > now ? now : this._endDate;
    const timespan = differenceInHours(end, this._startDate);
    this._interval = window.setInterval(
      () => this._stateHistoryCharts?.requestUpdate(),
      // if timespan smaller than 1 hour, update every 10 seconds, smaller than 5 hours, redraw every minute, otherwise every 5 minutes
      timespan < 2
        ? 10000
        : timespan < 10
          ? 60 * 1000
          : MIN_TIME_BETWEEN_UPDATES
    );
  }

  private _unsubscribeHistory() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub?.()).catch(() => undefined);
      this._subscribed = undefined;
    }
  }

  private _getEntityIds(): string[] {
    return this.__filterEntityIds(
      this.__resolveTargetEntityIds(
        this._targetPickerValue,
        this.hass.entities,
        this.hass.devices,
        this.hass.areas
      ),
      this._filters,
      // Only the device class filter reads the states.
      this._filters.deviceClasses?.length ? this.hass.states : EMPTY_STATES,
      this.hass.entities,
      this._entitySources
    );
  }

  // Same rules as the target picker, so that the chip and the picker agree.
  private __resolveTargetEntityIds = memoizeOne(
    (
      targetPickerValue: HassServiceTarget,
      entities: HomeAssistant["entities"],
      devices: HomeAssistant["devices"],
      areas: HomeAssistant["areas"]
    ): string[] => {
      const picked = new Set(ensureArray(targetPickerValue.entity_id));
      return resolveEntityIDs(
        this.hass,
        targetPickerValue,
        entities,
        devices,
        areas
      ).filter(
        (entityId) => picked.has(entityId) || !entities[entityId]?.hidden
      );
    }
  );

  private __filterEntityIds = memoizeOne(applySourceFilters);

  private _dateRangeChanged(ev) {
    this._startDate = ev.detail.value.startDate;
    this._endDate = ev.detail.value.endDate;
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
        "/history",
        this._targetPickerValue,
        this._startDate,
        this._endDate
      ),
      { replace: true }
    );
  }

  private async _handleMenuAction(ev: HaDropdownSelectEvent) {
    const action = ev.detail.item.value;
    switch (action) {
      case "download":
        this._downloadHistory();
        break;
      case "add-card":
        this._suggestCard();
        break;
    }
  }

  private _downloadHistory() {
    // Make a copy because getEntityIDs is memoized and sort works in-place
    const entities = [...this._getEntityIds()].sort();
    if (entities.length === 0 || !this._mungedStateHistory) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.history.download_data_error"),
        text: this.hass.localize("ui.panel.history.error_no_data"),
        warning: true,
      });
      return;
    }

    const headers = ["entity_id", "state", "last_changed"];
    const csv: string[][] = [[]]; // headers will be replaced later.
    const processedDomainAttributes = new Set<string>();
    const domainAttributes: Record<string, Record<string, number>> = {
      climate: {
        current_temperature: 0,
        hvac_action: 0,
        target_temp_high: 0,
        target_temp_low: 0,
        temperature: 0,
      },
      humidifier: {
        action: 0,
        current_humidity: 0,
        humidity: 0,
      },
      water_heater: {
        current_temperature: 0,
        operation_mode: 0,
        temperature: 0,
      },
    };
    const formatDate = (number) => new Date(number).toISOString();

    for (const line of this._mungedStateHistory.line) {
      for (const entity of line.data) {
        const entityId = entity.entity_id;
        const domain = computeDomain(entityId);
        const extraAttributes = domainAttributes[domain];

        // Add extra attributes to headers if needed
        if (extraAttributes && !processedDomainAttributes.has(domain)) {
          processedDomainAttributes.add(domain);
          let index = headers.length;
          for (const attr of Object.keys(extraAttributes)) {
            headers.push(attr);
            extraAttributes[attr] = index;
            index += 1;
          }
        }

        if (entity.statistics) {
          for (const s of entity.statistics) {
            csv.push([entityId, s.state, formatDate(s.last_changed)]);
          }
        }

        for (const s of entity.states) {
          const lastChanged = formatDate(s.last_changed);
          const data = [entityId, s.state, lastChanged];

          if (s.attributes && extraAttributes) {
            const attrs = s.attributes;
            for (const [attr, index] of Object.entries(extraAttributes)) {
              if (attr in attrs) {
                data[index] = attrs[attr];
              }
            }
          }

          csv.push(data);
        }
      }
    }
    for (const timeline of this._mungedStateHistory.timeline) {
      const entityId = timeline.entity_id;
      for (const s of timeline.data) {
        csv.push([
          entityId,
          csvSafeString(s.state),
          formatDate(s.last_changed),
        ]);
      }
    }
    csv[0] = headers;
    csvDownload(csv, "history.csv");
  }

  private _suggestCard() {
    const entities = this._getEntityIds();
    if (entities.length === 0 || !this._mungedStateHistory) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.history.add_card_error"),
        text: this.hass.localize("ui.panel.history.error_no_data"),
        warning: true,
      });
      return;
    }

    // If you pick things like "This week", the end date can be in the future
    const endDateTime = Math.min(this._endDate.getTime(), Date.now());
    const cards = [
      {
        title: this.hass.localize("panel.history"),
        type: "history-graph",
        hours_to_show: Math.round(
          (endDateTime - this._startDate.getTime()) / 1000 / 60 / 60
        ),
        entities,
      },
    ];
    addEntitiesToLovelaceView(
      this,
      this.hass,
      cards,
      {
        title: this.hass.localize("panel.history"),
        cards,
      },
      entities
    );
  }

  static get styles() {
    return [
      haStyle,
      haStyleScrollbar,
      css`
        ha-top-app-bar-fixed {
          height: 100vh;
          overflow-x: hidden;
          overflow-y: visible;
        }

        .page-title {
          font-size: inherit;
          margin: inherit;
          line-height: inherit;
        }

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

        .results {
          flex: 1;
          min-width: 0;
          overflow: hidden auto;
          padding: 16px 8px;
        }

        /* Line the charts up with the toolbar when there are no axis labels. */
        :host([narrow]) .results {
          padding-inline: 16px;
        }

        .progress-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          flex-direction: column;
          padding: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-history": HaPanelHistory;
  }
}
