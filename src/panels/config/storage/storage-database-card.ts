import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { getGraphColorByIndex } from "../../../common/color/colors";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { formatNumber } from "../../../common/number/format_number";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-segmented-bar";
import type { Segment } from "../../../components/ha-segmented-bar";
import "../../../components/ha-spinner";
import type {
  RecorderDatabaseUsage,
  RecorderTableUsage,
} from "../../../data/recorder";
import {
  fetchRecorderDatabaseUsage,
  groupSmallTables,
} from "../../../data/recorder";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import type { HomeAssistant } from "../../../types";
import { bytesToString } from "../../../util/bytes-to-string";

interface EntityUsageRow extends DataTableRowData {
  entity_id: string;
  name: string;
  states: number;
  statistics: number;
  statistics_short_term: number;
  bytes: number;
}

@customElement("storage-database-card")
export class StorageDatabaseCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _usage?: RecorderDatabaseUsage;

  @state() private _loading = false;

  @state() private _error?: string;

  protected firstUpdated(changedProps: PropertyValues<this>): void {
    super.firstUpdated(changedProps);
    this._load(false);
  }

  protected render(): TemplateResult {
    const usage = this._usage;
    return html`
      <ha-card
        outlined
        .header=${this.hass.localize("ui.panel.config.storage.database.title")}
      >
        <div class="card-content">
          ${
            this._error
              ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
              : nothing
          }
          ${
            usage
              ? this._renderUsage(usage)
              : this._loading
                ? html`<div class="loading">
                    <ha-spinner></ha-spinner>
                    <span>
                      ${this.hass.localize(
                        "ui.panel.config.storage.database.loading"
                      )}
                    </span>
                  </div>`
                : nothing
          }
        </div>
        <div class="card-actions">
          <ha-button
            appearance="plain"
            .loading=${this._loading}
            .disabled=${this._loading}
            @click=${this._refresh}
          >
            ${this.hass.localize("ui.panel.config.storage.database.refresh")}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _renderUsage(usage: RecorderDatabaseUsage) {
    return html`
      <div class="summary">
        <span class="total">${bytesToString(usage.total_bytes)}</span>
        <span class="generated">
          ${this.hass.localize("ui.panel.config.storage.database.as_of", {
            time: formatDateTime(
              new Date(usage.generated_at),
              this.hass.locale,
              this.hass.config
            ),
          })}
        </span>
      </div>
      ${
        usage.tables.length
          ? html`<ha-segmented-bar
              .heading=${this.hass.localize(
                "ui.panel.config.storage.database.tables"
              )}
              .segments=${this._tableSegments(usage.tables, this.hass.localize)}
            ></ha-segmented-bar>`
          : nothing
      }
      <div class="table">
        <ha-data-table
          .narrow=${this.narrow}
          .columns=${this._columns(this.hass.localize, this.narrow)}
          .data=${this._rows(usage)}
          .searchLabel=${this.hass.localize(
            "ui.panel.config.storage.database.search"
          )}
          id="entity_id"
          clickable
          .noDataText=${this.hass.localize(
            "ui.panel.config.storage.database.no_entities"
          )}
          @row-click=${this._rowClicked}
        ></ha-data-table>
      </div>
    `;
  }

  private _name(entityId: string): string {
    const stateObj = this.hass.states[entityId];
    return stateObj ? computeStateName(stateObj) : entityId;
  }

  private _tableSegments = memoizeOne(
    (tables: RecorderTableUsage[], localize: LocalizeFunc): Segment[] => {
      const computedStyles = getComputedStyle(this);
      const grouped = groupSmallTables(tables);
      const segments = grouped.tables.map((table) => ({
        name: table.table,
        bytes: table.bytes,
      }));
      if (grouped.otherBytes > 0) {
        segments.push({
          name: localize("ui.panel.config.storage.database.other_tables"),
          bytes: grouped.otherBytes,
        });
      }
      return segments.map((segment, index) => ({
        value: segment.bytes,
        color: getGraphColorByIndex(index, computedStyles),
        label: html`${segment.name}
          <span style="color: var(--secondary-text-color)"
            >${bytesToString(segment.bytes)}</span
          >`,
      }));
    }
  );

  private _rows = memoizeOne((usage: RecorderDatabaseUsage): EntityUsageRow[] =>
    usage.entities.map((entity) => ({
      ...entity,
      name: this._name(entity.entity_id),
    }))
  );

  private _columns = memoizeOne(
    (
      localize: LocalizeFunc,
      narrow: boolean
    ): DataTableColumnContainer<EntityUsageRow> => ({
      name: {
        title: localize("ui.panel.config.storage.database.columns.entity"),
        main: true,
        sortable: true,
        filterable: true,
        flex: 3,
        template: (row) =>
          html`${row.name}
          ${
            row.name !== row.entity_id
              ? html`<div class="secondary">${row.entity_id}</div>`
              : nothing
          }`,
      },
      entity_id: {
        title: localize("ui.panel.config.storage.database.columns.entity_id"),
        filterable: true,
        hidden: true,
      },
      states: {
        title: localize("ui.panel.config.storage.database.columns.states"),
        type: "numeric",
        minWidth: "100px",
        maxWidth: "100px",
        sortable: true,
        hidden: narrow,
        template: (row) => formatNumber(row.states, this.hass.locale),
      },
      statistics: {
        title: localize("ui.panel.config.storage.database.columns.statistics"),
        type: "numeric",
        minWidth: "100px",
        maxWidth: "100px",
        sortable: true,
        hidden: narrow,
        template: (row) => formatNumber(row.statistics, this.hass.locale),
      },
      statistics_short_term: {
        title: localize(
          "ui.panel.config.storage.database.columns.statistics_short_term"
        ),
        type: "numeric",
        minWidth: "130px",
        maxWidth: "130px",
        sortable: true,
        hidden: narrow,
        template: (row) =>
          formatNumber(row.statistics_short_term, this.hass.locale),
      },
      bytes: {
        title: localize("ui.panel.config.storage.database.columns.size"),
        type: "numeric",
        minWidth: "100px",
        maxWidth: "100px",
        sortable: true,
        direction: "desc",
        showNarrow: true,
        template: (row) => bytesToString(row.bytes),
      },
    })
  );

  private _rowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const entityId = ev.detail.id;
    // Statistics of external sources (e.g. "sensor:energy") have no entity.
    if (entityId in this.hass.states || entityId in this.hass.entities) {
      showMoreInfoDialog(this, { entityId, view: "settings" });
    }
  }

  private _refresh() {
    this._load(true);
  }

  private async _load(refresh: boolean) {
    this._loading = true;
    this._error = undefined;
    try {
      this._usage = await fetchRecorderDatabaseUsage(this.hass, refresh);
    } catch (err: any) {
      this._error = err.message || err.code || String(err);
    } finally {
      this._loading = false;
    }
  }

  static styles = css`
    ha-card {
      margin-bottom: 12px;
    }
    .card-content {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-4);
    }
    .card-actions {
      display: flex;
      justify-content: flex-end;
    }
    .loading {
      display: flex;
      align-items: center;
      gap: var(--ha-space-3);
      color: var(--secondary-text-color);
    }
    .summary {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--ha-space-2);
    }
    .total {
      font-size: var(--ha-font-size-2xl);
    }
    .generated {
      color: var(--secondary-text-color);
    }
    .table {
      height: 480px;
    }
    ha-data-table {
      --data-table-border-width: 0;
      height: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "storage-database-card": StorageDatabaseCard;
  }
}
