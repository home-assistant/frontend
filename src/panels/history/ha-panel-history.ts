import { mdiFilterRemove, mdiRefresh } from "@mdi/js";
import { differenceInHours } from "date-fns/esm";
import {
  HassServiceTarget,
  UnsubscribeFunc,
} from "home-assistant-js-websocket/dist/types";
import { LitElement, PropertyValues, css, html } from "lit";
import { property, query, state } from "lit/decorators";
import { ensureArray } from "../../common/array/ensure-array";
import { storage } from "../../common/decorators/storage";
import { navigate } from "../../common/navigate";
import { constructUrlCurrentPath } from "../../common/url/construct-url";
import {
  createSearchParam,
  extractSearchParamsObject,
  removeSearchParam,
} from "../../common/url/search-params";
import { computeRTL } from "../../common/util/compute_rtl";
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
  AreaDeviceLookup,
  AreaEntityLookup,
  getAreaDeviceLookup,
  getAreaEntityLookup,
} from "../../data/area_registry";
import {
  DeviceEntityLookup,
  getDeviceEntityLookup,
  subscribeDeviceRegistry,
} from "../../data/device_registry";
import { subscribeEntityRegistry } from "../../data/entity_registry";
import {
  HistoryResult,
  computeHistory,
  subscribeHistory,
} from "../../data/history";
import { getSensorNumericDeviceClasses } from "../../data/sensor";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";

class HaPanelHistory extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) hass!: HomeAssistant;

  @property({ reflect: true, type: Boolean }) narrow!: boolean;

  @property({ reflect: true, type: Boolean }) rtl = false;

  @state() private _startDate: Date;

  @state() private _endDate: Date;

  @storage({
    key: "historyPickedValue",
    state: true,
    subscribe: false,
  })
  private _targetPickerValue?: HassServiceTarget;

  @state() private _isLoading = false;

  @state() private _stateHistory?: HistoryResult;

  @state() private _deviceEntityLookup?: DeviceEntityLookup;

  @state() private _areaEntityLookup?: AreaEntityLookup;

  @state() private _areaDeviceLookup?: AreaDeviceLookup;

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

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._deviceEntityLookup = getDeviceEntityLookup(entities);
        this._areaEntityLookup = getAreaEntityLookup(entities);
      }),
      subscribeDeviceRegistry(this.hass.connection!, (devices) => {
        this._areaDeviceLookup = getAreaDeviceLookup(devices);
      }),
    ];
  }

  private _goBack(): void {
    history.back();
  }

  protected render() {
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
        ${this._targetPickerValue
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
          @click=${this._getHistory}
          .disabled=${this._isLoading || !this._targetPickerValue}
          .path=${mdiRefresh}
          .label=${this.hass.localize("ui.common.refresh")}
        ></ha-icon-button>

        <div class="flex content">
          <div class="filters">
            <ha-date-range-picker
              .hass=${this.hass}
              ?disabled=${this._isLoading}
              .startDate=${this._startDate}
              .endDate=${this._endDate}
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
                <ha-circular-progress
                  active
                  alt=${this.hass.localize("ui.common.loading")}
                ></ha-circular-progress>
              </div>`
            : !this._targetPickerValue
            ? html`<div class="start-search">
                ${this.hass.localize("ui.panel.history.start_search")}
              </div>`
            : html`
                <state-history-charts
                  .hass=${this.hass}
                  .historyData=${this._stateHistory}
                  .startTime=${this._startDate}
                  .endTime=${this._endDate}
                >
                </state-history-charts>
              `}
        </div>
      </ha-top-app-bar-fixed>
    `;
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (this.hasUpdated) {
      return;
    }

    const searchParams = extractSearchParamsObject();
    const entityIds = searchParams.entity_id;
    const deviceIds = searchParams.device_id;
    const areaIds = searchParams.area_id;
    if (entityIds || deviceIds || areaIds) {
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
      this._targetPickerValue &&
      (changedProps.has("_startDate") ||
        changedProps.has("_endDate") ||
        changedProps.has("_targetPickerValue") ||
        (!this._stateHistory &&
          (changedProps.has("_deviceEntityLookup") ||
            changedProps.has("_areaEntityLookup") ||
            changedProps.has("_areaDeviceLookup"))))
    ) {
      this._getHistory();
    }

    if (!changedProps.has("hass") && !changedProps.has("_entities")) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass || oldHass.language !== this.hass.language) {
      this.rtl = computeRTL(this.hass);
    }
  }

  private _removeAll() {
    this._targetPickerValue = undefined;
    this._updatePath();
  }

  private async _getHistory() {
    if (!this._targetPickerValue) {
      return;
    }
    this._isLoading = true;
    const entityIds = this._getEntityIds();

    if (entityIds === undefined) {
      this._isLoading = false;
      this._stateHistory = undefined;
      return;
    }

    if (entityIds.length === 0) {
      this._isLoading = false;
      this._stateHistory = { line: [], timeline: [] };
      return;
    }

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
          this.hass.localize,
          sensorNumericDeviceClasses
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

  private _getEntityIds(): string[] | undefined {
    if (
      !this._targetPickerValue ||
      this._deviceEntityLookup === undefined ||
      this._areaEntityLookup === undefined ||
      this._areaDeviceLookup === undefined
    ) {
      return undefined;
    }

    const entityIds = new Set<string>();
    let {
      area_id: searchingAreaId,
      device_id: searchingDeviceId,
      entity_id: searchingEntityId,
    } = this._targetPickerValue;

    if (searchingAreaId) {
      searchingAreaId = ensureArray(searchingAreaId);
      for (const singleSearchingAreaId of searchingAreaId) {
        const foundEntities = this._areaEntityLookup[singleSearchingAreaId];
        if (foundEntities?.length) {
          for (const foundEntity of foundEntities) {
            if (foundEntity.entity_category === null) {
              entityIds.add(foundEntity.entity_id);
            }
          }
        }

        const foundDevices = this._areaDeviceLookup[singleSearchingAreaId];
        if (!foundDevices?.length) {
          continue;
        }

        for (const foundDevice of foundDevices) {
          const foundDeviceEntities = this._deviceEntityLookup[foundDevice.id];
          if (!foundDeviceEntities?.length) {
            continue;
          }

          for (const foundDeviceEntity of foundDeviceEntities) {
            if (
              (!foundDeviceEntity.area_id ||
                foundDeviceEntity.area_id === singleSearchingAreaId) &&
              foundDeviceEntity.entity_category === null
            ) {
              entityIds.add(foundDeviceEntity.entity_id);
            }
          }
        }
      }
    }

    if (searchingDeviceId) {
      searchingDeviceId = ensureArray(searchingDeviceId);
      for (const singleSearchingDeviceId of searchingDeviceId) {
        const foundEntities = this._deviceEntityLookup[singleSearchingDeviceId];
        if (!foundEntities?.length) {
          continue;
        }

        for (const foundEntity of foundEntities) {
          if (foundEntity.entity_category === null) {
            entityIds.add(foundEntity.entity_id);
          }
        }
      }
    }

    if (searchingEntityId) {
      searchingEntityId = ensureArray(searchingEntityId);
      for (const singleSearchingEntityId of searchingEntityId) {
        entityIds.add(singleSearchingEntityId);
      }
    }

    return [...entityIds];
  }

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
    this._targetPickerValue = ev.detail.value;
    this._updatePath();
  }

  private _updatePath() {
    const params: Record<string, string> = {};

    if (this._targetPickerValue) {
      if (this._targetPickerValue.entity_id) {
        params.entity_id = ensureArray(this._targetPickerValue.entity_id).join(
          ","
        );
      }
      if (this._targetPickerValue.area_id) {
        params.area_id = ensureArray(this._targetPickerValue.area_id).join(",");
      }
      if (this._targetPickerValue.device_id) {
        params.device_id = ensureArray(this._targetPickerValue.device_id).join(
          ","
        );
      }
    }

    if (this._startDate) {
      params.start_date = this._startDate.toISOString();
    }

    if (this._endDate) {
      params.end_date = this._endDate.toISOString();
    }

    navigate(`/history?${createSearchParam(params)}`, { replace: true });
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
