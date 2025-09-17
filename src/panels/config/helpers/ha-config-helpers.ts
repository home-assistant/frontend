import { consume } from "@lit/context";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import {
  mdiAlertCircle,
  mdiCancel,
  mdiChevronRight,
  mdiCog,
  mdiDotsVertical,
  mdiMenuDown,
  mdiPencilOff,
  mdiProgressHelper,
  mdiPlus,
  mdiTag,
  mdiTrashCan,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { debounce } from "../../../common/util/debounce";
import { computeCssColor } from "../../../common/color/compute-color";
import { storage } from "../../../common/decorators/storage";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { navigate } from "../../../common/navigate";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../common/translations/localize";
import { extractSearchParam } from "../../../common/url/search-params";
import {
  hasRejectedItems,
  rejectedItems,
} from "../../../common/util/promise-all-settled-results";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SelectionChangedEvent,
  SortingChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/data-table/ha-data-table-labels";
import "../../../components/ha-fab";
import "../../../components/ha-filter-categories";
import "../../../components/ha-filter-devices";
import "../../../components/ha-filter-entities";
import "../../../components/ha-filter-floor-areas";
import "../../../components/ha-filter-labels";
import "../../../components/ha-icon";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-md-divider";
import "../../../components/ha-state-icon";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import type { CategoryRegistryEntry } from "../../../data/category_registry";
import {
  createCategoryRegistryEntry,
  subscribeCategoryRegistry,
} from "../../../data/category_registry";
import type { ConfigEntry } from "../../../data/config_entries";
import {
  ERROR_STATES,
  deleteConfigEntry,
  subscribeConfigEntries,
} from "../../../data/config_entries";
import { getConfigFlowHandlers } from "../../../data/config_flow";
import { fullEntitiesContext } from "../../../data/context";
import type {
  DataTableFiltersItems,
  DataTableFiltersValues,
} from "../../../data/data_table_filters";
import type {
  EntityRegistryEntry,
  UpdateEntityRegistryEntryResult,
} from "../../../data/entity_registry";
import {
  entityRegistryByEntityId,
  subscribeEntityRegistry,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import { fetchEntitySourcesWithCache } from "../../../data/entity_sources";
import type { IntegrationManifest } from "../../../data/integration";
import {
  domainToName,
  fetchIntegrationManifest,
  fetchIntegrationManifests,
} from "../../../data/integration";
import type { LabelRegistryEntry } from "../../../data/label_registry";
import {
  createLabelRegistryEntry,
  subscribeLabelRegistry,
} from "../../../data/label_registry";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { showOptionsFlowDialog } from "../../../dialogs/config-flow/show-dialog-options-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { showAssignCategoryDialog } from "../category/show-dialog-assign-category";
import { showCategoryRegistryDetailDialog } from "../category/show-dialog-category-registry-detail";
import { configSections } from "../ha-panel-config";
import "../integrations/ha-integration-overflow-menu";
import { renderConfigEntryError } from "../integrations/ha-config-integration-page";
import { showLabelDetailDialog } from "../labels/show-dialog-label-detail";
import { isHelperDomain } from "./const";
import { showHelperDetailDialog } from "./show-dialog-helper-detail";
import { slugify } from "../../../common/string/slugify";

interface HelperItem {
  id: string;
  name: string;
  icon?: string;
  entity_id: string;
  editable?: boolean;
  type: string;
  configEntry?: ConfigEntry;
  entity?: HassEntity;
  category: string | undefined;
  label_entries: LabelRegistryEntry[];
  disabled?: boolean;
}

// This groups items by a key but only returns last entry per key.
const groupByOne = <T>(
  items: T[],
  keySelector: (item: T) => string
): Record<string, T> => {
  const result: Record<string, T> = {};
  for (const item of items) {
    result[keySelector(item)] = item;
  }
  return result;
};

const getConfigEntry = (
  entityEntries: Record<string, EntityRegistryEntry>,
  configEntries: Record<string, ConfigEntry>,
  entityId: string
) => {
  const configEntryId = entityEntries![entityId]?.config_entry_id;
  return configEntryId ? configEntries![configEntryId] : undefined;
};

@customElement("ha-config-helpers")
export class HaConfigHelpers extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @storage({ key: "helpers-table-sort", state: false, subscribe: false })
  private _activeSorting?: SortingChangedEvent;

  @storage({ key: "helpers-table-grouping", state: false, subscribe: false })
  private _activeGrouping?: string;

  @storage({
    key: "helpers-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed?: string;

  @state()
  @storage({
    storage: "sessionStorage",
    key: "helpers-table-search",
    state: true,
    subscribe: false,
  })
  private _filter = "";

  @storage({
    key: "helpers-table-column-order",
    state: false,
    subscribe: false,
  })
  private _activeColumnOrder?: string[];

  @storage({
    key: "helpers-table-hidden-columns",
    state: false,
    subscribe: false,
  })
  private _activeHiddenColumns?: string[];

  @state() private _stateItems: HassEntity[] = [];

  @state() private _disabledEntityEntries?: EntityRegistryEntry[];

  @state() private _entityEntries?: Record<string, EntityRegistryEntry>;

  @state() private _configEntries?: Record<string, ConfigEntry>;

  @state() private _entitySource: Record<string, string> = {};

  @state() private _selected: string[] = [];

  @state() private _activeFilters?: string[];

  @state() private _helperManifests?: Record<string, IntegrationManifest>;

  @storage({
    storage: "sessionStorage",
    key: "helpers-table-filters",
    state: true,
    subscribe: false,
  })
  private _filters: DataTableFiltersValues = {};

  @state() private _filteredItems: DataTableFiltersItems = {};

  @state() private _expandedFilter?: string;

  @state()
  _categories!: CategoryRegistryEntry[];

  @state()
  _labels!: LabelRegistryEntry[];

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  @state() private _filteredStateItems?: string[] | null;

  private _sizeController = new ResizeController(this, {
    callback: (entries) => entries[0]?.contentRect.width,
  });

  private _debouncedFetchEntitySources = debounce(
    () => this._fetchEntitySources(),
    500,
    false
  );

  public hassSubscribe() {
    return [
      subscribeConfigEntries(
        this.hass,
        async (messages) => {
          const newEntries = this._configEntries
            ? { ...this._configEntries }
            : {};
          messages.forEach((message) => {
            if (message.type === null || message.type === "added") {
              newEntries[message.entry.entry_id] = message.entry;
            } else if (message.type === "removed") {
              delete newEntries[message.entry.entry_id];
            } else if (message.type === "updated") {
              newEntries[message.entry.entry_id] = message.entry;
            }
            if (
              this._entitySource &&
              this._configEntries &&
              message.entry.state === "loaded" &&
              this._configEntries[message.entry.entry_id]?.state !== "loaded"
            ) {
              this._debouncedFetchEntitySources();
            }
          });
          this._configEntries = newEntries;
        },
        { type: ["helper"] }
      ),
      subscribeEntityRegistry(this.hass.connection!, (entries) => {
        this._entityEntries = groupByOne(entries, (entry) => entry.entity_id);
      }),
      subscribeLabelRegistry(this.hass.connection, (labels) => {
        this._labels = labels;
      }),
      subscribeCategoryRegistry(
        this.hass.connection,
        "helpers",
        (categories) => {
          this._categories = categories;
        }
      ),
    ];
  }

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer<HelperItem> => ({
      icon: {
        title: "",
        label: localize("ui.panel.config.helpers.picker.headers.icon"),
        type: "icon",
        showNarrow: true,
        moveable: false,
        template: (helper) =>
          helper.entity
            ? html`<ha-state-icon
                .hass=${this.hass}
                .stateObj=${helper.entity}
              ></ha-state-icon>`
            : html`<ha-svg-icon
                .path=${helper.icon}
                style="color: var(--error-color)"
              ></ha-svg-icon>`,
      },
      name: {
        title: localize("ui.panel.config.helpers.picker.headers.name"),
        main: true,
        sortable: true,
        filterable: true,
        flex: 2,
        direction: "asc",
        extraTemplate: (helper) =>
          helper.label_entries.length
            ? html`
                <ha-data-table-labels
                  .labels=${helper.label_entries}
                ></ha-data-table-labels>
              `
            : nothing,
      },
      entity_id: {
        title: localize("ui.panel.config.helpers.picker.headers.entity_id"),
        sortable: true,
        filterable: true,
      },
      category: {
        title: localize("ui.panel.config.helpers.picker.headers.category"),
        hidden: true,
        groupable: true,
        filterable: true,
        sortable: true,
      },
      labels: {
        title: "",
        hidden: true,
        filterable: true,
        template: (helper) =>
          helper.label_entries.map((lbl) => lbl.name).join(" "),
      },
      localized_type: {
        title: localize("ui.panel.config.helpers.picker.headers.type"),
        sortable: true,
        filterable: true,
        groupable: true,
      },
      editable: {
        title: localize("ui.panel.config.helpers.picker.headers.editable"),
        type: "icon",
        sortable: true,
        minWidth: "88px",
        maxWidth: "88px",
        showNarrow: true,
        template: (helper) => html`
          ${!helper.editable
            ? html`
                <div
                  tabindex="0"
                  style="display:inline-block; position: relative;"
                >
                  <ha-svg-icon
                    .id="icon-edit-${slugify(helper.entity_id)}"
                    .path=${mdiPencilOff}
                  ></ha-svg-icon>
                  <ha-tooltip
                    .for="icon-edit-${slugify(helper.entity_id)}"
                    placement="left"
                    >${this.hass.localize(
                      "ui.panel.config.entities.picker.status.unmanageable"
                    )}
                  </ha-tooltip>
                </div>
              `
            : ""}
        `,
      },
      actions: {
        title: "",
        label: this.hass.localize("ui.panel.config.generic.headers.actions"),
        type: "overflow-menu",
        hideable: false,
        moveable: false,
        showNarrow: true,
        template: (helper) => html`
          <ha-icon-overflow-menu
            .hass=${this.hass}
            narrow
            .items=${[
              ...(helper.configEntry &&
              ERROR_STATES.includes(helper.configEntry.state)
                ? [
                    {
                      path: mdiAlertCircle,
                      label: this.hass.localize(
                        "ui.panel.config.helpers.picker.error_information"
                      ),
                      warning: true,
                      action: () => this._showError(helper),
                    },
                  ]
                : []),
              {
                path: mdiCog,
                label: this.hass.localize(
                  "ui.panel.config.automation.picker.show_settings"
                ),
                action: () => this._openSettings(helper),
              },
              {
                path: mdiTag,
                label: this.hass.localize(
                  `ui.panel.config.automation.picker.${helper.category ? "edit_category" : "assign_category"}`
                ),
                action: () => this._editCategory(helper),
              },
              ...(helper.configEntry &&
              helper.editable &&
              ERROR_STATES.includes(helper.configEntry.state) &&
              helper.entity === undefined
                ? [
                    {
                      path: mdiTrashCan,
                      label: this.hass.localize("ui.common.delete"),
                      warning: true,
                      action: () => this._deleteEntry(helper),
                    },
                  ]
                : []),
            ]}
          >
          </ha-icon-overflow-menu>
        `,
      },
    })
  );

  private _getItems = memoizeOne(
    (
      localize: LocalizeFunc,
      stateItems: HassEntity[],
      disabledEntries: EntityRegistryEntry[],
      entityEntries: Record<string, EntityRegistryEntry>,
      configEntries: Record<string, ConfigEntry>,
      entityReg: EntityRegistryEntry[],
      categoryReg?: CategoryRegistryEntry[],
      labelReg?: LabelRegistryEntry[],
      filteredStateItems?: string[] | null
    ): HelperItem[] => {
      if (filteredStateItems === null) {
        return [];
      }

      const configEntriesCopy = { ...configEntries };

      const states = stateItems.map((entityState) => {
        const configEntry = getConfigEntry(
          entityEntries,
          configEntries,
          entityState.entity_id
        );

        if (configEntry) {
          delete configEntriesCopy[configEntry!.entry_id];
        }

        return {
          id: entityState.entity_id,
          name: entityState.attributes.friendly_name || "",
          entity_id: entityState.entity_id,
          editable:
            configEntry !== undefined || entityState.attributes.editable,
          type: configEntry
            ? configEntry.domain
            : this._entitySource[entityState.entity_id] ||
              computeStateDomain(entityState),
          configEntry,
          entity: entityState,
        };
      });

      const entries = Object.values(configEntriesCopy)
        .map((configEntry) => {
          const entityEntry = Object.values(entityEntries).find(
            (entry) => entry.config_entry_id === configEntry.entry_id
          );
          return {
            id: configEntry.entry_id,
            entity_id: "",
            icon:
              configEntry.state === "setup_in_progress"
                ? mdiProgressHelper
                : mdiAlertCircle,
            name: configEntry.title || "",
            editable: true,
            type: configEntry.domain,
            configEntry,
            entity: undefined,
            selectable: false,
            disabled: !!entityEntry?.disabled_by,
          };
        })
        .filter((e) => !e.disabled);

      const disabledItems = (disabledEntries || []).map((e) => ({
        id: e.entity_id,
        entity_id: e.entity_id,
        icon: mdiCancel,
        name: e.name || e.original_name || e.entity_id,
        editable: true,
        type: e.platform,
        configEntry: undefined,
        entity: undefined,
        selectable: true,
        disabled: true,
      }));

      return [...states, ...entries, ...disabledItems]
        .filter((item) =>
          filteredStateItems
            ? filteredStateItems?.includes(item.entity_id)
            : true
        )
        .map((item) => {
          const entityRegEntry =
            entityRegistryByEntityId(entityReg)[item.entity_id];
          const labels = labelReg && entityRegEntry?.labels;
          const category = entityRegEntry?.categories.helpers;
          return {
            ...item,
            localized_type:
              domainToName(localize, item.type) ||
              localize(
                `ui.panel.config.helpers.types.${item.type}` as LocalizeKeys
              ) ||
              item.type,
            label_entries: (labels || []).map(
              (lbl) => labelReg!.find((label) => label.label_id === lbl)!
            ),
            category: category
              ? categoryReg?.find((cat) => cat.category_id === category)?.name
              : undefined,
          };
        });
    }
  );

  private _labelsForEntity(entityId: string): string[] {
    return (
      this.hass.entities[entityId]?.labels ||
      entityRegistryByEntityId(this._entityReg)[entityId]?.labels ||
      []
    );
  }

  protected render(): TemplateResult {
    if (
      !this.hass ||
      this._stateItems === undefined ||
      this._entityEntries === undefined ||
      this._configEntries === undefined
    ) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }

    const categoryItems = html`${this._categories?.map(
        (category) =>
          html`<ha-md-menu-item
            .value=${category.category_id}
            .clickAction=${this._handleBulkCategory}
          >
            ${category.icon
              ? html`<ha-icon slot="start" .icon=${category.icon}></ha-icon>`
              : html`<ha-svg-icon slot="start" .path=${mdiTag}></ha-svg-icon>`}
            <div slot="headline">${category.name}</div>
          </ha-md-menu-item>`
      )}
      <ha-md-menu-item .value=${null} .clickAction=${this._handleBulkCategory}>
        <div slot="headline">
          ${this.hass.localize(
            "ui.panel.config.automation.picker.bulk_actions.no_category"
          )}
        </div>
      </ha-md-menu-item>
      <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>
      <ha-md-menu-item .clickAction=${this._bulkCreateCategory}>
        <div slot="headline">
          ${this.hass.localize("ui.panel.config.category.editor.add")}
        </div>
      </ha-md-menu-item>`;
    const labelItems = html`${this._labels?.map((label) => {
        const color = label.color ? computeCssColor(label.color) : undefined;
        const selected = this._selected.every((entityId) =>
          this._labelsForEntity(entityId).includes(label.label_id)
        );
        const partial =
          !selected &&
          this._selected.some((entityId) =>
            this._labelsForEntity(entityId).includes(label.label_id)
          );
        return html`<ha-md-menu-item
          .value=${label.label_id}
          .action=${selected ? "remove" : "add"}
          @click=${this._handleBulkLabel}
          keep-open
        >
          <ha-checkbox
            slot="start"
            .checked=${selected}
            .indeterminate=${partial}
            reducedTouchTarget
          ></ha-checkbox>
          <ha-label style=${color ? `--color: ${color}` : ""}>
            ${label.icon
              ? html`<ha-icon slot="icon" .icon=${label.icon}></ha-icon>`
              : nothing}
            ${label.name}
          </ha-label>
        </ha-md-menu-item> `;
      })}<ha-md-divider role="separator" tabindex="-1"></ha-md-divider>
      <ha-md-menu-item .clickAction=${this._bulkCreateLabel}>
        <div slot="headline">
          ${this.hass.localize("ui.panel.config.labels.add_label")}
        </div>
      </ha-md-menu-item>`;
    const labelsInOverflow =
      (this._sizeController.value && this._sizeController.value < 700) ||
      (!this._sizeController.value && this.hass.dockedSidebar === "docked");
    const helpers = this._getItems(
      this.hass.localize,
      this._stateItems,
      this._disabledEntityEntries || [],
      this._entityEntries,
      this._configEntries,
      this._entityReg,
      this._categories,
      this._labels,
      this._filteredStateItems
    );
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.devices}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.helpers.picker.search",
          { number: helpers.length }
        )}
        selectable
        .selected=${this._selected.length}
        @selection-changed=${this._handleSelectionChanged}
        has-filters
        .filters=${Object.values(this._filters).filter((filter) =>
          Array.isArray(filter)
            ? filter.length
            : filter &&
              Object.values(filter).some((val) =>
                Array.isArray(val) ? val.length : val
              )
        ).length}
        .columns=${this._columns(this.hass.localize)}
        .data=${helpers}
        .initialGroupColumn=${this._activeGrouping ?? "category"}
        .initialCollapsedGroups=${this._activeCollapsed}
        .initialSorting=${this._activeSorting}
        .columnOrder=${this._activeColumnOrder}
        .hiddenColumns=${this._activeHiddenColumns}
        @columns-changed=${this._handleColumnsChanged}
        @sorting-changed=${this._handleSortingChanged}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        .activeFilters=${this._activeFilters}
        @clear-filter=${this._clearFilter}
        @row-click=${this._openEditDialog}
        .filter=${this._filter}
        @search-changed=${this._handleSearchChange}
        has-fab
        clickable
        .noDataText=${this.hass.localize(
          "ui.panel.config.helpers.picker.no_helpers"
        )}
        class=${this.narrow ? "narrow" : ""}
      >
        <ha-filter-floor-areas
          .hass=${this.hass}
          .type=${"entity"}
          .value=${this._filters["ha-filter-floor-areas"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-floor-areas"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-floor-areas>
        <ha-filter-devices
          .hass=${this.hass}
          .type=${"entity"}
          .value=${this._filters["ha-filter-devices"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-devices"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-devices>
        <ha-filter-labels
          .hass=${this.hass}
          .value=${this._filters["ha-filter-labels"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-labels"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-labels>
        <ha-filter-categories
          .hass=${this.hass}
          scope="helpers"
          .value=${this._filters["ha-filter-categories"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-categories"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-categories>

        ${!this.narrow
          ? html`<ha-md-button-menu slot="selection-bar">
                <ha-assist-chip
                  slot="trigger"
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.picker.bulk_actions.move_category"
                  )}
                >
                  <ha-svg-icon
                    slot="trailing-icon"
                    .path=${mdiMenuDown}
                  ></ha-svg-icon>
                </ha-assist-chip>
                ${categoryItems}
              </ha-md-button-menu>
              ${labelsInOverflow
                ? nothing
                : html`<ha-md-button-menu slot="selection-bar">
                    <ha-assist-chip
                      slot="trigger"
                      .label=${this.hass.localize(
                        "ui.panel.config.automation.picker.bulk_actions.add_label"
                      )}
                    >
                      <ha-svg-icon
                        slot="trailing-icon"
                        .path=${mdiMenuDown}
                      ></ha-svg-icon>
                    </ha-assist-chip>
                    ${labelItems}
                  </ha-md-button-menu>`}`
          : nothing}
        ${this.narrow || labelsInOverflow
          ? html`
          <ha-md-button-menu has-overflow slot="selection-bar">
            ${
              this.narrow
                ? html`<ha-assist-chip
                    .label=${this.hass.localize(
                      "ui.panel.config.automation.picker.bulk_action"
                    )}
                    slot="trigger"
                  >
                    <ha-svg-icon
                      slot="trailing-icon"
                      .path=${mdiMenuDown}
                    ></ha-svg-icon>
                  </ha-assist-chip>`
                : html`<ha-icon-button
                    .path=${mdiDotsVertical}
                    .label=${this.hass.localize(
                      "ui.panel.config.automation.picker.bulk_action"
                    )}
                    slot="trigger"
                  ></ha-icon-button>`
            }
              <ha-svg-icon
                slot="trailing-icon"
                .path=${mdiMenuDown}
              ></ha-svg-icon
            ></ha-assist-chip>
            ${
              this.narrow
                ? html`<ha-sub-menu>
                    <ha-md-menu-item slot="item">
                      <div slot="headline">
                        ${this.hass.localize(
                          "ui.panel.config.automation.picker.bulk_actions.move_category"
                        )}
                      </div>
                      <ha-svg-icon
                        slot="end"
                        .path=${mdiChevronRight}
                      ></ha-svg-icon>
                    </ha-md-menu-item>
                    <ha-md-menu slot="menu">${categoryItems}</ha-md-menu>
                  </ha-sub-menu>`
                : nothing
            }
            ${
              this.narrow || this.hass.dockedSidebar === "docked"
                ? html` <ha-sub-menu>
                    <ha-md-menu-item slot="item">
                      <div slot="headline">
                        ${this.hass.localize(
                          "ui.panel.config.automation.picker.bulk_actions.add_label"
                        )}
                      </div>
                      <ha-svg-icon
                        slot="end"
                        .path=${mdiChevronRight}
                      ></ha-svg-icon>
                    </ha-md-menu-item>
                    <ha-md-menu slot="menu">${labelItems}</ha-md-menu>
                  </ha-sub-menu>`
                : nothing
            }
          </ha-md-button-menu>`
          : nothing}

        <ha-integration-overflow-menu
          .hass=${this.hass}
          slot="toolbar-icon"
        ></ha-integration-overflow-menu>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.helpers.picker.create_helper"
          )}
          extended
          @click=${this._createHelper}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _filterExpanded(ev) {
    if (ev.detail.expanded) {
      this._expandedFilter = ev.target.localName;
    } else if (this._expandedFilter === ev.target.localName) {
      this._expandedFilter = undefined;
    }
  }

  private _filterChanged(ev) {
    const type = ev.target.localName;

    this._filters = { ...this._filters, [type]: ev.detail.value };
    this._filteredItems = { ...this._filteredItems, [type]: ev.detail.items };
    this._applyFilters();
  }

  private _applyFilters() {
    const filters = Object.entries(this._filters);

    let items: Set<string> | undefined;

    Object.values(this._filteredItems).forEach((itms) => {
      if (!itms) {
        return;
      }
      if (!items) {
        items = itms;
        return;
      }
      items =
        "intersection" in items
          ? // @ts-ignore
            items.intersection(itms)
          : new Set([...items].filter((x) => itms!.has(x)));
    });

    for (const [key, filter] of filters) {
      if (
        key === "ha-filter-labels" &&
        Array.isArray(filter) &&
        filter.length
      ) {
        const labelItems = new Set<string>();
        this._stateItems
          .filter((stateItem) =>
            entityRegistryByEntityId(this._entityReg)[
              stateItem.entity_id
            ]?.labels.some((lbl) => filter.includes(lbl))
          )
          .forEach((stateItem) => labelItems.add(stateItem.entity_id));
        (this._disabledEntityEntries || [])
          .filter((entry) => entry.labels.some((lbl) => filter.includes(lbl)))
          .forEach((entry) => labelItems.add(entry.entity_id));
        if (!items) {
          items = labelItems;
          continue;
        }
        items =
          "intersection" in items
            ? // @ts-ignore
              items.intersection(labelItems)
            : new Set([...items].filter((x) => labelItems!.has(x)));
      }
      if (
        key === "ha-filter-categories" &&
        Array.isArray(filter) &&
        filter.length
      ) {
        const categoryItems = new Set<string>();
        this._stateItems
          .filter(
            (stateItem) =>
              filter[0] ===
              entityRegistryByEntityId(this._entityReg)[stateItem.entity_id]
                ?.categories.helpers
          )
          .forEach((stateItem) => categoryItems.add(stateItem.entity_id));
        (this._disabledEntityEntries || [])
          .filter((entry) => filter[0] === entry.categories.helpers)
          .forEach((entry) => categoryItems.add(entry.entity_id));
        if (!items) {
          items = categoryItems;
          continue;
        }
        items =
          "intersection" in items
            ? // @ts-ignore
              items.intersection(categoryItems)
            : new Set([...items].filter((x) => categoryItems!.has(x)));
      }
    }

    this._filteredStateItems = items ? [...items] : undefined;
  }

  private _clearFilter() {
    this._filters = {};
    this._filteredItems = {};
    this._applyFilters();
  }

  private _editCategory(helper: any) {
    const entityReg = entityRegistryByEntityId(this._entityReg)[
      helper.entity_id
    ];
    if (!entityReg) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.automation.picker.no_category_support"
        ),
        text: this.hass.localize(
          "ui.panel.config.automation.picker.no_category_entity_reg"
        ),
      });
      return;
    }
    showAssignCategoryDialog(this, {
      scope: "helpers",
      entityReg,
    });
  }

  private _handleBulkCategory = (item) => {
    const category = item.value;
    this._bulkAddCategory(category);
  };

  private async _bulkAddCategory(category: string) {
    const promises: Promise<UpdateEntityRegistryEntryResult>[] = [];
    this._selected.forEach((entityId) => {
      promises.push(
        updateEntityRegistryEntry(this.hass, entityId, {
          categories: { helpers: category },
        })
      );
    });
    const result = await Promise.allSettled(promises);
    if (hasRejectedItems(result)) {
      const rejected = rejectedItems(result);
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.common.multiselect.failed", {
          number: rejected.length,
        }),
        text: html`<pre>
${rejected
            .map((r) => r.reason.message || r.reason.code || r.reason)
            .join("\r\n")}</pre
        >`,
      });
    }
  }

  private async _handleBulkLabel(ev) {
    const label = ev.currentTarget.value;
    const action = ev.currentTarget.action;
    this._bulkLabel(label, action);
  }

  private async _bulkLabel(label: string, action: "add" | "remove") {
    const promises: Promise<UpdateEntityRegistryEntryResult>[] = [];
    this._selected.forEach((entityId) => {
      const labels = this._labelsForEntity(entityId);
      promises.push(
        updateEntityRegistryEntry(this.hass, entityId, {
          labels:
            action === "add"
              ? labels.concat(label)
              : labels.filter((lbl) => lbl !== label),
        })
      );
    });
    const result = await Promise.allSettled(promises);
    if (hasRejectedItems(result)) {
      const rejected = rejectedItems(result);
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.common.multiselect.failed", {
          number: rejected.length,
        }),
        text: html`<pre>
${rejected
            .map((r) => r.reason.message || r.reason.code || r.reason)
            .join("\r\n")}</pre
        >`,
      });
    }
  }

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selected = ev.detail.value;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    this._fetchEntitySources();

    if (this.route.path === "/add") {
      this._handleAdd();
    }
  }

  private async _fetchEntitySources() {
    const [entitySources, fetchedManifests] = await Promise.all([
      fetchEntitySourcesWithCache(this.hass),
      fetchIntegrationManifests(this.hass),
    ]);

    const manifests: Record<string, IntegrationManifest> = {};

    for (const manifest of fetchedManifests) {
      if (manifest.integration_type === "helper") {
        manifests[manifest.domain] = manifest;
      }
    }

    this._helperManifests = manifests;

    const entityDomains = {};
    const domains = new Set<string>();

    for (const [entity, source] of Object.entries(entitySources)) {
      const domain = source.domain;
      if (!(domain in manifests)) {
        continue;
      }
      entityDomains[entity] = domain;
      domains.add(domain);
    }

    if (domains.size) {
      this.hass.loadBackendTranslation("title", [...domains]);
    }

    this._entitySource = entityDomains;
  }

  private async _handleAdd() {
    const domain = extractSearchParam("domain");
    navigate("/config/helpers", { replace: true });
    if (!domain) {
      return;
    }
    if (isHelperDomain(domain)) {
      showHelperDetailDialog(this, {
        domain,
      });
      return;
    }
    const handlers = await getConfigFlowHandlers(this.hass, ["helper"]);

    if (!handlers.includes(domain)) {
      const integrations = await getConfigFlowHandlers(this.hass, [
        "device",
        "hub",
        "service",
      ]);
      if (integrations.includes(domain)) {
        navigate(`/config/integrations/add?domain=${domain}`, {
          replace: true,
        });
        return;
      }
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.integrations.config_flow.error"
        ),
        text: this.hass.localize(
          "ui.panel.config.integrations.config_flow.no_config_flow"
        ),
      });
      return;
    }
    const localize = await this.hass.loadBackendTranslation(
      "title",
      domain,
      true
    );
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize("ui.panel.config.integrations.confirm_new", {
          integration: domainToName(localize, domain),
        }),
      }))
    ) {
      return;
    }
    showConfigFlowDialog(this, {
      startFlowHandler: domain,
      manifest: await fetchIntegrationManifest(this.hass, domain),
      showAdvanced: this.hass.userData?.showAdvanced,
    });
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!this._entityEntries || !this._configEntries) {
      return;
    }

    if (
      (changedProps.has("_helperManifests") ||
        changedProps.has("_entityEntries") ||
        changedProps.has("_configEntries")) &&
      this._helperManifests
    ) {
      this._disabledEntityEntries = Object.values(this._entityEntries).filter(
        (e) =>
          e.disabled_by &&
          (e.platform in this._helperManifests! ||
            (e.config_entry_id && e.config_entry_id in this._configEntries!))
      );
    }

    let changed =
      !this._stateItems ||
      changedProps.has("_entityEntries") ||
      changedProps.has("_configEntries") ||
      changedProps.has("_entitySource");

    if (!changed && changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      changed = !oldHass || oldHass.states !== this.hass.states;
    }
    if (!changed) {
      return;
    }

    const entityIds = Object.keys(this._entitySource);

    const newStates = Object.values(this.hass!.states).filter(
      (entity) =>
        entityIds.includes(entity.entity_id) ||
        isHelperDomain(computeStateDomain(entity))
    );

    if (
      this._stateItems.length !== newStates.length ||
      !this._stateItems.every((val, idx) => newStates[idx] === val)
    ) {
      this._stateItems = newStates;
    }
  }

  private async _openEditDialog(ev: CustomEvent): Promise<void> {
    const id = (ev.detail as RowClickedEvent).id;
    if (id.includes(".")) {
      showMoreInfoDialog(this, { entityId: id });
    } else {
      showOptionsFlowDialog(this, this._configEntries![id]);
    }
  }

  private _showError(helper: HelperItem) {
    showAlertDialog(this, {
      title: this.hass.localize("ui.errors.config.configuration_error"),
      text: renderConfigEntryError(this.hass, helper.configEntry!),
      warning: true,
    });
  }

  private async _deleteEntry(helper: HelperItem) {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.integrations.config_entry.delete_confirm_title",
        { title: helper.configEntry!.title }
      ),
      text: this.hass.localize(
        "ui.panel.config.integrations.config_entry.delete_confirm_text"
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }
    deleteConfigEntry(this.hass, helper.id);
  }

  private _openSettings(helper: HelperItem) {
    if (helper.entity) {
      showMoreInfoDialog(this, {
        entityId: helper.entity_id,
        view: "settings",
      });
    } else {
      showOptionsFlowDialog(this, helper.configEntry!);
    }
  }

  private _createHelper() {
    showHelperDetailDialog(this, {});
  }

  private _bulkCreateCategory = () => {
    showCategoryRegistryDetailDialog(this, {
      scope: "helpers",
      createEntry: async (values) => {
        const category = await createCategoryRegistryEntry(
          this.hass,
          "helpers",
          values
        );
        this._bulkAddCategory(category.category_id);
        return category;
      },
    });
  };

  private _bulkCreateLabel = () => {
    showLabelDetailDialog(this, {
      createEntry: async (values) => {
        const label = await createLabelRegistryEntry(this.hass, values);
        this._bulkLabel(label.label_id, "add");
      },
    });
  };

  private _handleSortingChanged(ev: CustomEvent) {
    this._activeSorting = ev.detail;
  }

  private _handleGroupingChanged(ev: CustomEvent) {
    this._activeGrouping = ev.detail.value ?? "";
  }

  private _handleCollapseChanged(ev: CustomEvent) {
    this._activeCollapsed = ev.detail.value;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  private _handleColumnsChanged(ev: CustomEvent) {
    this._activeColumnOrder = ev.detail.columnOrder;
    this._activeHiddenColumns = ev.detail.hiddenColumns;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }
        hass-tabs-subpage-data-table {
          --data-table-row-height: 60px;
        }
        hass-tabs-subpage-data-table.narrow {
          --data-table-row-height: 72px;
        }
        ha-assist-chip {
          --ha-assist-chip-container-shape: 10px;
        }
        ha-md-button-menu ha-assist-chip {
          --md-assist-chip-trailing-space: 8px;
        }
        ha-label {
          --ha-label-background-color: var(--color, var(--grey-color));
          --ha-label-background-opacity: 0.5;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-helpers": HaConfigHelpers;
  }
}
