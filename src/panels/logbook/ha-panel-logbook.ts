import { mdiRefresh } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import memoizeOne from "memoize-one";
import { goBack, navigate } from "../../common/navigate";
import { constructUrlCurrentPath } from "../../common/url/construct-url";
import {
  createSearchParam,
  extractSearchParamsObject,
  removeSearchParam,
} from "../../common/url/search-params";
import "../../components/entity/ha-entity-picker";
import "../../components/ha-date-range-picker";
import "../../components/ha-icon-button";
import "../../components/ha-icon-button-arrow-prev";
import "../../components/ha-menu-button";
import "../../components/ha-top-app-bar-fixed";
import "../../components/ha-target-picker";
import { filterLogbookCompatibleEntities } from "../../data/logbook";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "./ha-logbook";
import { storage } from "../../common/decorators/storage";
import { ensureArray } from "../../common/array/ensure-array";
import { resolveEntityIDs } from "../../data/selector";
import { getSensorNumericDeviceClasses } from "../../data/sensor";
import type { HaEntityPickerEntityFilterFunc } from "../../components/entity/ha-entity-picker";

@customElement("ha-panel-logbook")
export class HaPanelLogbook extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() _time: { range: [Date, Date] };

  @state() _entityIds?: string[];

  @state()
  private _showBack?: boolean;

  @state()
  @storage({
    key: "logbookPickedValue",
    state: true,
    subscribe: false,
  })
  private _targetPickerValue: HassServiceTarget = {};

  @state() private _sensorNumericDeviceClasses?: string[] = [];

  public constructor() {
    super();

    const start = new Date();
    start.setHours(start.getHours() - 1, 0, 0, 0);

    const end = new Date();
    end.setHours(end.getHours() + 2, 0, 0, 0);

    this._time = { range: [start, end] };
  }

  private _goBack(): void {
    goBack();
  }

  protected render() {
    return html`
      <ha-top-app-bar-fixed .narrow=${this.narrow}>
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
        <div slot="title">${this.hass.localize("panel.logbook")}</div>
        <ha-icon-button
          slot="actionItems"
          @click=${this._refreshLogbook}
          .path=${mdiRefresh}
          .label=${this.hass!.localize("ui.common.refresh")}
        ></ha-icon-button>

        <div class="content">
          <div class="filters">
            <ha-date-range-picker
              .hass=${this.hass}
              .startDate=${this._time.range[0]}
              .endDate=${this._time.range[1]}
              @value-changed=${this._dateRangeChanged}
              time-picker
            ></ha-date-range-picker>

            <ha-target-picker
              .hass=${this.hass}
              .entityFilter=${this._filterFunc}
              .value=${this._targetPickerValue}
              add-on-top
              @value-changed=${this._targetsChanged}
              compact
            ></ha-target-picker>
          </div>

          <ha-logbook
            .hass=${this.hass}
            .time=${this._time}
            .entityIds=${this._getEntityIds()}
            virtualize
          ></ha-logbook>
        </div>
      </ha-top-app-bar-fixed>
    `;
  }

  private _filterFunc: HaEntityPickerEntityFilterFunc = (entity) =>
    filterLogbookCompatibleEntities(entity, this._sensorNumericDeviceClasses);

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (this.hasUpdated) {
      return;
    }

    this._applyURLParams();
  }

  private async _loadNumericDeviceClasses() {
    const deviceClasses = await getSensorNumericDeviceClasses(this.hass);
    this._sensorNumericDeviceClasses = deviceClasses.numeric_device_classes;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("title");
    this._loadNumericDeviceClasses();

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

  private _getEntityIds(): string[] | undefined {
    const entities = this.__getEntityIds(
      this._targetPickerValue,
      this.hass.entities,
      this.hass.devices,
      this.hass.areas
    );
    if (entities.length === 0) {
      return undefined;
    }
    return entities;
  }

  private __getEntityIds = memoizeOne(
    (
      targetPickerValue: HassServiceTarget,
      entities: HomeAssistant["entities"],
      devices: HomeAssistant["devices"],
      areas: HomeAssistant["areas"]
    ): string[] =>
      resolveEntityIDs(this.hass, targetPickerValue, entities, devices, areas)
  );

  private _applyURLParams() {
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

    const startDateStr = searchParams.start_date;
    const endDateStr = searchParams.end_date;

    if (startDateStr || endDateStr) {
      const startDate = startDateStr
        ? new Date(startDateStr)
        : this._time.range[0];
      const endDate = endDateStr ? new Date(endDateStr) : this._time.range[1];

      // Only set if date has changed.
      if (
        startDate.getTime() !== this._time.range[0].getTime() ||
        endDate.getTime() !== this._time.range[1].getTime()
      ) {
        this._time = {
          range: [
            startDateStr ? new Date(startDateStr) : this._time.range[0],
            endDateStr ? new Date(endDateStr) : this._time.range[1],
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

    if (this._time.range[0]) {
      params.start_date = this._time.range[0].toISOString();
    }

    if (this._time.range[1]) {
      params.end_date = this._time.range[1].toISOString();
    }

    navigate(`/logbook?${createSearchParam(params)}`, { replace: true });
  }

  private _refreshLogbook() {
    this.shadowRoot!.querySelector("ha-logbook")?.refresh();
  }

  static get styles() {
    return [
      haStyle,
      css`
        ha-logbook {
          height: calc(
            100vh -
              168px - var(--safe-area-inset-top, 0px) - var(
                --safe-area-inset-bottom,
                0px
              )
          );
        }

        :host([narrow]) ha-logbook {
          height: calc(
            100vh -
              250px - var(--safe-area-inset-top, 0px) - var(
                --safe-area-inset-bottom,
                0px
              )
          );
        }

        ha-date-range-picker {
          margin-right: 16px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
          max-width: 100%;
          direction: var(--direction);
        }

        @media all and (max-width: 870px) {
          ha-date-range-picker {
            width: 100%;
          }
        }

        :host([narrow]) ha-date-range-picker {
          margin-right: 0;
          margin-inline-end: 0;
          margin-inline-start: initial;
          direction: var(--direction);
          margin-bottom: 8px;
        }

        .content {
          overflow: hidden;
        }

        .filters {
          display: flex;
          padding: 16px 16px 0;
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

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-logbook": HaPanelLogbook;
  }
}
