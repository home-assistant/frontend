import { mdiRefresh } from "@mdi/js";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { storage } from "../../common/decorators/storage";
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
import "../../components/date-picker/ha-date-range-picker";
import "../../components/ha-icon-button";
import "../../components/ha-target-picker";
import "../../components/ha-top-app-bar-fixed";
import type { HaEntityPickerEntityFilterFunc } from "../../data/entity/entity";
import { filterLogbookCompatibleEntities } from "../../data/logbook";
import { resolveEntityIDs } from "../../data/selector";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "./ha-logbook";

@customElement("ha-panel-logbook")
export class HaPanelLogbook extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() _time: { range: [Date, Date] };

  @state() _entityIds?: string[];

  @state()
  private _showBack?: boolean;

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

  public constructor() {
    super();

    const start = new Date();
    start.setHours(start.getHours() - 1, 0, 0, 0);

    const end = new Date();
    end.setHours(end.getHours() + 2, 0, 0, 0);

    this._time = { range: [start, end] };
  }

  protected render() {
    return html`
      <ha-top-app-bar-fixed
        .narrow=${this.narrow}
        .backButton=${!!this._showBack}
      >
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
            .narrow=${this.narrow}
            show-cause
            virtualize
          ></ha-logbook>
        </div>
      </ha-top-app-bar-fixed>
    `;
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
    const queryParams = decodeHistoryLogbookQueryParams(
      extractSearchParamsObject()
    );
    const targetPickerValue = historyLogbookTargetFromQueryParams(queryParams);
    if (targetPickerValue) {
      this._targetPickerValue = targetPickerValue;
    } else if (!this.hasUpdated && this._storedTargetPickerValue) {
      this._targetPickerValue = this._storedTargetPickerValue;
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

  private _refreshLogbook() {
    this.shadowRoot!.querySelector("ha-logbook")?.refresh();
  }

  static get styles() {
    return [
      haStyle,
      css`
        :host {
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
          overflow-x: hidden;
          padding: 0 0 16px;
        }

        ha-logbook {
          flex: 1;
          min-height: 0;
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

          .filters {
            flex-direction: column;
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
          overflow-x: hidden;
        }

        .filters {
          display: flex;
          padding: 16px 16px 0;
        }

        :host([narrow]) .filters {
          flex-wrap: wrap;
        }

        ha-target-picker {
          flex: 1;
          max-width: 100%;
          min-width: 0;
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
