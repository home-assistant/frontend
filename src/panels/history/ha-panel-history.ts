import { mdiFilterRemove, mdiRefresh } from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import {
  addDays,
  endOfToday,
  endOfWeek,
  endOfYesterday,
  startOfToday,
  startOfWeek,
  startOfYesterday,
} from "date-fns/esm";
import {
  HassServiceTarget,
  UnsubscribeFunc,
} from "home-assistant-js-websocket/dist/types";
import { css, html, LitElement, PropertyValues } from "lit";
import { property, state } from "lit/decorators";
import { LocalStorage } from "../../common/decorators/local-storage";
import { ensureArray } from "../../common/ensure-array";
import { navigate } from "../../common/navigate";
import {
  createSearchParam,
  extractSearchParamsObject,
} from "../../common/url/search-params";
import { computeRTL } from "../../common/util/compute_rtl";
import "../../components/chart/state-history-charts";
import "../../components/ha-circular-progress";
import "../../components/ha-date-range-picker";
import type { DateRangePickerRanges } from "../../components/ha-date-range-picker";
import "../../components/ha-icon-button";
import "../../components/ha-menu-button";
import "../../components/ha-target-picker";
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
import { computeHistory, fetchDateWS } from "../../data/history";
import "../../layouts/ha-app-layout";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";

class HaPanelHistory extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) hass!: HomeAssistant;

  @property({ reflect: true, type: Boolean }) narrow!: boolean;

  @property({ reflect: true, type: Boolean }) rtl = false;

  @state() private _startDate: Date;

  @state() private _endDate: Date;

  @LocalStorage("historyPickedValue", true, false)
  private _targetPickerValue?: HassServiceTarget;

  @state() private _isLoading = false;

  @state() private _stateHistory?;

  @state() private _ranges?: DateRangePickerRanges;

  @state() private _deviceEntityLookup?: DeviceEntityLookup;

  @state() private _areaEntityLookup?: AreaEntityLookup;

  @state() private _areaDeviceLookup?: AreaDeviceLookup;

  public constructor() {
    super();

    const start = new Date();
    start.setHours(start.getHours() - 2, 0, 0, 0);
    this._startDate = start;

    const end = new Date();
    end.setHours(end.getHours() + 1, 0, 0, 0);
    this._endDate = end;
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

  protected render() {
    return html`
      <ha-app-layout>
        <app-header slot="header" fixed>
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>${this.hass.localize("panel.history")}</div>
            ${this._targetPickerValue
              ? html`
                  <ha-icon-button
                    @click=${this._removeAll}
                    .disabled=${this._isLoading}
                    .path=${mdiFilterRemove}
                    .label=${this.hass.localize("ui.panel.history.remove_all")}
                  ></ha-icon-button>
                `
              : ""}
            <ha-icon-button
              @click=${this._getHistory}
              .disabled=${this._isLoading || !this._targetPickerValue}
              .path=${mdiRefresh}
              .label=${this.hass.localize("ui.common.refresh")}
            ></ha-icon-button>
          </app-toolbar>
        </app-header>

        <div class="flex content">
          <div class="filters flex layout horizontal narrow-wrap">
            <ha-date-range-picker
              .hass=${this.hass}
              ?disabled=${this._isLoading}
              .startDate=${this._startDate}
              .endDate=${this._endDate}
              .ranges=${this._ranges}
              @change=${this._dateRangeChanged}
            ></ha-date-range-picker>
            <ha-target-picker
              .hass=${this.hass}
              .value=${this._targetPickerValue}
              .disabled=${this._isLoading}
              horizontal
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
                  .endTime=${this._endDate}
                  no-single
                >
                </state-history-charts>
              `}
        </div>
      </ha-app-layout>
    `;
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (this.hasUpdated) {
      return;
    }

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
      this._stateHistory = [];
      return;
    }
    try {
      const dateHistory = await fetchDateWS(
        this.hass,
        this._startDate,
        this._endDate,
        entityIds
      );

      this._stateHistory = computeHistory(
        this.hass,
        dateHistory,
        this.hass.localize
      );
    } finally {
      this._isLoading = false;
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
        }

        state-history-charts {
          height: calc(100vh - 136px);
        }

        :host([narrow]) state-history-charts {
          height: calc(100vh - 198px);
        }

        .progress-wrapper {
          height: calc(100vh - 136px);
        }

        :host([narrow]) .progress-wrapper {
          height: calc(100vh - 198px);
        }

        :host([virtualize]) {
          height: 100%;
        }

        :host([narrow]) .narrow-wrap {
          flex-wrap: wrap;
        }

        .horizontal {
          align-items: center;
        }

        :host(:not([narrow])) .selector-padding {
          padding-left: 32px;
        }

        .progress-wrapper {
          position: relative;
        }

        .filters {
          display: flex;
          align-items: flex-start;
          padding: 8px 16px 0;
        }

        :host([narrow]) .filters {
          flex-wrap: wrap;
        }

        ha-date-range-picker {
          margin-right: 16px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
          max-width: 100%;
          direction: var(--direction);
        }

        :host([narrow]) ha-date-range-picker {
          margin-right: 0;
          margin-inline-end: 0;
          margin-inline-start: initial;
          direction: var(--direction);
        }

        ha-circular-progress {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
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
