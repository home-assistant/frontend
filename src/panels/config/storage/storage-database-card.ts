import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HassConfig } from "home-assistant-js-websocket";
import memoizeOne from "memoize-one";
import { COLORS_COUNT } from "../../../common/color/colors";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import { consume } from "../../../common/decorators/consume";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
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
import {
  apiContext,
  configContext,
  fullEntitiesContext,
  internationalizationContext,
  statesContext,
} from "../../../data/context";
import type {
  RecorderDatabaseUsage,
  RecorderTableUsage,
} from "../../../data/recorder";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import {
  fetchRecorderDatabaseUsage,
  groupSmallTables,
} from "../../../data/recorder";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import type { FrontendLocaleData } from "../../../data/translation";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantConfig,
  HomeAssistantInternationalization,
} from "../../../types";
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
  @property({ type: Boolean }) public narrow = false;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale!: FrontendLocaleData;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: HomeAssistant["states"];

  // Includes disabled entities, which have no state but can have recorded data.
  @consume({ context: fullEntitiesContext, subscribe: true })
  private _entityRegistry: EntityRegistryEntry[] = [];

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
        .header=${this._localize("ui.panel.config.storage.database.title")}
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
                      ${this._localize(
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
            ${this._localize("ui.panel.config.storage.database.refresh")}
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
          ${this._localize("ui.panel.config.storage.database.as_of", {
            time: formatDateTime(
              new Date(usage.generated_at),
              this._locale,
              this._hassConfig
            ),
          })}
        </span>
      </div>
      ${
        usage.tables.length
          ? html`<ha-segmented-bar
              .heading=${this._localize(
                "ui.panel.config.storage.database.tables"
              )}
              .segments=${this._tableSegments(usage.tables, this._localize)}
            ></ha-segmented-bar>`
          : nothing
      }
      <div class="table">
        <ha-data-table
          .narrow=${this.narrow}
          .columns=${this._columns(this._localize, this._locale, this.narrow)}
          .data=${this._rows(usage, this._states)}
          .searchLabel=${this._localize(
            "ui.panel.config.storage.database.search"
          )}
          id="entity_id"
          clickable
          .noDataText=${this._localize(
            "ui.panel.config.storage.database.no_entities"
          )}
          @row-click=${this._rowClicked}
        ></ha-data-table>
      </div>
    `;
  }

  private _tableSegments = memoizeOne(
    (tables: RecorderTableUsage[], localize: LocalizeFunc): Segment[] => {
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
        // CSS variables, so a theme change applies without a new report.
        color: `var(--graph-color-${index + 1}, var(--color-${(index % COLORS_COUNT) + 1}))`,
        label: html`${segment.name}
          <span style="color: var(--secondary-text-color)"
            >${bytesToString(segment.bytes)}</span
          >`,
      }));
    }
  );

  private _rows = memoizeOne(
    (
      usage: RecorderDatabaseUsage,
      states: HomeAssistant["states"]
    ): EntityUsageRow[] =>
      usage.entities.map((entity) => {
        const stateObj = states[entity.entity_id];
        return {
          ...entity,
          name: stateObj ? computeStateName(stateObj) : entity.entity_id,
        };
      })
  );

  private _columns = memoizeOne(
    (
      localize: LocalizeFunc,
      locale: FrontendLocaleData,
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
        template: (row) => formatNumber(row.states, locale),
      },
      statistics: {
        title: localize("ui.panel.config.storage.database.columns.statistics"),
        type: "numeric",
        minWidth: "100px",
        maxWidth: "100px",
        sortable: true,
        hidden: narrow,
        template: (row) => formatNumber(row.statistics, locale),
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
        template: (row) => formatNumber(row.statistics_short_term, locale),
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
    if (
      entityId in this._states ||
      this._entityRegistry.some((entry) => entry.entity_id === entityId)
    ) {
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
      this._usage = await fetchRecorderDatabaseUsage(this._api, refresh);
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
