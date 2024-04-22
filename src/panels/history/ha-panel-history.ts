import { mdiDownload, mdiFilterRemove } from "@mdi/js";
import { differenceInHours } from "date-fns";
import {
  HassServiceTarget,
  UnsubscribeFunc,
} from "home-assistant-js-websocket/dist/types";
import { LitElement, PropertyValues, css, html } from "lit";
import { property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { storage } from "../../common/decorators/storage";
import { computeDomain } from "../../common/entity/compute_domain";
import { navigate } from "../../common/navigate";
import { constructUrlCurrentPath } from "../../common/url/construct-url";
import {
  createSearchParam,
  extractSearchParamsObject,
  removeSearchParam,
} from "../../common/url/search-params";
import { MIN_TIME_BETWEEN_UPDATES } from "../../components/chart/ha-chart-base";
import "../../components/chart/state-history-charts";
import type { StateHistoryCharts } from "../../components/chart/state-history-charts";
import "../../components/ha-circular-progress";
import "../../components/ha-date-range-picker";
import "../../components/ha-icon-button";
import "../../components/ha-icon-button-arrow-prev";
import "../../components/ha-menu-button";
import "../../components/ha-target-picker";
import "../../components/ha-top-app-bar-fixed";
import {
  EntityHistoryState,
  HistoryResult,
  HistoryStates,
  LineChartState,
  LineChartUnit,
  computeGroupKey,
  computeHistory,
  subscribeHistory,
} from "../../data/history";
import { Statistics, fetchStatistics } from "../../data/recorder";
import {
  expandAreaTarget,
  expandDeviceTarget,
  expandFloorTarget,
  expandLabelTarget,
} from "../../data/selector";
import { getSensorNumericDeviceClasses } from "../../data/sensor";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { fileDownload } from "../../util/file_download";

class HaPanelHistory extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  @property({ reflect: true, type: Boolean }) public narrow = false;

  @property({ reflect: true, type: Boolean }) rtl = false;

  @state() private _startDate: Date;

  @state() private _endDate: Date;

  @storage({
    key: "historyPickedValue",
    state: true,
    subscribe: false,
  })
  private _targetPickerValue: HassServiceTarget = {};

  @state() private _isLoading = false;

  @state() private _stateHistory?: HistoryResult;

  private _mungedStateHistory?: HistoryResult;

  @state() private _statisticsHistory?: HistoryResult;

  @state()
  private _showBack?: boolean;

  @query("state-history-charts")
  private _stateHistoryCharts?: StateHistoryCharts;

  private _subscribed?: Promise<UnsubscribeFunc>;

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

  private _goBack(): void {
    history.back();
  }

  protected render() {
    const entitiesSelected = this._getEntityIds().length > 0;
    return html`
      <ha-top-app-bar-fixed>
        ${this._showBack
          ? html`
              <ha-icon-button-arrow-prev
                slot="navigationIcon"
                @click=${this._goBack}
              ></ha-icon-button-arrow-prev>
            `
          : html`
              <ha-menu-button
                slot="navigationIcon"
                .hass=${this.hass}
                .narrow=${this.narrow}
              ></ha-menu-button>
            `}
        <div slot="title">${this.hass.localize("panel.history")}</div>
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
        <ha-icon-button
          slot="actionItems"
          @click=${this._downloadHistory}
          .disabled=${this._isLoading}
          .path=${mdiDownload}
          .label=${this.hass.localize("ui.panel.history.download_data")}
        ></ha-icon-button>

        <div class="flex content">
          <div class="filters">
            <ha-date-range-picker
              .hass=${this.hass}
              ?disabled=${this._isLoading}
              .startDate=${this._startDate}
              .endDate=${this._endDate}
              extendedPresets
              @change=${this._dateRangeChanged}
            ></ha-date-range-picker>
            <ha-target-picker
              .hass=${this.hass}
              .value=${this._targetPickerValue}
              .disabled=${this._isLoading}
              addOnTop
              @value-changed=${this._targetsChanged}
            ></ha-target-picker>
          </div>
          ${this._isLoading
            ? html`<div class="progress-wrapper">
                <ha-circular-progress indeterminate></ha-circular-progress>
              </div>`
            : !entitiesSelected
              ? html`<div class="start-search">
                  ${this.hass.localize("ui.panel.history.start_search")}
                </div>`
              : html`
                  <state-history-charts
                    .hass=${this.hass}
                    .historyData=${this._mungedStateHistory}
                    .startTime=${this._startDate}
                    .endTime=${this._endDate}
                  >
                  </state-history-charts>
                `}
        </div>
      </ha-top-app-bar-fixed>
    `;
  }

  private mergeHistoryResults(
    ltsResult: HistoryResult,
    historyResult: HistoryResult
  ): HistoryResult {
    const result: HistoryResult = { ...historyResult, line: [] };

    const lookup: Record<
      string,
      { historyItem?: LineChartUnit; ltsItem?: LineChartUnit }
    > = {};

    for (const item of historyResult.line) {
      const key = computeGroupKey(item.unit, item.device_class, true);
      if (key) {
        lookup[key] = {
          historyItem: item,
        };
      }
    }

    for (const item of ltsResult.line) {
      const key = computeGroupKey(item.unit, item.device_class, true);
      if (!key) {
        continue;
      }
      if (key in lookup) {
        lookup[key].ltsItem = item;
      } else {
        lookup[key] = { ltsItem: item };
      }
    }

    for (const { historyItem, ltsItem } of Object.values(lookup)) {
      if (!historyItem || !ltsItem) {
        // Only one result has data for this item, so just push it directly instead of merging.
        result.line.push(historyItem || ltsItem!);
        continue;
      }

      const newLineItem: LineChartUnit = { ...historyItem, data: [] };
      const entities = new Set([
        ...historyItem.data.map((d) => d.entity_id),
        ...ltsItem.data.map((d) => d.entity_id),
      ]);

      for (const entity of entities) {
        const historyDataItem = historyItem.data.find(
          (d) => d.entity_id === entity
        );
        const ltsDataItem = ltsItem.data.find((d) => d.entity_id === entity);

        if (!historyDataItem || !ltsDataItem) {
          newLineItem.data.push(historyDataItem || ltsDataItem!);
          continue;
        }

        // Remove statistics that overlap with states
        const oldestState =
          historyDataItem.states[0]?.last_changed ||
          // If no state, fall back to the max last changed of the last statistics (so approve all)
          ltsDataItem.statistics![ltsDataItem.statistics!.length - 1]
            .last_changed + 1;

        const statistics: LineChartState[] = [];
        for (const s of ltsDataItem.statistics!) {
          if (s.last_changed >= oldestState) {
            break;
          }
          statistics.push(s);
        }

        newLineItem.data.push(
          statistics.length === 0
            ? // All statistics overlapped with states, so just push the states
              historyDataItem
            : {
                ...historyDataItem,
                statistics,
              }
        );
      }
      result.line.push(newLineItem);
    }
    return result;
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
        this._mungedStateHistory = this.mergeHistoryResults(
          this._statisticsHistory,
          this._stateHistory
        );
      } else {
        this._mungedStateHistory =
          this._stateHistory || this._statisticsHistory;
      }
    }

    if (this.hasUpdated) {
      return;
    }

    const searchParams = extractSearchParamsObject();
    const entityIds = searchParams.entity_id;
    const deviceIds = searchParams.device_id;
    const areaIds = searchParams.area_id;
    const floorIds = searchParams.floor_id;
    const labelsIds = searchParams.label_id;
    if (entityIds || deviceIds || areaIds || floorIds || labelsIds) {
      this._targetPickerValue = {};
    }
    if (entityIds) {
      const splitIds = entityIds.split(",");
      this._targetPickerValue!.entity_id = splitIds;
    }
    if (deviceIds) {
      const splitIds = deviceIds.split(",");
      this._targetPickerValue!.device_id = splitIds;
    }
    if (areaIds) {
      const splitIds = areaIds.split(",");
      this._targetPickerValue!.area_id = splitIds;
    }
    if (floorIds) {
      const splitIds = floorIds.split(",");
      this._targetPickerValue!.floor_id = splitIds;
    }
    if (labelsIds) {
      const splitIds = labelsIds.split(",");
      this._targetPickerValue!.label_id = splitIds;
    }

    const startDate = searchParams.start_date;
    if (startDate) {
      this._startDate = new Date(startDate);
    }
    const endDate = searchParams.end_date;
    if (endDate) {
      this._endDate = new Date(endDate);
    }
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
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
      (!this._stateHistory &&
        (changedProps.has("_deviceEntityLookup") ||
          changedProps.has("_areaEntityLookup") ||
          changedProps.has("_areaDeviceLookup")))
    ) {
      this._getHistory();
      this._getStats();
    }
  }

  private _removeAll() {
    this._targetPickerValue = {};
    this._updatePath();
  }

  private async _getStats() {
    const statisticIds = this._getEntityIds();

    if (statisticIds.length === 0) {
      this._statisticsHistory = undefined;
      return;
    }

    const statistics = await fetchStatistics(
      this.hass!,
      this._startDate,
      this._endDate,
      statisticIds,
      "hour",
      undefined,
      ["mean", "state"]
    );

    // Maintain the statistic id ordering
    const orderedStatistics: Statistics = {};
    statisticIds.forEach((id) => {
      if (id in statistics) {
        orderedStatistics[id] = statistics[id];
      }
    });

    // Convert statistics to HistoryResult format
    const statsHistoryStates: HistoryStates = {};
    Object.entries(orderedStatistics).forEach(([key, value]) => {
      const entityHistoryStates: EntityHistoryState[] = value.map((e) => ({
        s: e.mean != null ? e.mean.toString() : e.state!.toString(),
        lc: e.start / 1000,
        a: {},
        lu: e.start / 1000,
      }));
      statsHistoryStates[key] = entityHistoryStates;
    });

    const { numeric_device_classes: sensorNumericDeviceClasses } =
      await getSensorNumericDeviceClasses(this.hass);

    this._statisticsHistory = computeHistory(
      this.hass,
      statsHistoryStates,
      [],
      this.hass.localize,
      sensorNumericDeviceClasses,
      true
    );
    // remap states array to statistics array
    (this._statisticsHistory?.line || []).forEach((item) => {
      item.data.forEach((data) => {
        data.statistics = data.states;
        data.states = [];
      });
    });
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

    const { numeric_device_classes: sensorNumericDeviceClasses } =
      await getSensorNumericDeviceClasses(this.hass);

    this._subscribed = subscribeHistory(
      this.hass,
      (history) => {
        this._isLoading = false;
        this._stateHistory = computeHistory(
          this.hass,
          history,
          entityIds,
          this.hass.localize,
          sensorNumericDeviceClasses,
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
      this._subscribed.then((unsub) => unsub?.());
      this._subscribed = undefined;
    }
  }

  private _getEntityIds(): string[] {
    return this.__getEntityIds(
      this._targetPickerValue,
      this.hass.entities,
      this.hass.devices,
      this.hass.areas
    );
  }

  private __getEntityIds = memoizeOne(
    (
      targetPickerValue: HassServiceTarget,
      entities: HomeAssistant["entities"],
      devices: HomeAssistant["devices"],
      areas: HomeAssistant["areas"]
    ): string[] => {
      if (!targetPickerValue) {
        return [];
      }

      const targetSelector = { target: {} };
      const targetEntities = new Set(ensureArray(targetPickerValue.entity_id));
      const targetDevices = new Set(ensureArray(targetPickerValue.device_id));
      const targetAreas = new Set(ensureArray(targetPickerValue.area_id));
      const targetFloors = new Set(ensureArray(targetPickerValue.floor_id));
      const targetLabels = new Set(ensureArray(targetPickerValue.label_id));

      targetLabels.forEach((labelId) => {
        const expanded = expandLabelTarget(
          this.hass,
          labelId,
          areas,
          devices,
          entities,
          targetSelector
        );
        expanded.devices.forEach((id) => targetDevices.add(id));
        expanded.entities.forEach((id) => targetEntities.add(id));
        expanded.areas.forEach((id) => targetAreas.add(id));
      });

      targetFloors.forEach((floorId) => {
        const expanded = expandFloorTarget(
          this.hass,
          floorId,
          areas,
          targetSelector
        );
        expanded.areas.forEach((id) => targetAreas.add(id));
      });

      targetAreas.forEach((areaId) => {
        const expanded = expandAreaTarget(
          this.hass,
          areaId,
          devices,
          entities,
          targetSelector
        );
        expanded.devices.forEach((id) => targetDevices.add(id));
        expanded.entities.forEach((id) => targetEntities.add(id));
      });

      targetDevices.forEach((deviceId) => {
        const expanded = expandDeviceTarget(
          this.hass,
          deviceId,
          entities,
          targetSelector
        );
        expanded.entities.forEach((id) => targetEntities.add(id));
      });

      return Array.from(targetEntities);
    }
  );

  private _dateRangeChanged(ev) {
    this._startDate = ev.detail.startDate;
    const endDate = ev.detail.endDate;
    if (endDate.getHours() === 0 && endDate.getMinutes() === 0) {
      endDate.setDate(endDate.getDate() + 1);
      endDate.setMilliseconds(endDate.getMilliseconds() - 1);
    }
    this._endDate = endDate;

    this._updatePath();
  }

  private _targetsChanged(ev) {
    this._targetPickerValue = ev.detail.value || {};
    this._updatePath();
  }

  private _updatePath() {
    const params: Record<string, string> = {};

    if (this._targetPickerValue.entity_id) {
      params.entity_id = ensureArray(this._targetPickerValue.entity_id).join(
        ","
      );
    }
    if (this._targetPickerValue.label_id) {
      params.label_id = ensureArray(this._targetPickerValue.label_id).join(",");
    }
    if (this._targetPickerValue.floor_id) {
      params.floor_id = ensureArray(this._targetPickerValue.floor_id).join(",");
    }
    if (this._targetPickerValue.area_id) {
      params.area_id = ensureArray(this._targetPickerValue.area_id).join(",");
    }
    if (this._targetPickerValue.device_id) {
      params.device_id = ensureArray(this._targetPickerValue.device_id).join(
        ","
      );
    }

    if (this._startDate) {
      params.start_date = this._startDate.toISOString();
    }

    if (this._endDate) {
      params.end_date = this._endDate.toISOString();
    }

    navigate(`/history?${createSearchParam(params)}`, { replace: true });
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

  static get styles() {
    return [
      haStyle,
      css`
        .content {
          padding: 0 16px 16px;
          padding-bottom: max(env(safe-area-inset-bottom), 16px);
        }

        :host([virtualize]) {
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
          align-items: flex-start;
          margin-top: 16px;
        }

        ha-date-range-picker {
          margin-right: 16px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
          max-width: 100%;
          direction: var(--direction);
        }

        @media all and (max-width: 1025px) {
          .filters {
            flex-direction: column;
          }
          ha-date-range-picker {
            margin-right: 0;
            margin-inline-end: 0;
            margin-inline-start: initial;
            width: 100%;
          }
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

customElements.define("ha-panel-history", HaPanelHistory);

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-history": HaPanelHistory;
  }
}
