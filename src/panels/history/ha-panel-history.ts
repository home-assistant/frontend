import {
  mdiChartBoxOutline,
  mdiChevronLeft,
  mdiChevronRight,
  mdiDotsVertical,
  mdiDownload,
  mdiFilterVariantRemove,
  mdiHomeClock,
  mdiImagePlus,
  mdiRestart,
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
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { shiftDateRange } from "../../common/datetime/calc_date";
import { formatDateVeryShort } from "../../common/datetime/format_date";
import { formatTime } from "../../common/datetime/format_time";
import { storage } from "../../common/decorators/storage";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { mainWindow } from "../../common/dom/get_main_window";
import { computeDomain } from "../../common/entity/compute_domain";
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
import { shallowEqual } from "../../common/util/shallow-equal";
import { MIN_TIME_BETWEEN_UPDATES } from "../../components/chart/ha-chart-base";
import "../../components/chart/ha-chart-zoom-slider";
import "../../components/chart/state-history-charts";
import type { StateHistoryCharts } from "../../components/chart/state-history-charts";
import "../../components/date-picker/ha-date-range-picker";
import type { HaDateRangePicker } from "../../components/date-picker/ha-date-range-picker";
import "../../components/ha-button";
import "../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../components/ha-dropdown";
import "../../components/ha-dropdown-item";
import "../../components/ha-empty-state";
import "../../components/ha-filter-pane";
import "../../components/ha-filter-pane-chip";
import "../../components/ha-icon-button";
import "../../components/ha-ripple";
import type { SourceFilters } from "../../components/ha-sources-picker";
import {
  applySourceFilters,
  countSourceFilters,
  countTargets,
} from "../../components/ha-sources-picker";
import "../../components/ha-spinner";
import "../../components/ha-top-app-bar-fixed";
import type { EntitySources } from "../../data/entity/entity_sources";
import { fetchEntitySourcesWithCache } from "../../data/entity/entity_sources";
import { entityTypesNeedStates } from "../../data/entity/entity_type";
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
import { csvDownload, csvSafeString } from "../../util/csv";
import { addEntitiesToLovelaceView } from "../lovelace/editor/add-entities-to-view";

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

  // The zoom window shared by all charts, in percent of the date range.
  @state() private _zoomRange: [number, number] = [0, 100];

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

  @query("ha-date-range-picker") private _datePicker?: HaDateRangePicker;

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

    const hasCharts = !loading && hasTargets && hasResults;
    const [zoomStart, zoomEnd] = this._zoomRange;
    const clearLabel = this.hass.localize(
      "ui.components.subpage-data-table.clear_filter"
    );
    const resetLabel = this.hass.localize(
      "ui.components.history_charts.zoom_reset"
    );
    // The label counts the entities the sources resolve to, which is what the
    // charts show; the badge counts the filters applied to them.
    const sources = html`<ha-filter-pane-chip
        .label=${sourcesLabel}
        .path=${mdiTuneVariant}
        .count=${filterCount}
        .active=${sourceCount > 0}
        .disabled=${this._isLoading}
        @click=${this._openSources}
      ></ha-filter-pane-chip>
      ${
        sourceCount
          ? html`<ha-icon-button
              .path=${mdiFilterVariantRemove}
              .label=${clearLabel}
              title=${clearLabel}
              .disabled=${this._isLoading}
              @click=${this._clearSources}
            ></ha-icon-button>`
          : nothing
      }`;
    const date = this._renderDateRange();
    const reset = hasCharts
      ? html`<ha-icon-button
          .label=${resetLabel}
          title=${resetLabel}
          .path=${mdiRestart}
          .disabled=${zoomStart === 0 && zoomEnd === 100}
          @click=${this._resetZoom}
        ></ha-icon-button>`
      : nothing;
    const menu = html`<ha-dropdown
      placement="top-end"
      @wa-select=${this._handleMenuAction}
    >
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
    </ha-dropdown>`;
    // The date range with the menu, then the sources, then the slider with
    // its reset button.
    const controls = html`<div class="controls-row">${date}${menu}</div>
      <div class="controls-row">${sources}</div>
      ${
        hasCharts
          ? html`<div class="controls-row">
              ${reset}
              <ha-chart-zoom-slider
                .start=${zoomStart}
                .end=${zoomEnd}
                @zoom-slider-changed=${this._zoomSliderChanged}
              ></ha-chart-zoom-slider>
            </div>`
          : nothing
      }`;

    return html`
      <ha-top-app-bar-fixed
        .narrow=${this.narrow}
        .backButton=${!!this._showBack}
      >
        <h1 class="page-title" slot="title">
          ${this.hass.localize("panel.history")}
        </h1>
        <div class="content">
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
                        sync-charts
                        inside-labels
                        @history-charts-zoom=${this._chartsZoomChanged}
                      >
                      </state-history-charts>
                    `
            }
          </div>
          <div class="controls">${controls}</div>
        </div>
        ${
          this._showSources
            ? html`<ha-filter-pane
                narrow
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
                  .entitySources=${this._entitySources}
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
      </ha-top-app-bar-fixed>
    `;
  }

  // Laid out like the energy dashboard's period selector: the picker's
  // calendar button, the range as a title that also opens the picker, and
  // buttons to jump to now and step back and forth.
  private _renderDateRange() {
    const [start, end] = this._getVisibleRange() ?? [
      this._startDate,
      this._endDate,
    ];
    const { locale, config } = this.hass;
    const title =
      start.toDateString() === end.toDateString()
        ? formatDateVeryShort(start, locale, config)
        : `${formatDateVeryShort(start, locale, config)}–${formatDateVeryShort(end, locale, config)}`;
    const rtl = mainWindow.document.dir === "rtl";
    const nowLabel = this.hass.localize("ui.panel.history.now");
    return html`<div class="date-range">
      <ha-date-range-picker
        minimal
        backdrop
        time-picker
        extended-presets
        popover-placement="top-start"
        .disabled=${this._isLoading}
        .startDate=${this._startDate}
        .endDate=${this._endDate}
        @value-changed=${this._dateRangeChanged}
      ></ha-date-range-picker>
      <div
        class="date-range-label"
        role="button"
        tabindex="0"
        @click=${this._openDatePicker}
        @keydown=${this._handleDateLabelKeydown}
      >
        <ha-ripple></ha-ripple>
        <div class="date-range-title">${title}</div>
        <div class="date-range-subtitle">
          ${formatTime(start, locale, config)} –
          ${formatTime(end, locale, config)}
        </div>
        <ha-spinner
          class=${classMap({ loading: true, "is-loading": this._isLoading })}
          size="small"
        ></ha-spinner>
      </div>
      ${
        this.narrow
          ? html`<ha-icon-button
              .path=${mdiHomeClock}
              .label=${nowLabel}
              .disabled=${this._isLoading}
              @click=${this._pickNow}
            ></ha-icon-button>`
          : html`<ha-button
              appearance="filled"
              size="s"
              .disabled=${this._isLoading}
              @click=${this._pickNow}
            >
              ${nowLabel}
            </ha-button>`
      }
      <ha-icon-button
        .path=${rtl ? mdiChevronRight : mdiChevronLeft}
        .label=${this.hass.localize("ui.common.previous")}
        .disabled=${this._isLoading}
        @click=${this._pickPrevious}
      ></ha-icon-button>
      <ha-icon-button
        .path=${rtl ? mdiChevronLeft : mdiChevronRight}
        .label=${this.hass.localize("ui.common.next")}
        .disabled=${this._isLoading}
        @click=${this._pickNext}
      ></ha-icon-button>
    </div>`;
  }

  private _openDatePicker() {
    this._datePicker?.open();
  }

  private _handleDateLabelKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._openDatePicker();
    }
  }

  private _pickPrevious() {
    this._shiftDateRange(false);
  }

  private _pickNext() {
    this._shiftDateRange(true);
  }

  private _shiftDateRange(forward: boolean) {
    const { start, end } = shiftDateRange(
      this._startDate,
      this._endDate,
      forward,
      this.hass.locale,
      this.hass.config
    );
    this._startDate = start;
    this._endDate = end;
    this._updatePath();
  }

  // Keeps the range's length and moves it to end at the next full hour.
  private _pickNow() {
    const length = this._endDate.getTime() - this._startDate.getTime();
    const end = new Date();
    end.setHours(end.getHours() + 1, 0, 0, 0);
    this._startDate = new Date(end.getTime() - length);
    this._endDate = end;
    this._updatePath();
  }

  // The time span the zoomed charts show, for the date range to display. The
  // charts run from the start date to the end date, or to now when the end is
  // still to come.
  private _getVisibleRange(): [Date, Date] | undefined {
    const [start, end] = this._zoomRange;
    if (start === 0 && end === 100) {
      return undefined;
    }
    const from = this._startDate.getTime();
    const to = Math.min(this._endDate.getTime(), Date.now());
    const at = (percent: number) =>
      new Date(from + ((to - from) * percent) / 100);
    return [at(start), at(end)];
  }

  private _chartsZoomChanged(
    ev: HASSDomEvent<HASSDomEvents["history-charts-zoom"]>
  ) {
    this._zoomRange = [ev.detail.start, ev.detail.end];
  }

  private _zoomSliderChanged(
    ev: HASSDomEvent<HASSDomEvents["zoom-slider-changed"]>
  ) {
    const { start, end } = ev.detail;
    this._zoomRange = [start, end];
    this._stateHistoryCharts?.zoom(start, end);
  }

  private _resetZoom() {
    this._stateHistoryCharts?.resetZoom();
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
          ${this.hass.localize("ui.panel.history.change_sources")}
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
    // The charts are rebuilt once loaded, so they start unzoomed.
    this._zoomRange = [0, 100];

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
      // Only a device class narrows down using the states.
      entityTypesNeedStates(this._filters.types)
        ? this.hass.states
        : EMPTY_STATES,
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
        :host {
          /* The target picker chips need more room than a plain filter list. */
          --ha-filter-pane-width: 340px;
        }
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
          position: relative;
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

        /* All the page's controls, floating over the bottom of the results,
           which leave room for them. Styled like a dashboard view footer. */
        .controls {
          position: absolute;
          inset-inline: var(--ha-space-4);
          bottom: calc(var(--ha-space-4) + var(--safe-area-inset-bottom, 0px));
          max-width: 720px;
          margin-inline: auto;
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-1);
          padding: var(--ha-space-2);
          border-radius: var(--ha-border-radius-xl);
          background-color: var(--card-background-color);
          box-shadow: var(--ha-box-shadow-l);
        }

        :host([narrow]) .controls {
          inset-inline: var(--ha-space-2);
          bottom: calc(var(--ha-space-2) + var(--safe-area-inset-bottom, 0px));
        }

        .controls-row {
          display: flex;
          align-items: center;
          gap: var(--ha-space-1);
          min-width: 0;
        }

        .controls-row > * {
          flex-shrink: 0;
        }

        /* The icon buttons across the rows: clear, reset and the menu. */
        .controls-row ha-icon-button {
          --ha-icon-button-size: 40px;
          --mdc-icon-size: 24px;
          color: var(--secondary-text-color);
        }

        .controls-row ha-chart-zoom-slider {
          flex: 1;
          flex-shrink: 1;
          min-width: 0;
        }

        .controls-row ha-chart-zoom-slider {
          margin-inline: var(--ha-space-1);
        }

        .controls-row ha-filter-pane-chip {
          flex: 1;
          flex-shrink: 1;
          min-width: 0;
        }

        /* Matches the energy dashboard's period selector. */
        .date-range {
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
        }

        .date-range-label {
          position: relative;
          flex: 1;
          min-width: 0;
          min-height: var(--ha-space-10);
          padding: 2px var(--ha-space-2) 2px 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
          border-radius: var(--ha-border-radius-lg);
        }

        .date-range-title {
          font-size: var(--ha-font-size-xl);
          line-height: var(--ha-line-height-condensed);
          font-weight: var(--ha-font-weight-medium);
          color: var(--primary-text-color);
        }

        .date-range-subtitle {
          font-size: var(--ha-font-size-m);
          line-height: var(--ha-line-height-condensed);
          color: var(--secondary-text-color);
        }

        :host([narrow]) .date-range-title {
          font-size: var(--ha-font-size-m);
        }

        :host([narrow]) .date-range-subtitle {
          font-size: var(--ha-font-size-s);
        }

        .date-range-label .loading {
          position: absolute;
          inset-inline-end: var(--ha-space-2);
          top: 50%;
          transform: translateY(-50%);
          opacity: 0;
          transition: opacity var(--ha-animation-duration-normal) ease-in-out;
        }

        .date-range-label .loading.is-loading {
          opacity: 1;
        }

        .date-range ha-button {
          flex-shrink: 0;
          margin-inline-start: var(--ha-space-2);
          --ha-button-theme-color: currentColor;
        }

        .date-range ha-ripple {
          border-radius: var(--ha-border-radius-lg);
        }

        .results {
          flex: 1;
          min-width: 0;
          overflow: hidden auto;
          /* Keeps the charts' own z-index (a hovered chart rises above its
             neighbours) below the controls. */
          isolation: isolate;
          padding: var(--ha-space-4);
          /* Centres the charts within the widest page content (a dashboard at
             its default column count), keeping the scrollbar at the edge. */
          padding-inline: max(var(--ha-space-4), (100% - 2000px) / 2);
          /* Room to scroll the last chart out from under the controls. */
          padding-bottom: 176px;
        }

        /* Narrow screens: keep the vertical rhythm but give the charts the
           horizontal space back. */
        :host([narrow]) .results {
          padding-inline: var(--ha-space-2);
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
