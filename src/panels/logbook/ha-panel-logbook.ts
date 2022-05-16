import { mdiRefresh } from "@mdi/js";
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
} from "date-fns";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { navigate } from "../../common/navigate";
import {
  createSearchParam,
  extractSearchParamsObject,
} from "../../common/url/search-params";
import { computeRTL } from "../../common/util/compute_rtl";
import "../../components/entity/ha-entity-picker";
import "../../components/ha-date-range-picker";
import type { DateRangePickerRanges } from "../../components/ha-date-range-picker";
import "../../components/ha-icon-button";
import "../../components/ha-menu-button";
import "../../layouts/ha-app-layout";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import "./ha-logbook";

@customElement("ha-panel-logbook")
export class HaPanelLogbook extends LitElement {
  @property() hass!: HomeAssistant;

  @property({ reflect: true, type: Boolean }) narrow!: boolean;

  @state() _time: { range: [Date, Date] };

  @state() _entityId = "";

  @property({ reflect: true, type: Boolean }) rtl = false;

  @state() private _ranges?: DateRangePickerRanges;

  public constructor() {
    super();

    const start = new Date();
    start.setHours(start.getHours() - 2, 0, 0, 0);

    const end = new Date();
    end.setHours(end.getHours() + 1, 0, 0, 0);

    this._time = { range: [start, end] };
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
            <div main-title>${this.hass.localize("panel.logbook")}</div>
            <ha-icon-button
              @click=${this._refreshLogbook}
              .path=${mdiRefresh}
              .label=${this.hass!.localize("ui.common.refresh")}
            ></ha-icon-button>
          </app-toolbar>
        </app-header>

        <div class="filters">
          <ha-date-range-picker
            .hass=${this.hass}
            .startDate=${this._time.range[0]}
            .endDate=${this._time.range[1]}
            .ranges=${this._ranges}
            @change=${this._dateRangeChanged}
          ></ha-date-range-picker>

          <ha-entity-picker
            .hass=${this.hass}
            .value=${this._entityId}
            .label=${this.hass.localize(
              "ui.components.entity.entity-picker.entity"
            )}
            @change=${this._entityPicked}
          ></ha-entity-picker>
        </div>

        <ha-logbook
          .hass=${this.hass}
          .time=${this._time}
          .entityId=${this._entityId}
          virtualize
        ></ha-logbook>
      </ha-app-layout>
    `;
  }

  protected willUpdate(changedProps: PropertyValues) {
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

    const searchParams = new URLSearchParams(location.search);

    this._entityId = searchParams.get("entity_id") ?? "";

    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (startDate || endDate) {
      this._time = {
        range: [
          startDate ? new Date(startDate) : this._time.range[0],
          endDate ? new Date(endDate) : this._time.range[1],
        ],
      };
    }
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("title");
  }

  protected updated(changedProps: PropertyValues<this>) {
    if (changedProps.has("_time") || changedProps.has("_entityId")) {
      this._refreshLogbook();
    }

    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass || oldHass.language !== this.hass.language) {
        this.rtl = computeRTL(this.hass);
      }
    }
  }

  private _dateRangeChanged(ev) {
    const startDate = ev.detail.startDate;
    const endDate = ev.detail.endDate;
    if (endDate.getHours() === 0 && endDate.getMinutes() === 0) {
      endDate.setDate(endDate.getDate() + 1);
      endDate.setMilliseconds(endDate.getMilliseconds() - 1);
    }
    this._time = { range: [startDate, endDate] };
    this._updatePath({
      start_date: this._time.range[0].toISOString(),
      end_date: this._time.range[1].toISOString(),
    });
  }

  private _entityPicked(ev) {
    this._entityId = ev.target.value;
    this._updatePath({ entity_id: this._entityId });
  }

  private _updatePath(update: Record<string, string>) {
    const params = extractSearchParamsObject();
    for (const [key, value] of Object.entries(update)) {
      if (value === undefined) {
        delete params[key];
      } else {
        params[key] = value;
      }
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
        ha-logbook,
        .progress-wrapper {
          height: calc(100vh - 136px);
        }

        :host([narrow]) ha-logbook,
        :host([narrow]) .progress-wrapper {
          height: calc(100vh - 198px);
        }

        ha-date-range-picker {
          margin-right: 16px;
          max-width: 100%;
        }

        :host([narrow]) ha-date-range-picker {
          margin-right: 0;
        }

        .progress-wrapper {
          position: relative;
        }

        .filters {
          display: flex;
          align-items: flex-end;
          padding: 8px 16px 0;
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
