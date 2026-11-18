import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HassConfig } from "home-assistant-js-websocket";
import memoizeOne from "memoize-one";
import { getGraphColorByIndex } from "../../../common/color/colors";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import { consume } from "../../../common/decorators/consume";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { formatNumber } from "../../../common/number/format_number";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-segmented-bar";
import type { Segment } from "../../../components/ha-segmented-bar";
import "../../../components/ha-spinner";
import {
  configContext,
  fullEntitiesContext,
  internationalizationContext,
  statesContext,
  uiContext,
} from "../../../data/context";
import type {
  RecorderDatabaseUsage,
  RecorderTableUsage,
} from "../../../data/recorder";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import type { FrontendLocaleData } from "../../../data/translation";
import type { Themes } from "../../../data/ws-themes";
import type {
  HomeAssistant,
  HomeAssistantConfig,
  HomeAssistantInternationalization,
  HomeAssistantUI,
} from "../../../types";
import { bytesToString } from "../../../util/bytes-to-string";

// Tables below minShare of the total are summed into otherBytes.
export const groupSmallTables = (
  tables: RecorderTableUsage[],
  minShare = 0.01
): { tables: RecorderTableUsage[]; otherBytes: number; totalBytes: number } => {
  const totalBytes = tables.reduce((sum, table) => sum + table.bytes, 0);
  const large = tables.filter(
    (table) => table.bytes > 0 && table.bytes >= totalBytes * minShare
  );
  return {
    tables: large,
    otherBytes: totalBytes - large.reduce((sum, table) => sum + table.bytes, 0),
    totalBytes,
  };
};

// Row id for the rows the database cannot attribute to an entity or statistic.
export const UNKNOWN_ROW_ID = "unknown";

export interface DatabaseUsageRow {
  id: string;
  states: number;
  statistics: number;
  statistics_short_term: number;
  bytes: number | null;
}

// Statistics of an entity share its ID and are merged into its row.
export const databaseUsageRows = (
  usage: RecorderDatabaseUsage
): DatabaseUsageRow[] => {
  const rows = new Map<string, DatabaseUsageRow>();
  const row = (id: string | null) => {
    const key = id ?? UNKNOWN_ROW_ID;
    let result = rows.get(key);
    if (!result) {
      result = {
        id: key,
        states: 0,
        statistics: 0,
        statistics_short_term: 0,
        bytes: usage.tables ? 0 : null,
      };
      rows.set(key, result);
    }
    return result;
  };
  for (const entity of usage.entities) {
    const result = row(entity.entity_id);
    result.states += entity.states;
    if (result.bytes !== null) {
      result.bytes +=
        (entity.states_bytes ?? 0) + (entity.attributes_bytes ?? 0);
    }
  }
  for (const statistic of usage.statistics) {
    const result = row(statistic.statistic_id);
    result.statistics += statistic.statistics;
    result.statistics_short_term += statistic.statistics_short_term;
    if (result.bytes !== null) {
      result.bytes +=
        (statistic.statistics_bytes ?? 0) +
        (statistic.statistics_short_term_bytes ?? 0);
    }
  }
  return [...rows.values()];
};

interface EntityUsageRow extends DatabaseUsageRow, DataTableRowData {
  name: string;
  hasSettings: boolean;
}

@customElement("storage-database-card")
export class StorageDatabaseCard extends LitElement {
  @property({ type: Boolean }) public narrow = false;

  // Undefined until loaded, null when no recent report exists.
  @property({ attribute: false }) public usage?: RecorderDatabaseUsage | null;

  @property({ type: Boolean }) public analyzing = false;

  @property() public error?: string;

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

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, Themes>({
    transformer: ({ themes }) => themes,
  })
  private _themes!: Themes;

  // Not reactive: read when building the rows, which follow the entity registry.
  @consume({ context: statesContext, subscribe: true })
  private _states!: HomeAssistant["states"];

  // Includes disabled entities, which have no state but can have recorded data.
  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  private _entityRegistry: EntityRegistryEntry[] = [];

  protected render(): TemplateResult {
    const usage = this.usage;
    return html`
      <ha-card
        outlined
        .header=${this._localize("ui.panel.config.storage.database.title")}
      >
        <div class="card-content">
          ${
            this.error
              ? html`<ha-alert alert-type="error">${this.error}</ha-alert>`
              : nothing
          }
          ${
            this.analyzing
              ? html`<div class="loading">
                  <ha-spinner></ha-spinner>
                  <span>
                    ${this._localize(
                      "ui.panel.config.storage.database.analyzing"
                    )}
                  </span>
                </div>`
              : nothing
          }
          ${
            usage
              ? this._renderUsage(usage)
              : usage === null && !this.analyzing
                ? html`<p class="description">
                    ${this._localize(
                      "ui.panel.config.storage.database.description"
                    )}
                  </p>`
                : nothing
          }
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
        ${
          !usage.tables?.length && usage.free_bytes
            ? html`<span class="generated">
                ${this._localize(
                  "ui.panel.config.storage.database.unused_space_of",
                  { size: bytesToString(usage.free_bytes) }
                )}
              </span>`
            : nothing
        }
        ${
          usage.wal_bytes
            ? html`<span class="generated">
                ${this._localize("ui.panel.config.storage.database.wal", {
                  size: bytesToString(usage.wal_bytes),
                })}
              </span>`
            : nothing
        }
      </div>
      ${
        usage.tables?.length
          ? html`<ha-segmented-bar
              .heading=${this._localize(
                "ui.panel.config.storage.database.tables"
              )}
              .segments=${this._tableSegments(
                usage.tables,
                usage.total_bytes,
                usage.free_bytes,
                this._localize,
                this._themes
              )}
            ></ha-segmented-bar>`
          : nothing
      }
      <div class="table">
        <ha-data-table
          .narrow=${this.narrow}
          .columns=${this._columns(
            this._localize,
            this._locale,
            this.narrow,
            usage.tables !== null
          )}
          .data=${this._rows(usage, this._entityRegistry, this._localize)}
          .searchLabel=${this._localize(
            "ui.panel.config.storage.database.search"
          )}
          .noDataText=${this._localize(
            "ui.panel.config.storage.database.no_entities"
          )}
        ></ha-data-table>
      </div>
    `;
  }

  private _tableSegments = memoizeOne(
    (
      tables: RecorderTableUsage[],
      totalBytes: number,
      freeBytes: number | null,
      localize: LocalizeFunc,
      _themes: Themes
    ): Segment[] => {
      const computedStyles = getComputedStyle(this);
      const grouped = groupSmallTables(tables);
      const segments = grouped.tables.map((table) => ({
        name: table.table,
        bytes: table.bytes,
      }));
      // PostgreSQL catalogs are in the total but not in the tables.
      const otherBytes =
        grouped.otherBytes +
        Math.max(0, totalBytes - grouped.totalBytes - (freeBytes ?? 0));
      if (otherBytes > 0) {
        segments.push({
          name: localize("ui.panel.config.storage.database.other_tables"),
          bytes: otherBytes,
        });
      }
      const result: Segment[] = segments.map((segment, index) => ({
        value: segment.bytes,
        color: getGraphColorByIndex(index, computedStyles),
        label: html`${segment.name}
          <span style="color: var(--secondary-text-color)"
            >${bytesToString(segment.bytes)}</span
          >`,
      }));
      if (freeBytes) {
        result.push({
          value: freeBytes,
          color:
            "var(--ha-bar-background-color, var(--secondary-background-color))",
          label: html`${localize("ui.panel.config.storage.database.unused_space")}
            <span style="color: var(--secondary-text-color)"
              >${bytesToString(freeBytes)}</span
            >`,
        });
      }
      return result;
    }
  );

  // Keyed on the entity registry, not the states, so renames update the
  // names without rebuilding the rows on every state change.
  private _rows = memoizeOne(
    (
      usage: RecorderDatabaseUsage,
      entityRegistry: EntityRegistryEntry[],
      localize: LocalizeFunc
    ): EntityUsageRow[] => {
      const registered = new Set(
        entityRegistry.map((entry) => entry.entity_id)
      );
      return databaseUsageRows(usage).map((row) => {
        const stateObj = this._states[row.id];
        return {
          ...row,
          // Statistics of external sources (e.g. "sensor:energy") have no entity.
          hasSettings: stateObj !== undefined || registered.has(row.id),
          name:
            row.id === UNKNOWN_ROW_ID
              ? localize("ui.panel.config.storage.database.unknown")
              : stateObj
                ? computeStateName(stateObj)
                : row.id,
        };
      });
    }
  );

  private _columns = memoizeOne(
    (
      localize: LocalizeFunc,
      locale: FrontendLocaleData,
      narrow: boolean,
      hasSizes: boolean
    ): DataTableColumnContainer<EntityUsageRow> => ({
      name: {
        title: localize("ui.panel.config.storage.database.columns.entity"),
        main: true,
        sortable: true,
        filterable: true,
        flex: 3,
        template: (row) => {
          const content = html`${row.name}
          ${
            row.id !== UNKNOWN_ROW_ID && row.name !== row.id
              ? html`<div class="secondary">${row.id}</div>`
              : nothing
          }`;
          // Rendered inside the data table, which styles .row-button.
          return row.hasSettings
            ? html`<button
                type="button"
                class="row-button"
                data-entity-id=${row.id}
                @click=${this._openSettings}
              >
                ${content}
              </button>`
            : content;
        },
      },
      id: {
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
        // Without sizes the rows are sorted by states instead.
        direction: hasSizes ? undefined : "desc",
        hidden: narrow && hasSizes,
        showNarrow: !hasSizes,
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
        direction: hasSizes ? "desc" : undefined,
        hidden: !hasSizes,
        showNarrow: hasSizes,
        template: (row) => bytesToString(row.bytes ?? 0),
      },
    })
  );

  // Arrow function: the data table renders the template, not this card.
  private _openSettings = (
    ev: HASSDomCurrentTargetEvent<HTMLButtonElement>
  ) => {
    showMoreInfoDialog(this, {
      entityId: ev.currentTarget.dataset.entityId!,
      view: "settings",
    });
  };

  static styles = css`
    ha-card {
      margin-bottom: 12px;
    }
    .card-content {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-4);
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
    .generated,
    .description {
      color: var(--secondary-text-color);
    }
    .description {
      margin: 0;
    }
    .table {
      height: 480px;
    }
    ha-data-table {
      --data-table-border-width: 0;
      --data-table-row-border-width: 0;
      height: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "storage-database-card": StorageDatabaseCard;
  }
}
