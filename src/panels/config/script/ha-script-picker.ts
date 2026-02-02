import "@home-assistant/webawesome/dist/components/divider/divider";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import { consume } from "@lit/context";
import {
  mdiCog,
  mdiContentDuplicate,
  mdiDelete,
  mdiDotsVertical,
  mdiHelpCircle,
  mdiInformationOutline,
  mdiMenuDown,
  mdiOpenInNew,
  mdiPlay,
  mdiPlus,
  mdiScriptText,
  mdiTag,
  mdiTextureBox,
  mdiTransitConnection,
} from "@mdi/js";
import { differenceInDays } from "date-fns";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { formatShortDateTimeWithConditionalYear } from "../../../common/datetime/format_date_time";
import { relativeTime } from "../../../common/datetime/relative_time";
import { storage } from "../../../common/decorators/storage";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { navigate } from "../../../common/navigate";
import { slugify } from "../../../common/string/slugify";
import type { LocalizeFunc } from "../../../common/translations/localize";
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
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import type { HaDropdownItem } from "../../../components/ha-dropdown-item";
import "../../../components/ha-fab";
import "../../../components/ha-filter-blueprints";
import "../../../components/ha-filter-categories";
import "../../../components/ha-filter-devices";
import "../../../components/ha-filter-entities";
import "../../../components/ha-filter-floor-areas";
import "../../../components/ha-filter-labels";
import "../../../components/ha-filter-voice-assistants";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-md-divider";
import "../../../components/ha-md-menu";
import "../../../components/ha-md-menu-item";
import "../../../components/ha-sub-menu";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import { createAreaRegistryEntry } from "../../../data/area/area_registry";
import type { CategoryRegistryEntry } from "../../../data/category_registry";
import {
  createCategoryRegistryEntry,
  subscribeCategoryRegistry,
} from "../../../data/category_registry";
import type { CloudStatus } from "../../../data/cloud";
import { fullEntitiesContext } from "../../../data/context";
import type { DataTableFilters } from "../../../data/data_table_filters";
import {
  deserializeFilters,
  serializeFilters,
} from "../../../data/data_table_filters";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type {
  EntityRegistryEntry,
  UpdateEntityRegistryEntryResult,
} from "../../../data/entity/entity_registry";
import { updateEntityRegistryEntry } from "../../../data/entity/entity_registry";
import { getEntityVoiceAssistantsIds } from "../../../data/expose";
import type { LabelRegistryEntry } from "../../../data/label/label_registry";
import {
  createLabelRegistryEntry,
  subscribeLabelRegistry,
} from "../../../data/label/label_registry";
import type { ScriptEntity } from "../../../data/script";
import {
  deleteScript,
  fetchScriptFileConfig,
  getScriptStateConfig,
  hasScriptFields,
  showScriptEditor,
  triggerScript,
} from "../../../data/script";
import { findRelated } from "../../../data/search";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import { showAreaRegistryDetailDialog } from "../areas/show-dialog-area-registry-detail";
import { showNewAutomationDialog } from "../automation/show-dialog-new-automation";
import { showAssignCategoryDialog } from "../category/show-dialog-assign-category";
import { showCategoryRegistryDetailDialog } from "../category/show-dialog-category-registry-detail";
import { configSections } from "../ha-panel-config";
import { showLabelDetailDialog } from "../labels/show-dialog-label-detail";
import {
  getAssistantsSortableKey,
  getAssistantsTableColumn,
} from "../voice-assistants/expose/assistants-table-column";
import { getAvailableAssistants } from "../voice-assistants/expose/available-assistants";

type ScriptItem = ScriptEntity & {
  name: string;
  area: string | undefined;
  last_triggered: string | undefined;
  category: string | undefined;
  labels: LabelRegistryEntry[];
  assistants: string[];
  assistants_sortable_key: string | undefined;
};

@customElement("ha-script-picker")
class HaScriptPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public scripts!: ScriptEntity[];

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @property({ attribute: false }) public entityRegistry!: EntityRegistryEntry[];

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _selected: string[] = [];

  @state() private _activeFilters?: string[];

  @state() private _filteredScripts?: string[] | null;

  @state()
  @storage({
    storage: "sessionStorage",
    key: "script-table-search",
    state: true,
    subscribe: false,
  })
  private _filter = "";

  @state()
  @storage({
    storage: "sessionStorage",
    key: "script-table-filters-full",
    state: true,
    subscribe: false,
    serializer: serializeFilters,
    deserializer: deserializeFilters,
  })
  private _filters: DataTableFilters = {};

  @state() private _expandedFilter?: string;

  @state()
  _categories!: CategoryRegistryEntry[];

  @state()
  _labels!: LabelRegistryEntry[];

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  @storage({ key: "script-table-sort", state: false, subscribe: false })
  private _activeSorting?: SortingChangedEvent;

  @storage({ key: "script-table-grouping", state: false, subscribe: false })
  private _activeGrouping?: string;

  @storage({
    key: "script-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed?: string;

  @storage({
    key: "script-table-column-order",
    state: false,
    subscribe: false,
  })
  private _activeColumnOrder?: string[];

  @storage({
    key: "script-table-hidden-columns",
    state: false,
    subscribe: false,
  })
  private _activeHiddenColumns?: string[];

  private _sizeController = new ResizeController(this, {
    callback: (entries) => entries[0]?.contentRect.width,
  });

  private get _availableAssistants() {
    return getAvailableAssistants(this.cloudStatus, this.hass);
  }

  private _scripts = memoizeOne(
    (
      scripts: ScriptEntity[],
      entityReg: EntityRegistryEntry[],
      areas: HomeAssistant["areas"],
      categoryReg?: CategoryRegistryEntry[],
      labelReg?: LabelRegistryEntry[],
      filteredScripts?: string[] | null
    ): ScriptItem[] => {
      if (filteredScripts === null) {
        return [];
      }
      return (
        filteredScripts
          ? scripts.filter((script) =>
              filteredScripts!.includes(script.entity_id)
            )
          : scripts
      ).map((script) => {
        const entityRegEntry = entityReg.find(
          (reg) => reg.entity_id === script.entity_id
        );
        const category = entityRegEntry?.categories.script;
        const labels = labelReg && entityRegEntry?.labels;
        const assistants = getEntityVoiceAssistantsIds(
          entityReg,
          script.entity_id
        );
        return {
          ...script,
          name: computeStateName(script),
          area: entityRegEntry?.area_id
            ? areas[entityRegEntry?.area_id]?.name
            : undefined,
          last_triggered: script.attributes.last_triggered || undefined,
          category: category
            ? categoryReg?.find((cat) => cat.category_id === category)?.name
            : undefined,
          labels: (labels || []).map(
            (lbl) => labelReg!.find((label) => label.label_id === lbl)!
          ),
          assistants,
          assistants_sortable_key: getAssistantsSortableKey(assistants),
          selectable: entityRegEntry !== undefined,
        };
      });
    }
  );

  private _columns = memoizeOne(
    (
      localize: LocalizeFunc,
      entitiesToCheck: any[]
    ): DataTableColumnContainer<ScriptItem> => {
      const columns: DataTableColumnContainer<ScriptItem> = {
        icon: {
          title: "",
          showNarrow: true,
          moveable: false,
          label: localize("ui.panel.config.script.picker.headers.icon"),
          type: "icon",
          template: (script) =>
            html`<ha-state-icon
              .hass=${this.hass}
              .stateObj=${script}
              style=${styleMap({
                color:
                  script.state === UNAVAILABLE ? "var(--error-color)" : "unset",
              })}
            ></ha-state-icon>`,
        },
        name: {
          title: localize("ui.panel.config.script.picker.headers.name"),
          main: true,
          sortable: true,
          filterable: true,
          direction: "asc",
          flex: 2,
          extraTemplate: (script) =>
            script.labels.length
              ? html`<ha-data-table-labels
                  @label-clicked=${this._labelClicked}
                  .labels=${script.labels}
                ></ha-data-table-labels>`
              : nothing,
        },
        area: {
          title: localize("ui.panel.config.script.picker.headers.area"),
          groupable: true,
          filterable: true,
          sortable: true,
        },
        category: {
          title: localize("ui.panel.config.script.picker.headers.category"),
          defaultHidden: true,
          groupable: true,
          filterable: true,
          sortable: true,
        },
        labels: {
          title: "",
          hidden: true,
          filterable: true,
          template: (script) => script.labels.map((lbl) => lbl.name).join(" "),
        },
        last_triggered: {
          sortable: true,
          title: localize("ui.card.automation.last_triggered"),
          template: (script) => {
            if (!script.last_triggered) {
              return this.hass.localize("ui.components.relative_time.never");
            }
            const date = new Date(script.last_triggered);
            const now = new Date();
            const dayDifference = differenceInDays(now, date);
            const formattedTime = formatShortDateTimeWithConditionalYear(
              date,
              this.hass.locale,
              this.hass.config
            );
            const elementId = "last-triggered-" + slugify(script.entity_id);
            return html`
              ${dayDifference > 3
                ? formattedTime
                : html`
                    <ha-tooltip for=${elementId}>${formattedTime}</ha-tooltip>
                    <span id=${elementId}
                      >${relativeTime(date, this.hass.locale)}</span
                    >
                  `}
            `;
          },
        },
        actions: {
          title: "",
          label: this.hass.localize("ui.panel.config.generic.headers.actions"),
          type: "overflow-menu",
          showNarrow: true,
          moveable: false,
          hideable: false,
          template: (script) => html`
            <ha-icon-overflow-menu
              .hass=${this.hass}
              narrow
              .items=${[
                {
                  path: mdiInformationOutline,
                  label: this.hass.localize(
                    "ui.panel.config.script.picker.show_info"
                  ),
                  action: () => this._showInfo(script),
                },
                {
                  path: mdiCog,
                  label: this.hass.localize(
                    "ui.panel.config.automation.picker.show_settings"
                  ),
                  action: () => this._openSettings(script),
                },
                {
                  path: mdiTag,
                  label: this.hass.localize(
                    `ui.panel.config.script.picker.${script.category ? "edit_category" : "assign_category"}`
                  ),
                  action: () => this._editCategory(script),
                },
                {
                  path: mdiPlay,
                  label: this.hass.localize(
                    "ui.panel.config.script.picker.run"
                  ),
                  action: () => this._runScript(script),
                },
                {
                  path: mdiTransitConnection,
                  label: this.hass.localize(
                    "ui.panel.config.script.picker.show_trace"
                  ),
                  action: () => this._showTrace(script),
                },
                {
                  divider: true,
                },
                {
                  path: mdiContentDuplicate,
                  label: this.hass.localize(
                    "ui.panel.config.script.picker.duplicate"
                  ),
                  action: () => this._duplicate(script),
                },
                {
                  label: this.hass.localize(
                    "ui.panel.config.script.picker.delete"
                  ),
                  path: mdiDelete,
                  action: () => this._deleteConfirm(script),
                  warning: true,
                },
              ]}
            >
            </ha-icon-overflow-menu>
          `,
        },
        assistants: getAssistantsTableColumn(
          localize,
          this.hass,
          this._availableAssistants,
          entitiesToCheck
        ),
      };
      return columns;
    }
  );

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeCategoryRegistry(
        this.hass.connection,
        "script",
        (categories) => {
          this._categories = categories;
        }
      ),
      subscribeLabelRegistry(this.hass.connection, (labels) => {
        this._labels = labels;
      }),
    ];
  }

  protected render(): TemplateResult {
    const areasInOverflow =
      (this._sizeController.value && this._sizeController.value < 900) ||
      (!this._sizeController.value && this.hass.dockedSidebar === "docked");

    const labelsInOverflow =
      areasInOverflow &&
      (!this._sizeController.value || this._sizeController.value < 700);

    const scripts = this._scripts(
      this.scripts,
      this._entityReg,
      this.hass.areas,
      this._categories,
      this._labels,
      this._filteredScripts
    );
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.automations}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.script.picker.search",
          { number: scripts.length }
        )}
        has-filters
        .initialGroupColumn=${this._activeGrouping ?? "category"}
        .initialCollapsedGroups=${this._activeCollapsed}
        .initialSorting=${this._activeSorting}
        .columnOrder=${this._activeColumnOrder}
        .hiddenColumns=${this._activeHiddenColumns}
        @columns-changed=${this._handleColumnsChanged}
        @sorting-changed=${this._handleSortingChanged}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        selectable
        .selected=${this._selected.length}
        @selection-changed=${this._handleSelectionChanged}
        .filters=${Object.values(this._filters).filter((filter) =>
          Array.isArray(filter.value)
            ? filter.value.length
            : filter.value &&
              Object.values(filter.value).some((val) =>
                Array.isArray(val) ? val.length : val
              )
        ).length}
        .columns=${this._columns(this.hass.localize, scripts)}
        .data=${scripts}
        .empty=${!this.scripts.length}
        .activeFilters=${this._activeFilters}
        id="entity_id"
        .noDataText=${this.hass.localize(
          "ui.panel.config.script.picker.no_scripts"
        )}
        @clear-filter=${this._clearFilter}
        .filter=${this._filter}
        @search-changed=${this._handleSearchChange}
        has-fab
        clickable
        class=${this.narrow ? "narrow" : ""}
        @row-click=${this._handleRowClicked}
      >
        <ha-icon-button
          slot="toolbar-icon"
          .label=${this.hass.localize("ui.common.help")}
          .path=${mdiHelpCircle}
          @click=${this._showHelp}
        ></ha-icon-button>
        <ha-filter-floor-areas
          .hass=${this.hass}
          .type=${"script"}
          .value=${this._filters["ha-filter-floor-areas"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-floor-areas"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-floor-areas>
        <ha-filter-devices
          .hass=${this.hass}
          .type=${"script"}
          .value=${this._filters["ha-filter-devices"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-devices"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-devices>
        <ha-filter-entities
          .hass=${this.hass}
          .type=${"script"}
          .value=${this._filters["ha-filter-entities"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-entities"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-entities>
        <ha-filter-labels
          .hass=${this.hass}
          .value=${this._filters["ha-filter-labels"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-labels"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-labels>
        <ha-filter-categories
          .hass=${this.hass}
          scope="script"
          .value=${this._filters["ha-filter-categories"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-categories"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-categories>
        <ha-filter-voice-assistants
          .hass=${this.hass}
          .value=${this._filters["ha-filter-voice-assistants"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-voice-assistants"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-voice-assistants>
        <ha-filter-blueprints
          .hass=${this.hass}
          .type=${"script"}
          .value=${this._filters["ha-filter-blueprints"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-blueprints"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-blueprints>

        ${!this.narrow
          ? html`<ha-dropdown
                slot="selection-bar"
                @wa-select=${this._handleBulkCategory}
              >
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
                ${this._renderCategoryItems()}
              </ha-dropdown>
              ${labelsInOverflow
                ? nothing
                : html`<ha-dropdown
                    slot="selection-bar"
                    @wa-select=${this._handleBulkLabel}
                  >
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
                    ${this._renderLabelItems()}
                  </ha-dropdown>`}
              ${areasInOverflow
                ? nothing
                : html`<ha-dropdown
                    slot="selection-bar"
                    @wa-select=${this._handleBulkArea}
                  >
                    <ha-assist-chip
                      slot="trigger"
                      .label=${this.hass.localize(
                        "ui.panel.config.devices.picker.bulk_actions.move_area"
                      )}
                    >
                      <ha-svg-icon
                        slot="trailing-icon"
                        .path=${mdiMenuDown}
                      ></ha-svg-icon>
                    </ha-assist-chip>
                    ${this._renderAreaItems()}
                  </ha-dropdown>`}`
          : nothing}
        ${this.narrow || areasInOverflow
          ? html` <ha-dropdown
              slot="selection-bar"
              @wa-select=${this._handleBulkAction}
            >
              ${this.narrow
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
                  ></ha-icon-button>`}
              ${this.narrow
                ? html`<ha-dropdown-item>
                    ${this.hass.localize(
                      "ui.panel.config.automation.picker.bulk_actions.move_category"
                    )}
                    ${this._renderCategoryItems("submenu")}
                  </ha-dropdown-item>`
                : nothing}
              ${this.narrow || labelsInOverflow
                ? html`<ha-dropdown-item>
                    ${this.hass.localize(
                      "ui.panel.config.automation.picker.bulk_actions.add_label"
                    )}
                    ${this._renderLabelItems("submenu")}
                  </ha-dropdown-item>`
                : nothing}
              ${this.narrow || areasInOverflow
                ? html`<ha-dropdown-item>
                    ${this.hass.localize(
                      "ui.panel.config.devices.picker.bulk_actions.move_area"
                    )}
                    ${this._renderAreaItems("submenu")}
                  </ha-dropdown-item>`
                : nothing}
            </ha-dropdown>`
          : nothing}
        ${!this.scripts.length
          ? html` <div class="empty" slot="empty">
              <ha-svg-icon .path=${mdiScriptText}></ha-svg-icon>
              <h1>
                ${this.hass.localize(
                  "ui.panel.config.script.picker.empty_header"
                )}
              </h1>
              <p>
                ${this.hass.localize(
                  "ui.panel.config.script.picker.empty_text"
                )}
              </p>
              <ha-button
                appearance="plain"
                href=${documentationUrl(this.hass, "/docs/script/editor/")}
                target="_blank"
                rel="noreferrer"
                size="small"
              >
                ${this.hass.localize("ui.panel.config.common.learn_more")}
                <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
              </ha-button>
            </div>`
          : nothing}
        <ha-fab
          slot="fab"
          ?is-wide=${this.isWide}
          ?narrow=${this.narrow}
          .label=${this.hass.localize(
            "ui.panel.config.script.picker.add_script"
          )}
          extended
          @click=${this._createNew}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  private _filterExpanded(ev) {
    if (ev.detail.expanded) {
      this._expandedFilter = ev.target.localName;
    } else if (this._expandedFilter === ev.target.localName) {
      this._expandedFilter = undefined;
    }
  }

  private _labelClicked = (ev: CustomEvent) => {
    const label = ev.detail.label;
    this._filters = {
      ...this._filters,
      "ha-filter-labels": {
        value: [label.label_id],
        items: undefined,
      },
    };
    this._applyFilters();
  };

  private _filterChanged(ev) {
    const type = ev.target.localName;
    this._filters = { ...this._filters, [type]: ev.detail };
    this._applyFilters();
  }

  private _clearFilter() {
    this._filters = {};
    this._applyFilters();
  }

  private _applyFilters() {
    const filters = Object.entries(this._filters);
    let items: Set<string> | undefined;
    for (const [key, filter] of filters) {
      if (filter.items) {
        if (!items) {
          items = filter.items;
          continue;
        }
        items =
          "intersection" in items
            ? // @ts-ignore
              items.intersection(filter.items)
            : new Set([...items].filter((x) => filter.items!.has(x)));
      }
      if (
        key === "ha-filter-categories" &&
        Array.isArray(filter.value) &&
        filter.value.length
      ) {
        const categoryItems = new Set<string>();
        this.scripts
          .filter(
            (script) =>
              filter.value![0] ===
              this._entityReg.find((reg) => reg.entity_id === script.entity_id)
                ?.categories.script
          )
          .forEach((script) => categoryItems.add(script.entity_id));
        if (!items) {
          items = categoryItems;
          continue;
        }
        items =
          "intersection" in items
            ? // @ts-ignore
              items.intersection(categoryItems)
            : new Set([...items].filter((x) => categoryItems!.has(x)));
      } else if (
        key === "ha-filter-labels" &&
        Array.isArray(filter.value) &&
        filter.value.length
      ) {
        const labelItems = new Set<string>();
        this.scripts
          .filter((script) =>
            this._entityReg
              .find((reg) => reg.entity_id === script.entity_id)
              ?.labels.some((lbl) => (filter.value as string[]).includes(lbl))
          )
          .forEach((script) => labelItems.add(script.entity_id));
        if (!items) {
          items = labelItems;
          continue;
        }
        items =
          "intersection" in items
            ? // @ts-ignore
              items.intersection(labelItems)
            : new Set([...items].filter((x) => labelItems!.has(x)));
      } else if (
        key === "ha-filter-voice-assistants" &&
        Array.isArray(filter.value) &&
        filter.value.length
      ) {
        const assistItems = new Set<string>();
        this.scripts
          .filter((script) =>
            getEntityVoiceAssistantsIds(this._entityReg, script.entity_id).some(
              (va) => (filter.value as string[]).includes(va)
            )
          )
          .forEach((script) => assistItems.add(script.entity_id));
        if (!items) {
          items = assistItems;
          continue;
        }
        items =
          "intersection" in items
            ? // @ts-ignore
              items.intersection(assistItems)
            : new Set([...items].filter((x) => assistItems!.has(x)));
      }
    }
    this._filteredScripts = items ? [...items] : undefined;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("_entityReg")) {
      this._applyFilters();
    }
  }

  firstUpdated() {
    if (this._searchParms.has("blueprint")) {
      this._filterBlueprint();
    }
    if (this._searchParms.has("label")) {
      this._filterLabel();
    }
  }

  private _filterLabel() {
    const label = this._searchParms.get("label");
    if (!label) {
      return;
    }
    this._filters = {
      ...this._filters,
      "ha-filter-labels": {
        value: [label],
        items: undefined,
      },
    };
    this._applyFilters();
  }

  private async _filterBlueprint() {
    const blueprint = this._searchParms.get("blueprint");
    if (!blueprint) {
      return;
    }
    const related = await findRelated(this.hass, "script_blueprint", blueprint);
    this._filters = {
      ...this._filters,
      "ha-filter-blueprints": {
        value: [blueprint],
        items: new Set(related.automation || []),
      },
    };
    this._applyFilters();
  }

  private _editCategory(script: any) {
    const entityReg = this._entityReg.find(
      (reg) => reg.entity_id === script.entity_id
    );
    if (!entityReg) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.script.picker.no_category_support"
        ),
        text: this.hass.localize(
          "ui.panel.config.script.picker.no_category_entity_reg"
        ),
      });
      return;
    }
    showAssignCategoryDialog(this, {
      scope: "script",
      entityReg,
    });
  }

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selected = ev.detail.value;
  }

  private _handleBulkCategory = (ev: CustomEvent<{ item: HaDropdownItem }>) => {
    const value = ev.detail.item.value;
    if (value === "category_create") {
      this._bulkCreateCategory();
      return;
    }
    if (value === "category_none") {
      this._bulkAddCategory(null);
      return;
    }
    if (value?.startsWith("category_")) {
      this._bulkAddCategory(value.substring(9));
    }
  };

  private async _bulkAddCategory(category: string | null) {
    const promises: Promise<UpdateEntityRegistryEntryResult>[] = [];
    this._selected.forEach((entityId) => {
      promises.push(
        updateEntityRegistryEntry(this.hass, entityId, {
          categories: { script: category },
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

  private _handleBulkLabel = (ev: CustomEvent<{ item: HaDropdownItem }>) => {
    ev.preventDefault();
    const value = ev.detail.item.value;
    if (value === "label_create") {
      this._bulkCreateLabel();
      return;
    }
    if (value?.startsWith("label_")) {
      const action = (ev.detail.item as any).action;
      this._bulkLabel(value.substring(6), action);
    }
  };

  private async _bulkLabel(label: string, action: "add" | "remove") {
    const promises: Promise<UpdateEntityRegistryEntryResult>[] = [];
    this._selected.forEach((entityId) => {
      promises.push(
        updateEntityRegistryEntry(this.hass, entityId, {
          labels:
            action === "add"
              ? this.hass.entities[entityId].labels.concat(label)
              : this.hass.entities[entityId].labels.filter(
                  (lbl) => lbl !== label
                ),
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

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const entry = this.entityRegistry.find((e) => e.entity_id === ev.detail.id);
    if (entry) {
      navigate(`/config/script/edit/${entry.unique_id}`);
    } else {
      navigate(`/config/script/show/${ev.detail.id}`);
    }
  }

  private _createNew() {
    if (isComponentLoaded(this.hass, "blueprint")) {
      showNewAutomationDialog(this, { mode: "script" });
    } else {
      navigate("/config/script/edit/new");
    }
  }

  private _runScript = async (script: any) => {
    const entry = this.entityRegistry.find(
      (e) => e.entity_id === script.entity_id
    );
    if (!entry) {
      return;
    }

    if (hasScriptFields(this.hass, entry.unique_id)) {
      this._showInfo(script);
    } else {
      await triggerScript(this.hass, entry.unique_id);
      showToast(this, {
        message: this.hass.localize("ui.notification_toast.triggered", {
          name: computeStateName(script),
        }),
      });
    }
  };

  private _showInfo(script: any) {
    fireEvent(this, "hass-more-info", { entityId: script.entity_id });
  }

  private _openSettings(script: any) {
    showMoreInfoDialog(this, {
      entityId: script.entity_id,
      view: "settings",
    });
  }

  private _showTrace(script: any) {
    const entry = this.entityRegistry.find(
      (e) => e.entity_id === script.entity_id
    );
    if (entry) {
      navigate(`/config/script/trace/${entry.unique_id}`);
    }
  }

  private _showHelp() {
    showAlertDialog(this, {
      title: this.hass.localize("ui.panel.config.script.caption"),
      text: html`
        ${this.hass.localize("ui.panel.config.script.picker.introduction")}
        <p>
          <a
            href=${documentationUrl(this.hass, "/docs/scripts/")}
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize("ui.panel.config.script.picker.learn_more")}
          </a>
        </p>
      `,
    });
  }

  private async _duplicate(script: any) {
    try {
      const entry = this.entityRegistry.find(
        (e) => e.entity_id === script.entity_id
      );
      if (!entry) {
        return;
      }
      const config = await fetchScriptFileConfig(this.hass, entry.unique_id);
      showScriptEditor({
        ...config,
        alias: `${config?.alias} (${this.hass.localize(
          "ui.panel.config.script.picker.duplicate"
        )})`,
      });
    } catch (err: any) {
      if (err.status_code === 404) {
        const response = await getScriptStateConfig(
          this.hass,
          script.entity_id
        );
        showScriptEditor(response.config);
        return;
      }
      await showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.script.editor.load_error_unknown",
          { err_no: err.status_code }
        ),
      });
    }
  }

  private async _deleteConfirm(script: any) {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.script.editor.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.script.editor.delete_confirm_text",
        { name: script.name }
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirm: () => this._delete(script),
      destructive: true,
    });
  }

  private async _delete(script: any) {
    try {
      const entry = this.entityRegistry.find(
        (e) => e.entity_id === script.entity_id
      );
      if (entry) {
        await deleteScript(this.hass, entry.unique_id);
        this._selected = this._selected.filter(
          (entityId) => entityId !== script.entity_id
        );
      }
    } catch (err: any) {
      await showAlertDialog(this, {
        text:
          err.status_code === 400
            ? this.hass.localize(
                "ui.panel.config.script.editor.load_error_not_deletable"
              )
            : this.hass.localize(
                "ui.panel.config.script.editor.load_error_unknown",
                { err_no: err.status_code }
              ),
      });
    }
  }

  private _bulkCreateCategory = () => {
    showCategoryRegistryDetailDialog(this, {
      scope: "script",
      createEntry: async (values) => {
        const category = await createCategoryRegistryEntry(
          this.hass,
          "script",
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

  private _handleBulkArea = (ev: CustomEvent<{ item: HaDropdownItem }>) => {
    const value = ev.detail.item.value;
    if (value === "area_create") {
      this._bulkCreateArea();
      return;
    }
    if (value === "area_none") {
      this._bulkAddArea(null);
      return;
    }
    if (value?.startsWith("area_")) {
      this._bulkAddArea(value.substring(5));
    }
  };

  private async _bulkAddArea(area: string | null) {
    const promises: Promise<UpdateEntityRegistryEntryResult>[] = [];
    this._selected.forEach((entityId) => {
      promises.push(
        updateEntityRegistryEntry(this.hass, entityId, {
          area_id: area,
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

  private _bulkCreateArea = () => {
    showAreaRegistryDetailDialog(this, {
      createEntry: async (values) => {
        const area = await createAreaRegistryEntry(this.hass, values);
        this._bulkAddArea(area.area_id);
        return area;
      },
    });
  };

  private _renderCategoryItems = (slot = "") =>
    html`${this._categories?.map(
        (category) =>
          html`<ha-dropdown-item
            .slot=${slot}
            .value=${`category_${category.category_id}`}
          >
            ${category.icon
              ? html`<ha-icon slot="icon" .icon=${category.icon}></ha-icon>`
              : html`<ha-svg-icon slot="icon" .path=${mdiTag}></ha-svg-icon>`}
            ${category.name}
          </ha-dropdown-item>`
      )}
      <ha-dropdown-item .slot=${slot} value="category_none">
        ${this.hass.localize(
          "ui.panel.config.automation.picker.bulk_actions.no_category"
        )}
      </ha-dropdown-item>
      <wa-divider .slot=${slot}></wa-divider>
      <ha-dropdown-item .slot=${slot} value="category_create">
        ${this.hass.localize("ui.panel.config.category.editor.add")}
      </ha-dropdown-item>`;

  private _renderLabelItems = (slot = "") =>
    html`${this._labels?.map((label) => {
        const color = label.color ? computeCssColor(label.color) : undefined;
        const selected = this._selected.every((entityId) =>
          this.hass.entities[entityId]?.labels.includes(label.label_id)
        );
        const partial =
          !selected &&
          this._selected.some((entityId) =>
            this.hass.entities[entityId]?.labels.includes(label.label_id)
          );
        return html`<ha-dropdown-item
          .slot=${slot}
          .value=${`label_${label.label_id}`}
          .action=${selected ? "remove" : "add"}
        >
          <ha-checkbox
            slot="icon"
            .checked=${selected}
            .indeterminate=${partial}
            reducedTouchTarget
          ></ha-checkbox>
          <ha-label
            style=${color ? `--color: ${color}` : ""}
            .description=${label.description}
          >
            ${label.icon
              ? html`<ha-icon slot="icon" .icon=${label.icon}></ha-icon>`
              : nothing}
            ${label.name}
          </ha-label>
        </ha-dropdown-item>`;
      })}
      <wa-divider .slot=${slot}></wa-divider>
      <ha-dropdown-item .slot=${slot} value="label_create">
        ${this.hass.localize("ui.panel.config.labels.add_label")}
      </ha-dropdown-item>`;

  private _renderAreaItems = (slot = "") =>
    html`${Object.values(this.hass.areas).map(
        (area) =>
          html`<ha-dropdown-item .slot=${slot} .value=${`area_${area.area_id}`}>
            ${area.icon
              ? html`<ha-icon slot="icon" .icon=${area.icon}></ha-icon>`
              : html`<ha-svg-icon
                  slot="icon"
                  .path=${mdiTextureBox}
                ></ha-svg-icon>`}
            ${area.name}
          </ha-dropdown-item>`
      )}
      <ha-dropdown-item .slot=${slot} value="area_none">
        ${this.hass.localize(
          "ui.panel.config.devices.picker.bulk_actions.no_area"
        )}
      </ha-dropdown-item>
      <wa-divider .slot=${slot}></wa-divider>
      <ha-dropdown-item .slot=${slot} value="area_create">
        ${this.hass.localize(
          "ui.panel.config.devices.picker.bulk_actions.add_area"
        )}
      </ha-dropdown-item>`;

  private _handleBulkAction = (ev) => {
    const item = ev.detail.item;
    const value = item.value;

    if (!value) {
      return;
    }

    if (value.startsWith("category_")) {
      if (value === "category_create") {
        this._bulkCreateCategory();
      } else if (value === "category_none") {
        this._bulkAddCategory(null);
      } else {
        this._bulkAddCategory(value.substring(9));
      }
      return;
    }

    if (value.startsWith("label_")) {
      if (value === "label_create") {
        this._bulkCreateLabel();
      } else {
        const action = item.action;
        this._bulkLabel(value.substring(6), action);
      }
      return;
    }

    if (value.startsWith("area_")) {
      if (value === "area_create") {
        this._bulkCreateArea();
      } else if (value === "area_none") {
        this._bulkAddArea(null);
      } else {
        this._bulkAddArea(value.substring(5));
      }
    }
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
          height: 100%;
        }
        hass-tabs-subpage-data-table {
          --data-table-row-height: 60px;
        }
        hass-tabs-subpage-data-table.narrow {
          --data-table-row-height: 72px;
        }
        a {
          text-decoration: none;
        }
        .empty {
          --mdc-icon-size: 80px;
          max-width: 500px;
        }
        .empty ha-button {
          --mdc-icon-size: 24px;
        }
        .empty h1 {
          font-size: var(--ha-font-size-3xl);
        }
        ha-assist-chip {
          --ha-assist-chip-container-shape: 10px;
        }
        ha-dropdown::part(menu),
        ha-dropdown::part(submenu) {
          --auto-size-available-width: calc(50vw - var(--ha-space-4));
        }
        ha-dropdown ha-assist-chip {
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
    "ha-script-picker": HaScriptPicker;
  }
}
