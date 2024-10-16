import "@material/mwc-button/mwc-button";
import {
  mdiArrowDown,
  mdiArrowUp,
  mdiClose,
  mdiCog,
  mdiFormatListChecks,
  mdiMenuDown,
  mdiSlopeUphill,
  mdiUnfoldLessHorizontal,
  mdiUnfoldMoreHorizontal,
} from "@mdi/js";

import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { HASSDomEvent, fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/chips/ha-assist-chip";
import "../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  HaDataTable,
  SelectionChangedEvent,
  SortingDirection,
} from "../../../components/data-table/ha-data-table";
import { showDataTableSettingsDialog } from "../../../components/data-table/show-dialog-data-table-settings";
import "../../../components/ha-md-button-menu";
import "../../../components/ha-dialog";
import { HaMenu } from "../../../components/ha-menu";
import "../../../components/ha-md-menu-item";
import "../../../components/search-input-outlined";
import { subscribeEntityRegistry } from "../../../data/entity_registry";
import {
  StatisticsMetaData,
  StatisticsValidationResult,
  clearStatistics,
  getStatisticIds,
  updateStatisticsIssues,
  validateStatistics,
} from "../../../data/recorder";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { showConfirmationDialog } from "../../lovelace/custom-card-helpers";
import { fixStatisticsIssue } from "./fix-statistics";
import { showStatisticsAdjustSumDialog } from "./show-dialog-statistics-adjust-sum";

const FIX_ISSUES_ORDER: Record<StatisticsValidationResult["type"], number> = {
  no_state: 0,
  entity_no_longer_recorded: 1,
  entity_not_recorded: 1,
  state_class_removed: 2,
  units_changed: 3,
};

const FIXABLE_ISSUES: StatisticsValidationResult["type"][] = [
  "no_state",
  "entity_no_longer_recorded",
  "state_class_removed",
  "units_changed",
];

type StatisticData = StatisticsMetaData & {
  issues?: StatisticsValidationResult[];
  state?: HassEntity;
  selectable?: boolean;
};

type DisplayedStatisticData = StatisticData & {
  displayName: string;
  issues_string?: string;
};

@customElement("developer-tools-statistics")
class HaPanelDevStatistics extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _data: StatisticData[] = [] as StatisticsMetaData[];

  @state() private filter = "";

  @state() private _selected: string[] = [];

  @state() private groupOrder?: string[];

  @state() private columnOrder?: string[];

  @state() private hiddenColumns?: string[];

  @state() private _sortColumn?: string;

  @state() private _sortDirection: SortingDirection = null;

  @state() private _groupColumn?: string;

  @state() private _selectMode = false;

  @query("ha-data-table", true) private _dataTable!: HaDataTable;

  @query("#group-by-menu") private _groupByMenu!: HaMenu;

  @query("#sort-by-menu") private _sortByMenu!: HaMenu;

  private _disabledEntities = new Set<string>();

  private _toggleGroupBy() {
    this._groupByMenu.open = !this._groupByMenu.open;
  }

  private _toggleSortBy() {
    this._sortByMenu.open = !this._sortByMenu.open;
  }

  protected firstUpdated() {
    this._validateStatistics();
  }

  private _displayData = memoizeOne(
    (data: StatisticData[], localize: LocalizeFunc): DisplayedStatisticData[] =>
      data.map((item) => ({
        ...item,
        displayName: item.state
          ? computeStateName(item.state)
          : item.name || item.statistic_id,
        issues_string: item.issues
          ?.map(
            (issue) =>
              localize(
                `ui.panel.developer-tools.tabs.statistics.issues.${issue.type}`,
                issue.data
              ) || issue.type
          )
          .join(" "),
      }))
  );

  private _columns = memoizeOne(
    (
      localize: LocalizeFunc
    ): DataTableColumnContainer<DisplayedStatisticData> => ({
      displayName: {
        title: localize(
          "ui.panel.developer-tools.tabs.statistics.data_table.name"
        ),
        main: true,
        sortable: true,
        filterable: true,
        flex: 2,
      },
      statistic_id: {
        title: localize(
          "ui.panel.developer-tools.tabs.statistics.data_table.statistic_id"
        ),
        sortable: true,
        filterable: true,
        hidden: this.narrow,
      },
      statistics_unit_of_measurement: {
        title: localize(
          "ui.panel.developer-tools.tabs.statistics.data_table.statistics_unit"
        ),
        sortable: true,
        filterable: true,
        forceLTR: true,
      },
      source: {
        title: localize(
          "ui.panel.developer-tools.tabs.statistics.data_table.source"
        ),
        sortable: true,
        filterable: true,
        groupable: true,
      },
      issues_string: {
        title: localize(
          "ui.panel.developer-tools.tabs.statistics.data_table.issue"
        ),
        sortable: true,
        filterable: true,
        groupable: true,
        direction: "asc",
        flex: 2,
        template: (statistic) =>
          html`${statistic.issues_string ??
          localize("ui.panel.developer-tools.tabs.statistics.no_issue")}`,
      },
      fix: {
        title: "",
        label: this.hass.localize(
          "ui.panel.developer-tools.tabs.statistics.fix_issue.fix"
        ),
        template: (statistic) =>
          html`${statistic.issues
            ? html`<mwc-button
                @click=${this._fixIssue}
                .data=${statistic.issues}
              >
                ${localize(
                  statistic.issues.some((issue) =>
                    FIXABLE_ISSUES.includes(issue.type)
                  )
                    ? "ui.panel.developer-tools.tabs.statistics.fix_issue.fix"
                    : "ui.panel.developer-tools.tabs.statistics.fix_issue.info"
                )}
              </mwc-button>`
            : "—"}`,
        minWidth: "113px",
        maxWidth: "113px",
        showNarrow: true,
      },
      actions: {
        title: "",
        label: localize("ui.panel.developer-tools.tabs.statistics.adjust_sum"),
        type: "icon-button",
        showNarrow: true,
        template: (statistic) =>
          statistic.has_sum
            ? html`
                <ha-icon-button
                  .label=${localize(
                    "ui.panel.developer-tools.tabs.statistics.adjust_sum"
                  )}
                  .path=${mdiSlopeUphill}
                  .statistic=${statistic}
                  @click=${this._showStatisticsAdjustSumDialog}
                ></ha-icon-button>
              `
            : "",
      },
    })
  );

  protected render() {
    const localize = this.hass.localize;
    const columns = this._columns(this.hass.localize);

    const selectModeBtn = !this._selectMode
      ? html`<ha-assist-chip
          class="has-dropdown select-mode-chip"
          .active=${this._selectMode}
          @click=${this._enableSelectMode}
          .title=${localize(
            "ui.components.subpage-data-table.enter_selection_mode"
          )}
        >
          <ha-svg-icon slot="icon" .path=${mdiFormatListChecks}></ha-svg-icon>
        </ha-assist-chip> `
      : nothing;

    const searchBar = html`<search-input-outlined
      .hass=${this.hass}
      .filter=${this.filter}
      @value-changed=${this._handleSearchChange}
    >
    </search-input-outlined>`;

    const sortByMenu = Object.values(columns).find((col) => col.sortable)
      ? html`
          <ha-assist-chip
            .label=${localize("ui.components.subpage-data-table.sort_by", {
              sortColumn: this._sortColumn
                ? ` ${columns[this._sortColumn]?.title || columns[this._sortColumn]?.label}` ||
                  ""
                : "",
            })}
            id="sort-by-anchor"
            @click=${this._toggleSortBy}
          >
            <ha-svg-icon
              slot="trailing-icon"
              .path=${mdiMenuDown}
            ></ha-svg-icon>
          </ha-assist-chip>
        `
      : nothing;

    const groupByMenu = Object.values(columns).find((col) => col.groupable)
      ? html`
          <ha-assist-chip
            .label=${localize("ui.components.subpage-data-table.group_by", {
              groupColumn: this._groupColumn
                ? ` ${columns[this._groupColumn].title || columns[this._groupColumn].label}`
                : "",
            })}
            id="group-by-anchor"
            @click=${this._toggleGroupBy}
          >
            <ha-svg-icon slot="trailing-icon" .path=${mdiMenuDown}></ha-svg-icon
          ></ha-assist-chip>
        `
      : nothing;

    const settingsButton = html`<ha-assist-chip
      class="has-dropdown select-mode-chip"
      @click=${this._openSettings}
      .title=${localize("ui.components.subpage-data-table.settings")}
    >
      <ha-svg-icon slot="icon" .path=${mdiCog}></ha-svg-icon>
    </ha-assist-chip>`;

    return html`
      <div>
        ${this._selectMode
          ? html`<div class="selection-bar">
              <div class="selection-controls">
                <ha-icon-button
                  .path=${mdiClose}
                  @click=${this._disableSelectMode}
                  .label=${localize(
                    "ui.components.subpage-data-table.exit_selection_mode"
                  )}
                ></ha-icon-button>
                <ha-md-button-menu positioning="absolute">
                  <ha-assist-chip
                    .label=${localize(
                      "ui.components.subpage-data-table.select"
                    )}
                    slot="trigger"
                  >
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiFormatListChecks}
                    ></ha-svg-icon>
                    <ha-svg-icon
                      slot="trailing-icon"
                      .path=${mdiMenuDown}
                    ></ha-svg-icon
                  ></ha-assist-chip>
                  <ha-md-menu-item
                    .value=${undefined}
                    @click=${this._selectAll}
                  >
                    <div slot="headline">
                      ${localize("ui.components.subpage-data-table.select_all")}
                    </div>
                  </ha-md-menu-item>
                  <ha-md-menu-item
                    .value=${undefined}
                    @click=${this._selectAllIssues}
                  >
                    <div slot="headline">
                      ${localize(
                        "ui.panel.developer-tools.tabs.statistics.data_table.select_all_issues"
                      )}
                    </div>
                  </ha-md-menu-item>
                  <ha-md-menu-item
                    .value=${undefined}
                    @click=${this._selectNone}
                  >
                    <div slot="headline">
                      ${localize(
                        "ui.components.subpage-data-table.select_none"
                      )}
                    </div>
                  </ha-md-menu-item>
                  <md-divider role="separator" tabindex="-1"></md-divider>
                  <ha-md-menu-item
                    .value=${undefined}
                    @click=${this._disableSelectMode}
                  >
                    <div slot="headline">
                      ${localize(
                        "ui.components.subpage-data-table.close_select_mode"
                      )}
                    </div>
                  </ha-md-menu-item>
                </ha-md-button-menu>
                <p>
                  ${localize("ui.components.subpage-data-table.selected", {
                    selected: this._selected.length,
                  })}
                </p>
              </div>
              <div class="center-vertical">
                <slot name="selection-bar"></slot>
              </div>
              <ha-assist-chip
                .label=${localize(
                  "ui.panel.developer-tools.tabs.statistics.delete_selected"
                )}
                .disabled=${!this._selected.length}
                @click=${this._clearSelected}
              >
              </ha-assist-chip>
            </div>`
          : nothing}
        <div slot="toolbar-icon">
          <slot name="toolbar-icon"></slot>
        </div>
        ${this.narrow
          ? html`
              <div slot="header">
                <slot name="header">
                  <div class="search-toolbar">${searchBar}</div>
                </slot>
              </div>
            `
          : ""}
        <ha-data-table
          .hass=${this.hass}
          .narrow=${this.narrow}
          .columns=${columns}
          .data=${this._displayData(this._data, this.hass.localize)}
          .noDataText=${this.hass.localize(
            "ui.panel.developer-tools.tabs.statistics.data_table.no_statistics"
          )}
          .filter=${this.filter}
          .selectable=${this._selectMode}
          id="statistic_id"
          clickable
          .sortColumn=${this._sortColumn}
          .sortDirection=${this._sortDirection}
          .groupColumn=${this._groupColumn}
          .groupOrder=${this.groupOrder}
          .columnOrder=${this.columnOrder}
          .hiddenColumns=${this.hiddenColumns}
          @row-click=${this._rowClicked}
          @selection-changed=${this._handleSelectionChanged}
        >
          ${!this.narrow
            ? html`
                <div slot="header">
                  <slot name="header">
                    <div class="table-header">
                      ${selectModeBtn}${searchBar}${groupByMenu}${sortByMenu}${settingsButton}
                    </div>
                  </slot>
                </div>
              `
            : html`<div slot="header"></div>
                <div slot="header-row" class="narrow-header-row">
                  ${selectModeBtn}${groupByMenu}${sortByMenu}${settingsButton}
                </div>`}
        </ha-data-table>
      </div>
      <ha-menu anchor="group-by-anchor" id="group-by-menu" positioning="fixed">
        ${Object.entries(columns).map(([id, column]) =>
          column.groupable
            ? html`
                <ha-md-menu-item
                  .value=${id}
                  @click=${this._handleGroupBy}
                  .selected=${id === this._groupColumn}
                  class=${classMap({ selected: id === this._groupColumn })}
                >
                  ${column.title || column.label}
                </ha-md-menu-item>
              `
            : nothing
        )}
        <ha-md-menu-item
          .value=${undefined}
          @click=${this._handleGroupBy}
          .selected=${this._groupColumn === undefined}
          class=${classMap({ selected: this._groupColumn === undefined })}
        >
          ${localize("ui.components.subpage-data-table.dont_group_by")}
        </ha-md-menu-item>
        <md-divider role="separator" tabindex="-1"></md-divider>
        <ha-md-menu-item
          @click=${this._collapseAllGroups}
          .disabled=${this._groupColumn === undefined}
        >
          <ha-svg-icon
            slot="start"
            .path=${mdiUnfoldLessHorizontal}
          ></ha-svg-icon>
          ${localize("ui.components.subpage-data-table.collapse_all_groups")}
        </ha-md-menu-item>
        <ha-md-menu-item
          @click=${this._expandAllGroups}
          .disabled=${this._groupColumn === undefined}
        >
          <ha-svg-icon
            slot="start"
            .path=${mdiUnfoldMoreHorizontal}
          ></ha-svg-icon>
          ${localize("ui.components.subpage-data-table.expand_all_groups")}
        </ha-md-menu-item>
      </ha-menu>
      <ha-menu anchor="sort-by-anchor" id="sort-by-menu" positioning="fixed">
        ${Object.entries(columns).map(([id, column]) =>
          column.sortable
            ? html`
                <ha-md-menu-item
                  .value=${id}
                  @click=${this._handleSortBy}
                  keep-open
                  .selected=${id === this._sortColumn}
                  class=${classMap({ selected: id === this._sortColumn })}
                >
                  ${this._sortColumn === id
                    ? html`
                        <ha-svg-icon
                          slot="end"
                          .path=${this._sortDirection === "desc"
                            ? mdiArrowDown
                            : mdiArrowUp}
                        ></ha-svg-icon>
                      `
                    : nothing}
                  ${column.title || column.label}
                </ha-md-menu-item>
              `
            : nothing
        )}
      </ha-menu>
    `;
  }

  private _handleSearchChange(ev: CustomEvent) {
    if (this.filter === ev.detail.value) {
      return;
    }
    this.filter = ev.detail.value;
  }

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selected = ev.detail.value;
  }

  private _handleSortBy(ev) {
    const columnId = ev.currentTarget.value;
    if (!this._sortDirection || this._sortColumn !== columnId) {
      this._sortDirection = "asc";
    } else if (this._sortDirection === "asc") {
      this._sortDirection = "desc";
    } else {
      this._sortDirection = null;
    }
    this._sortColumn = this._sortDirection === null ? undefined : columnId;
  }

  private _handleGroupBy(ev) {
    this._setGroupColumn(ev.currentTarget.value);
  }

  private _setGroupColumn(columnId: string) {
    this._groupColumn = columnId;
  }

  private _openSettings() {
    showDataTableSettingsDialog(this, {
      columns: this._columns(this.hass.localize),
      hiddenColumns: this.hiddenColumns,
      columnOrder: this.columnOrder,
      onUpdate: (
        columnOrder: string[] | undefined,
        hiddenColumns: string[] | undefined
      ) => {
        this.columnOrder = columnOrder;
        this.hiddenColumns = hiddenColumns;
      },
      localizeFunc: this.hass.localize,
    });
  }

  private _collapseAllGroups() {
    this._dataTable.collapseAllGroups();
  }

  private _expandAllGroups() {
    this._dataTable.expandAllGroups();
  }

  private _enableSelectMode() {
    this._selectMode = true;
  }

  private _disableSelectMode() {
    this._selectMode = false;
    this._dataTable.clearSelection();
  }

  private _selectAll() {
    this._dataTable.selectAll();
  }

  private _selectNone() {
    this._dataTable.clearSelection();
  }

  private _selectAllIssues() {
    this._dataTable.select(
      this._data
        .filter((statistic) => statistic.issues)
        .map((statistic) => statistic.statistic_id),
      true
    );
  }

  private _showStatisticsAdjustSumDialog(ev) {
    ev.stopPropagation();
    showStatisticsAdjustSumDialog(this, {
      statistic: ev.currentTarget.statistic,
    });
  }

  private _rowClicked(ev) {
    const id = ev.detail.id;
    if (id in this.hass.states) {
      fireEvent(this, "hass-more-info", { entityId: id });
    }
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        const disabledEntities = new Set<string>();
        for (const confEnt of entities) {
          if (!confEnt.disabled_by) {
            continue;
          }
          disabledEntities.add(confEnt.entity_id);
        }
        // If the disabled entities changed, re-validate the statistics
        if (disabledEntities !== this._disabledEntities) {
          this._disabledEntities = disabledEntities;
          this._validateStatistics();
        }
      }),
    ];
  }

  private async _validateStatistics() {
    const [statisticIds, issues] = await Promise.all([
      getStatisticIds(this.hass),
      validateStatistics(this.hass),
    ]);

    updateStatisticsIssues(this.hass);

    const statsIds = new Set();

    this._data = statisticIds
      .filter(
        (statistic) => !this._disabledEntities.has(statistic.statistic_id)
      )
      .map((statistic) => {
        statsIds.add(statistic.statistic_id);
        return {
          ...statistic,
          state: this.hass.states[statistic.statistic_id],
          issues: issues[statistic.statistic_id],
        };
      });

    Object.keys(issues).forEach((statisticId) => {
      if (
        !statsIds.has(statisticId) &&
        !this._disabledEntities.has(statisticId)
      ) {
        this._data.push({
          statistic_id: statisticId,
          statistics_unit_of_measurement: "",
          source: "",
          state: this.hass.states[statisticId],
          issues: issues[statisticId],
          has_mean: false,
          has_sum: false,
          unit_class: null,
        });
      }
    });
  }

  private _clearSelected = async () => {
    if (!this._selected.length) {
      return;
    }

    const deletableIds = this._selected;

    await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.developer-tools.tabs.statistics.multi_delete.title"
      ),
      text: html`${this.hass.localize(
        "ui.panel.developer-tools.tabs.statistics.multi_delete.info_text",
        { statistic_count: deletableIds.length }
      )}`,
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
      confirm: async () => {
        await clearStatistics(this.hass, deletableIds);
        this._validateStatistics();
        this._dataTable.clearSelection();
      },
    });
  };

  private _fixIssue = async (ev) => {
    const issues = (ev.currentTarget.data as StatisticsValidationResult[]).sort(
      (itemA, itemB) =>
        (FIX_ISSUES_ORDER[itemA.type] ?? 99) -
        (FIX_ISSUES_ORDER[itemB.type] ?? 99)
    );
    const issue = issues[0];
    await fixStatisticsIssue(this, issue);
    this._validateStatistics();
  };

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
          height: 100%;
        }

        ha-data-table {
          width: 100%;
          height: 100%;
          --data-table-border-width: 0;
        }
        :host(:not([narrow])) ha-data-table {
          height: calc(100vh - 1px - var(--header-height));
          display: block;
        }

        :host([narrow]) {
          --expansion-panel-summary-padding: 0 16px;
        }
        .table-header {
          display: flex;
          align-items: center;
          --mdc-shape-small: 0;
          height: 56px;
          width: 100%;
          justify-content: space-between;
          padding: 0 16px;
          gap: 16px;
          box-sizing: border-box;
          background: var(--primary-background-color);
          border-bottom: 1px solid var(--divider-color);
        }
        search-input-outlined {
          flex: 1;
        }
        .search-toolbar {
          display: flex;
          align-items: center;
          color: var(--secondary-text-color);
        }

        .narrow-header-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 0 16px;
          overflow-x: scroll;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .selection-bar {
          background: rgba(var(--rgb-primary-color), 0.1);
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          box-sizing: border-box;
          font-size: 14px;
          --ha-assist-chip-container-color: var(--card-background-color);
        }

        .selection-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .selection-controls p {
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: initial;
        }

        .center-vertical {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .relative {
          position: relative;
        }

        ha-assist-chip {
          --ha-assist-chip-container-shape: 10px;
          --ha-assist-chip-container-color: var(--card-background-color);
        }

        .select-mode-chip {
          --md-assist-chip-icon-label-space: 0;
          --md-assist-chip-trailing-space: 8px;
        }

        ha-dialog {
          --mdc-dialog-min-width: calc(
            100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
          );
          --mdc-dialog-max-width: calc(
            100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
          );
          --mdc-dialog-min-height: 100%;
          --mdc-dialog-max-height: 100%;
          --vertical-align-dialog: flex-end;
          --ha-dialog-border-radius: 0;
          --dialog-content-padding: 0;
        }

        #sort-by-anchor,
        #group-by-anchor,
        ha-button-menu-new ha-assist-chip {
          --md-assist-chip-trailing-space: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-statistics": HaPanelDevStatistics;
  }
}
