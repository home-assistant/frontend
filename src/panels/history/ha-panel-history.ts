import { mdiCollapseAll, mdiRefresh } from "@mdi/js";
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
import { UnsubscribeFunc } from "home-assistant-js-websocket/dist/types";
import { css, html, LitElement, PropertyValues } from "lit";
import { property, state } from "lit/decorators";
import { LocalStorage } from "../../common/decorators/local-storage";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { navigate } from "../../common/navigate";
import {
  createSearchParam,
  extractSearchParam,
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
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../data/entity_registry";
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

  @LocalStorage("historyPickedValue", true, false) private _targetPickerValue?;

  @state() private _isLoading = false;

  @state() private _stateHistory?;

  @state() private _ranges?: DateRangePickerRanges;

  @state() private _devices?: { [deviceId: string]: DeviceRegistryEntry };

  @state() private _entities?: { [entityId: string]: EntityRegistryEntry };

  @state() private _stateEntities?: { [entityId: string]: EntityRegistryEntry };

  @state() private _deviceIdToEntities?: {
    [deviceId: string]: EntityRegistryEntry[];
  };

  @state() private _areaIdToEntities?: {
    [areaId: string]: EntityRegistryEntry[];
  };

  @state() private _areaIdToDevices?: {
    [areaId: string]: DeviceRegistryEntry[];
  };

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
        this._entities = entities.reduce((accumulator, current) => {
          accumulator[current.entity_id] = current;
          return accumulator;
        }, {});
        this._deviceIdToEntities = entities.reduce((accumulator, current) => {
          if (!current.device_id) {
            return accumulator;
          }
          let found = accumulator[current.device_id];
          if (found === undefined) {
            found = [];
            accumulator[current.device_id] = found;
          }
          found.push(current);
          return accumulator;
        }, {});
        this._areaIdToEntities = entities.reduce((accumulator, current) => {
          if (!current.area_id) {
            return accumulator;
          }
          let found = accumulator[current.area_id];
          if (found === undefined) {
            found = [];
            accumulator[current.area_id] = found;
          }
          found.push(current);
          return accumulator;
        }, {});
      }),
      subscribeDeviceRegistry(this.hass.connection!, (devices) => {
        this._devices = devices.reduce((accumulator, current) => {
          accumulator[current.id] = current;
          return accumulator;
        }, {});
        this._areaIdToDevices = devices.reduce((accumulator, current) => {
          if (!current.area_id) {
            return accumulator;
          }
          let found = accumulator[current.area_id];
          if (found === undefined) {
            found = [];
            accumulator[current.area_id] = found;
          }
          found.push(current);
          return accumulator;
        }, {});
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
                    .path=${mdiCollapseAll}
                    .label=${this.hass.localize("ui.panel.history.remove_all")}
                  ></ha-icon-button>
                `
              : ""}
            <ha-icon-button
              @click=${this._getHistory}
              .disabled=${this._isLoading}
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
              @value-changed=${this._entitiesChanged}
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

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

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

    const entityIds = extractSearchParam("entity_id");
    if (entityIds) {
      const splitEntityIds = entityIds.split(",");
      this._targetPickerValue = {
        entity_id: splitEntityIds,
      };
    }

    const startDate = extractSearchParam("start_date");
    if (startDate) {
      this._startDate = new Date(startDate);
    }
    const endDate = extractSearchParam("end_date");
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
          (changedProps.has("_entities") ||
            changedProps.has("_devices") ||
            changedProps.has("_stateEntities") ||
            changedProps.has("_deviceIdToEntities") ||
            changedProps.has("_areaIdToEntities") ||
            changedProps.has("_areaIdToDevices"))))
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

    if (this._entities) {
      const stateEntities: { [entityId: string]: EntityRegistryEntry } = {};
      const regEntityIds = new Set(Object.keys(this._entities));
      for (const entityId of Object.keys(this.hass.states)) {
        if (regEntityIds.has(entityId)) {
          continue;
        }
        stateEntities[entityId] = {
          name: computeStateName(this.hass.states[entityId]),
          entity_id: entityId,
          platform: computeDomain(entityId),
          disabled_by: null,
          hidden_by: null,
          area_id: null,
          config_entry_id: null,
          device_id: null,
          icon: null,
          entity_category: null,
        };
      }
      this._stateEntities = stateEntities;
    }
  }

  private _removeAll() {
    this._targetPickerValue = undefined;
    this._updatePath();
  }

  private async _getHistory() {
    this._isLoading = true;
    const entityIds = this._getEntityIds();

    if (entityIds === undefined) {
      this._stateHistory = undefined;
      return;
    }

    if (entityIds.length === 0) {
      this._isLoading = false;
      this._stateHistory = [];
      return;
    }

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
    this._isLoading = false;
  }

  private _getEntityIds(): string[] | undefined {
    if (
      this._targetPickerValue === undefined ||
      this._entities === undefined ||
      this._stateEntities === undefined ||
      this._devices === undefined ||
      this._deviceIdToEntities === undefined ||
      this._areaIdToEntities === undefined ||
      this._areaIdToDevices === undefined
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
      searchingAreaId =
        typeof searchingAreaId === "string"
          ? [searchingAreaId]
          : searchingAreaId;
      for (const singleSearchingAreaId of searchingAreaId) {
        const foundEntities = this._areaIdToEntities[singleSearchingAreaId];
        if (foundEntities?.length) {
          for (const foundEntity of foundEntities) {
            if (foundEntity.entity_category === null) {
              entityIds.add(foundEntity.entity_id);
            }
          }
        }

        const foundDevices = this._areaIdToDevices[singleSearchingAreaId];
        if (foundDevices) {
          for (const foundDevice of foundDevices) {
            const foundDeviceEntities =
              this._deviceIdToEntities[foundDevice.id];
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
    }

    if (searchingDeviceId) {
      searchingDeviceId =
        typeof searchingDeviceId === "string"
          ? [searchingDeviceId]
          : searchingDeviceId;
      for (const singleSearchingDeviceId of searchingDeviceId) {
        const foundEntities = this._deviceIdToEntities[singleSearchingDeviceId];
        if (foundEntities?.length) {
          for (const foundEntity of foundEntities) {
            if (foundEntity.entity_category === null) {
              entityIds.add(foundEntity.entity_id);
            }
          }
        }
      }
    }

    if (searchingEntityId !== undefined) {
      searchingEntityId =
        typeof searchingEntityId === "string"
          ? [searchingEntityId]
          : searchingEntityId;
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

  private _entitiesChanged(ev) {
    this._targetPickerValue = ev.detail.value;
    this._updatePath();
  }

  private _updatePath() {
    const params: Record<string, string> = {};

    if (this._targetPickerValue) {
      params.entity_id = this._getEntityIds()?.join(",") || "";
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
