import { ResizeController } from "@lit-labs/observers/resize-controller";
import {
  mdiDevices,
  mdiDotsVertical,
  mdiDownload,
  mdiFilterRemove,
  mdiFilterVariant,
  mdiHome,
  mdiImagePlus,
  mdiTagOutline,
  mdiTextureBox,
} from "@mdi/js";
import { differenceInHours } from "date-fns";
import type {
  HassEntity,
  HassServiceTarget,
  UnsubscribeFunc,
} from "home-assistant-js-websocket/dist/types";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { storage } from "../../common/decorators/storage";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceName } from "../../common/entity/compute_device_name";
import { computeDomain } from "../../common/entity/compute_domain";
import {
  computeEntityDisplayParts,
  computeHistoryNames,
  type HistoryNameResult,
} from "./history-entity-names";
import { navigate } from "../../common/navigate";
import { constructUrlCurrentPath } from "../../common/url/construct-url";
import {
  createHistoryLogbookUrl,
  decodeHistoryLogbookQueryParams,
  historyLogbookTargetFromQueryParams,
} from "../../common/url/history-logbook-query-params";
import {
  extractSearchParamsObject,
  removeSearchParam,
} from "../../common/url/search-params";
import { MIN_TIME_BETWEEN_UPDATES } from "../../components/chart/ha-chart-base";
import "../../components/chart/state-history-charts";
import type { StateHistoryCharts } from "../../components/chart/state-history-charts";
import "../../components/date-picker/ha-date-range-picker";
import "../../components/ha-bottom-sheet";
import "../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../components/ha-dropdown";
import "../../components/ha-dropdown-item";
import "../../components/ha-filter-device-classes";
import "../../components/ha-filter-domains";
import "../../components/ha-filter-floor-areas";
import "../../components/ha-filter-integrations";
import "../../components/ha-filter-labels";
import "../../components/ha-icon-button";
import "../../components/ha-spinner";
import "../../components/ha-state-icon";
import "../../components/ha-svg-icon";
import "../../components/ha-target-picker";
import "../../components/ha-two-pane-top-app-bar-fixed";
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
import { fileDownload } from "../../util/file_download";
import { addEntitiesToLovelaceView } from "../lovelace/editor/add-entities-to-view";

interface HistoryFilters {
  domain?: string[];
  device_class?: string[];
  floor_areas?: { floors?: string[]; areas?: string[] };
  label?: string[];
  integration?: string[];
}

interface TargetChip {
  primary: string;
  secondary?: string;
  // For entity chips we render a state icon; other types use an mdi path.
  icon?: string;
  stateObj?: HassEntity;
}

@customElement("ha-panel-history")
class HaPanelHistory extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  @property({ reflect: true, type: Boolean }) public narrow = false;

  @property({ reflect: true, type: Boolean }) rtl = false;

  @state() private _startDate: Date;

  @state() private _endDate: Date;

  @state()
  @storage({
    key: "historyPickedValue",
    state: true,
    subscribe: false,
  })
  private _targetPickerValue: HassServiceTarget = {};

  @state()
  @storage({
    key: "historyFilters",
    state: true,
    subscribe: false,
  })
  private _filters: HistoryFilters = {};

  @state()
  @storage({
    key: "historyPaneCollapsed",
    state: true,
    subscribe: false,
  })
  private _paneCollapsed = false;

  @state() private _sheetOpen = false;

  @state() private _isLoading = false;

  @state() private _stateHistory?: HistoryResult;

  private _mungedStateHistory?: HistoryResult;

  @state() private _statisticsHistory?: HistoryResult;

  @state()
  private _showBack?: boolean;

  @query("state-history-charts")
  private _stateHistoryCharts?: StateHistoryCharts;

  private _subscribed?: Promise<UnsubscribeFunc | undefined>;

  private _interval?: number;

  private _showPaneController = new ResizeController(this, {
    callback: (entries) => entries[0]?.contentRect.width > 750,
  });

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
    const entitiesSelected = this._getEntityIds().length > 0;
    const wide = this._showPaneController.value ?? !this.narrow;
    const showPane = wide && !this._paneCollapsed;
    const activeFilters = this._activeFilterCount();

    return html`
      <ha-two-pane-top-app-bar-fixed
        .pane=${showPane}
        .narrow=${this.narrow}
        .backButton=${!!this._showBack}
      >
        <h1 class="page-title" slot="title">
          ${this.hass.localize("panel.history")}
        </h1>

        ${!showPane
          ? html`
              <ha-icon-button
                slot="actionItems"
                @click=${this._toggleFilters}
                .path=${mdiFilterVariant}
                .label=${this.hass.localize(
                  "ui.components.subpage-data-table.filters"
                )}
              ></ha-icon-button>
              ${activeFilters
                ? html`<div class="filter-badge" slot="actionItems">
                    ${activeFilters}
                  </div>`
                : nothing}
            `
          : nothing}
        ${entitiesSelected
          ? html`
              <ha-icon-button
                slot="actionItems"
                @click=${this._removeAll}
                .disabled=${this._isLoading}
                .path=${mdiFilterRemove}
                .label=${this.hass.localize("ui.panel.history.remove_all")}
              ></ha-icon-button>
            `
          : ""}
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

        ${showPane
          ? html`<div slot="pane" class="pane-content">
              ${this._renderFilters()}
            </div>`
          : nothing}

        <div class="content ha-scrollbar">
          ${!showPane ? this._renderTargetSummary() : nothing}
          ${this._isLoading
            ? html`<div class="progress-wrapper">
                <ha-spinner></ha-spinner>
              </div>`
            : !entitiesSelected
              ? html`<div class="start-search">
                  ${this.hass.localize("ui.panel.history.start_search")}
                </div>`
              : html`
                  <state-history-charts
                    .hass=${this.hass}
                    .historyData=${this._mungedStateHistory}
                    .names=${this._getNameResult().names}
                    .entityContext=${this._getNameResult().context}
                    .startTime=${this._startDate}
                    .endTime=${this._endDate}
                    .narrow=${this.narrow}
                    sync-charts
                  >
                  </state-history-charts>
                `}
        </div>
      </ha-two-pane-top-app-bar-fixed>

      ${!showPane
        ? html`<ha-bottom-sheet
            flexcontent
            .open=${this._sheetOpen}
            @closed=${this._closeSheet}
          >
            <div slot="header" class="sheet-header">
              ${this.hass.localize("ui.components.subpage-data-table.filters")}
              ${this._activeFilterCount() || this._targetCount()
                ? html`<button class="link-button" @click=${this._removeAll}>
                    ${this.hass.localize("ui.common.clear")}
                  </button>`
                : nothing}
            </div>
            <div class="sheet-content">${this._renderFilters()}</div>
          </ha-bottom-sheet>`
        : nothing}
    `;
  }

  private _renderFilters() {
    return html`
      <div class="filters">
        <ha-date-range-picker
          ?disabled=${this._isLoading}
          .startDate=${this._startDate}
          .endDate=${this._endDate}
          extended-presets
          time-picker
          @value-changed=${this._dateRangeChanged}
        ></ha-date-range-picker>
        <ha-target-picker
          .hass=${this.hass}
          .value=${this._targetPickerValue}
          .disabled=${this._isLoading}
          add-on-top
          @value-changed=${this._targetsChanged}
        ></ha-target-picker>
        <div class="filter-panels">
          <ha-filter-domains
            .hass=${this.hass}
            .value=${this._filters.domain}
            @data-table-filter-changed=${this._domainFilterChanged}
          ></ha-filter-domains>
          <ha-filter-device-classes
            .hass=${this.hass}
            .value=${this._filters.device_class}
            @data-table-filter-changed=${this._deviceClassFilterChanged}
          ></ha-filter-device-classes>
          <ha-filter-floor-areas
            .hass=${this.hass}
            .value=${this._filters.floor_areas}
            @data-table-filter-changed=${this._floorAreasFilterChanged}
          ></ha-filter-floor-areas>
          <ha-filter-integrations
            .value=${this._filters.integration}
            @data-table-filter-changed=${this._integrationFilterChanged}
          ></ha-filter-integrations>
          <ha-filter-labels
            .hass=${this.hass}
            .value=${this._filters.label}
            @data-table-filter-changed=${this._labelFilterChanged}
          ></ha-filter-labels>
        </div>
      </div>
    `;
  }

  private _renderTargetSummary() {
    const chips = this._targetChips();
    return html`
      <div class="target-summary" @click=${this._toggleFilters}>
        ${chips.length
          ? html`<div class="chips">
              ${chips.map(
                (chip) =>
                  html`<span
                    class="chip"
                    title=${chip.secondary
                      ? `${chip.secondary} ▸ ${chip.primary}`
                      : chip.primary}
                  >
                    ${chip.stateObj
                      ? html`<ha-state-icon
                          .stateObj=${chip.stateObj}
                        ></ha-state-icon>`
                      : html`<ha-svg-icon .path=${chip.icon}></ha-svg-icon>`}
                    <span class="chip-text">
                      <span class="chip-primary">${chip.primary}</span>
                      ${chip.secondary
                        ? html`<span class="chip-secondary"
                            >${chip.secondary}</span
                          >`
                        : nothing}
                    </span>
                  </span>`
              )}
            </div>`
          : html`<span class="summary-placeholder">
              ${this.hass.localize("ui.panel.history.start_search")}
            </span>`}
        <ha-icon-button
          .path=${mdiFilterVariant}
          .label=${this.hass.localize(
            "ui.components.subpage-data-table.filters"
          )}
        ></ha-icon-button>
      </div>
    `;
  }

  private _targetChips(): TargetChip[] {
    const value = this._targetPickerValue;
    const chips: TargetChip[] = [];
    const toArray = (v?: string | string[]) =>
      v ? (Array.isArray(v) ? v : [v]) : [];

    toArray(value.floor_id).forEach((id) => {
      const floor = this.hass.floors?.[id];
      chips.push({ primary: floor?.name ?? id, icon: mdiHome });
    });
    toArray(value.area_id).forEach((id) => {
      const area = this.hass.areas?.[id];
      const floor = area?.floor_id
        ? this.hass.floors?.[area.floor_id]
        : undefined;
      chips.push({
        primary: (area && computeAreaName(area)) ?? id,
        secondary: floor?.name,
        icon: mdiTextureBox,
      });
    });
    toArray(value.device_id).forEach((id) => {
      const device = this.hass.devices?.[id];
      const area = device?.area_id
        ? this.hass.areas?.[device.area_id]
        : undefined;
      chips.push({
        primary: (device && computeDeviceName(device)) ?? id,
        secondary: area ? computeAreaName(area) : undefined,
        icon: mdiDevices,
      });
    });
    toArray(value.entity_id).forEach((id) => {
      const stateObj = this.hass.states[id];
      const { primary, secondary } = computeEntityDisplayParts(this.hass, id);
      chips.push({ primary, secondary, stateObj });
    });
    toArray(value.label_id).forEach((id) =>
      chips.push({ primary: id, icon: mdiTagOutline })
    );
    return chips;
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (
      changedProps.has("_stateHistory") ||
      changedProps.has("_statisticsHistory") ||
      changedProps.has("_startDate") ||
      changedProps.has("_endDate") ||
      changedProps.has("_targetPickerValue") ||
      changedProps.has("_filters")
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
    const targetPickerValue = historyLogbookTargetFromQueryParams(queryParams);
    if (targetPickerValue) {
      this._targetPickerValue = targetPickerValue;
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
    // The reused ha-filter-* components have their captions in the config fragment.
    this.hass.loadFragmentTranslation("config");
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
      changedProps.has("_targetPickerValue") ||
      changedProps.has("_filters")
    ) {
      this._getHistory();
      this._getStats();
    }
  }

  private _toggleFilters() {
    const wide = this._showPaneController.value ?? !this.narrow;
    if (wide) {
      // On wide screens, re-open the collapsed pane.
      this._paneCollapsed = false;
    } else {
      this._sheetOpen = true;
    }
  }

  private _closeSheet() {
    this._sheetOpen = false;
  }

  private _activeFilterCount(): number {
    const f = this._filters;
    return (
      (f.domain?.length || 0) +
      (f.device_class?.length || 0) +
      (f.integration?.length || 0) +
      (f.label?.length || 0) +
      (f.floor_areas?.areas?.length || 0) +
      (f.floor_areas?.floors?.length || 0)
    );
  }

  private _targetCount(): number {
    const value = this._targetPickerValue;
    const len = (v?: string | string[]) =>
      v ? (Array.isArray(v) ? v.length : 1) : 0;
    return (
      len(value.entity_id) +
      len(value.device_id) +
      len(value.area_id) +
      len(value.floor_id) +
      len(value.label_id)
    );
  }

  private _domainFilterChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._setFilter("domain", ev.detail.value);
  }

  private _deviceClassFilterChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._setFilter("device_class", ev.detail.value);
  }

  private _integrationFilterChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._setFilter("integration", ev.detail.value);
  }

  private _labelFilterChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._setFilter("label", ev.detail.value);
  }

  private _floorAreasFilterChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as
      | { floors?: string[]; areas?: string[] }
      | undefined;
    this._filters = {
      ...this._filters,
      floor_areas:
        value && (value.areas?.length || value.floors?.length)
          ? value
          : undefined,
    };
  }

  private _setFilter(
    key: "domain" | "device_class" | "integration" | "label",
    value: string[] | undefined
  ) {
    this._filters = {
      ...this._filters,
      [key]: value?.length ? value : undefined,
    };
  }

  private _removeAll() {
    this._targetPickerValue = {};
    this._filters = {};
    this._updatePath();
  }

  private async _getStats() {
    const statisticIds = this._getEntityIds();

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

    this._statisticsHistory = convertStatisticsToHistory(
      this.hass!,
      statistics,
      statisticIds,
      true
    );
  }

  private async _getHistory() {
    const entityIds = this._getEntityIds();

    if (entityIds.length === 0) {
      this._stateHistory = undefined;
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
    return this.__getEntityIds(
      this._targetPickerValue,
      this._filters,
      this.hass.entities,
      this.hass.devices,
      this.hass.areas
    );
  }

  private __getEntityIds = memoizeOne(
    (
      targetPickerValue: HassServiceTarget,
      filters: HistoryFilters,
      entities: HomeAssistant["entities"],
      devices: HomeAssistant["devices"],
      areas: HomeAssistant["areas"]
    ): string[] => {
      const resolved = resolveEntityIDs(
        this.hass,
        targetPickerValue,
        entities,
        devices,
        areas
      );
      return this._applyFilters(resolved, filters);
    }
  );

  private _getNameResult(): HistoryNameResult {
    return this.__getNameResult(
      this._getEntityIds(),
      this.hass.entities,
      this.hass.devices,
      this.hass.areas,
      this.hass.floors
    );
  }

  private __getNameResult = memoizeOne(
    (
      entityIds: string[],
      _entities: HomeAssistant["entities"],
      _devices: HomeAssistant["devices"],
      _areas: HomeAssistant["areas"],
      _floors: HomeAssistant["floors"]
    ): HistoryNameResult => computeHistoryNames(this.hass, entityIds)
  );

  private _applyFilters(
    entityIds: string[],
    filters: HistoryFilters
  ): string[] {
    let result = entityIds;

    if (filters.domain?.length) {
      const domains = new Set(filters.domain);
      result = result.filter((id) => domains.has(computeDomain(id)));
    }

    if (filters.device_class?.length) {
      const deviceClasses = new Set(filters.device_class);
      result = result.filter((id) =>
        deviceClasses.has(this.hass.states[id]?.attributes.device_class as any)
      );
    }

    if (filters.integration?.length) {
      const integrations = new Set(filters.integration);
      result = result.filter((id) => {
        const platform = this.hass.entities[id]?.platform;
        return platform && integrations.has(platform);
      });
    }

    if (filters.label?.length) {
      const labels = new Set(filters.label);
      result = result.filter((id) =>
        this.hass.entities[id]?.labels.some((l) => labels.has(l))
      );
    }

    if (
      filters.floor_areas?.areas?.length ||
      filters.floor_areas?.floors?.length
    ) {
      const areaIds = new Set(filters.floor_areas.areas || []);
      const floorIds = new Set(filters.floor_areas.floors || []);
      // Expand selected floors to their areas.
      Object.values(this.hass.areas).forEach((area) => {
        if (area.floor_id && floorIds.has(area.floor_id)) {
          areaIds.add(area.area_id);
        }
      });
      result = result.filter((id) => {
        const entity = this.hass.entities[id];
        const areaId =
          entity?.area_id ??
          (entity?.device_id
            ? this.hass.devices[entity.device_id]?.area_id
            : undefined);
        return areaId ? areaIds.has(areaId) : false;
      });
    }

    return result;
  }

  private _dateRangeChanged(ev) {
    this._startDate = ev.detail.value.startDate;
    this._endDate = ev.detail.value.endDate;
    this._updatePath();
  }

  private _targetsChanged(ev) {
    this._targetPickerValue = ev.detail.value || {};
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

    const csv: string[] = [""]; // headers will be replaced later.
    const headers = ["entity_id", "state", "last_changed"];
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
            csv.push(`${entityId},${s.state},${formatDate(s.last_changed)}\n`);
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

          csv.push(data.join(",") + "\n");
        }
      }
    }
    for (const timeline of this._mungedStateHistory.timeline) {
      const entityId = timeline.entity_id;
      for (const s of timeline.data) {
        const safeState = /,|"/.test(s.state)
          ? `"${s.state.replaceAll('"', '""')}"`
          : s.state;
        csv.push(`${entityId},${safeState},${formatDate(s.last_changed)}\n`);
      }
    }
    csv[0] = headers.join(",") + "\n";
    const blob = new Blob(csv, {
      type: "text/csv",
    });
    const url = window.URL.createObjectURL(blob);
    fileDownload(url, "history.csv");
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
          display: block;
        }

        ha-two-pane-top-app-bar-fixed {
          --sidepane-width: 320px;
          height: 100vh;
          overflow-x: hidden;
          overflow-y: visible;
        }

        .page-title {
          font-size: inherit;
          margin: inherit;
          line-height: inherit;
        }

        .content {
          height: calc(
            100vh - var(--header-height, 0px) - var(
                --safe-area-inset-top,
                0px
              ) - var(--safe-area-inset-bottom, 0px)
          );
          box-sizing: border-box;
          overflow-x: hidden;
          padding: 0 16px 16px;
        }

        .pane-content {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .progress-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          flex-direction: column;
          padding: 16px;
        }

        .filters {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px 16px 0;
        }

        .filter-panels {
          display: flex;
          flex-direction: column;
          margin: 0 -16px;
          border-top: 1px solid var(--divider-color);
        }

        ha-date-range-picker {
          max-width: 100%;
          direction: var(--direction);
        }

        ha-target-picker {
          max-width: 100%;
          min-width: 0;
        }

        .filter-badge {
          position: relative;
          inset-inline-end: 12px;
          top: 4px;
          min-width: 16px;
          box-sizing: border-box;
          border-radius: var(--ha-border-radius-circle);
          font-size: var(--ha-font-size-xs);
          line-height: 16px;
          text-align: center;
          padding: 0px 2px;
          color: var(--text-primary-color);
          background-color: var(--primary-color);
          align-self: center;
        }

        .target-summary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          cursor: pointer;
          border-bottom: 1px solid var(--divider-color);
          margin-bottom: 8px;
        }

        .target-summary .chips {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          flex: 1;
          scrollbar-width: none;
        }

        .target-summary .chips::-webkit-scrollbar {
          display: none;
        }

        .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          font-size: var(--ha-font-size-s);
          background-color: var(--secondary-background-color);
          border-radius: var(--ha-border-radius-pill, 16px);
          padding: 4px 12px 4px 8px;
        }

        .chip ha-state-icon,
        .chip ha-svg-icon {
          --mdc-icon-size: 18px;
          width: 18px;
          height: 18px;
          flex: 0 0 auto;
          color: var(--secondary-text-color);
        }

        .chip-text {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }

        .chip-secondary {
          font-size: var(--ha-font-size-2xs, 11px);
          color: var(--secondary-text-color);
        }

        .summary-placeholder {
          flex: 1;
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }

        .sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-medium);
        }

        .sheet-content {
          display: flex;
          flex-direction: column;
        }

        .link-button {
          background: none;
          border: none;
          color: var(--primary-color);
          cursor: pointer;
          font: inherit;
          padding: 0;
        }

        .start-search {
          padding-top: 16px;
          text-align: center;
          color: var(--secondary-text-color);
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
