import { consume } from "@lit-labs/context";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import {
  mdiChevronRight,
  mdiCog,
  mdiContentDuplicate,
  mdiDelete,
  mdiDotsVertical,
  mdiHelpCircle,
  mdiInformationOutline,
  mdiMenuDown,
  mdiPlay,
  mdiPlus,
  mdiScriptText,
  mdiTag,
  mdiTransitConnection,
} from "@mdi/js";
import { differenceInDays } from "date-fns/esm";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { formatShortDateTime } from "../../../common/datetime/format_date_time";
import { relativeTime } from "../../../common/datetime/relative_time";
import { HASSDomEvent, fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { navigate } from "../../../common/navigate";
import { LocalizeFunc } from "../../../common/translations/localize";
import {
  DataTableColumnContainer,
  RowClickedEvent,
  SelectionChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/data-table/ha-data-table-labels";
import "../../../components/ha-fab";
import "../../../components/ha-filter-blueprints";
import "../../../components/ha-filter-categories";
import "../../../components/ha-filter-devices";
import "../../../components/ha-filter-entities";
import "../../../components/ha-filter-floor-areas";
import "../../../components/ha-filter-labels";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-menu-item";
import "../../../components/ha-sub-menu";
import "../../../components/ha-svg-icon";
import {
  CategoryRegistryEntry,
  createCategoryRegistryEntry,
  subscribeCategoryRegistry,
} from "../../../data/category_registry";
import { fullEntitiesContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity";
import {
  EntityRegistryEntry,
  UpdateEntityRegistryEntryResult,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import {
  LabelRegistryEntry,
  createLabelRegistryEntry,
  subscribeLabelRegistry,
} from "../../../data/label_registry";
import {
  ScriptEntity,
  deleteScript,
  fetchScriptFileConfig,
  getScriptStateConfig,
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
import { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import { showNewAutomationDialog } from "../automation/show-dialog-new-automation";
import { showAssignCategoryDialog } from "../category/show-dialog-assign-category";
import { showCategoryRegistryDetailDialog } from "../category/show-dialog-category-registry-detail";
import { configSections } from "../ha-panel-config";
import { showLabelDetailDialog } from "../labels/show-dialog-label-detail";
import {
  hasRejectedItems,
  rejectedItems,
} from "../../../common/util/promise-all-settled-results";

type ScriptItem = ScriptEntity & {
  name: string;
  area: string | undefined;
  category: string | undefined;
  labels: LabelRegistryEntry[];
};

@customElement("ha-script-picker")
class HaScriptPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public scripts!: ScriptEntity[];

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public entityRegistry!: EntityRegistryEntry[];

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _selected: string[] = [];

  @state() private _activeFilters?: string[];

  @state() private _filteredScripts?: string[] | null;

  @state() private _filters: Record<
    string,
    { value: string[] | undefined; items: Set<string> | undefined }
  > = {};

  @state() private _expandedFilter?: string;

  @state()
  _categories!: CategoryRegistryEntry[];

  @state()
  _labels!: LabelRegistryEntry[];

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  private _sizeController = new ResizeController(this, {
    callback: (entries) => entries[0]?.contentRect.width,
  });

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
          selectable: entityRegEntry !== undefined,
        };
      });
    }
  );

  private _columns = memoizeOne(
    (
      narrow,
      localize: LocalizeFunc,
      locale: HomeAssistant["locale"]
    ): DataTableColumnContainer<ScriptItem> => {
      const columns: DataTableColumnContainer = {
        icon: {
          title: "",
          label: localize("ui.panel.config.script.picker.headers.state"),
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
          grows: true,
          template: (script) => {
            const date = new Date(script.last_triggered);
            const now = new Date();
            const dayDifference = differenceInDays(now, date);
            return html`
              <div style="font-size: 14px;">${script.name}</div>
              ${narrow
                ? html`<div class="secondary">
                    ${this.hass.localize("ui.card.automation.last_triggered")}:
                    ${script.attributes.last_triggered
                      ? dayDifference > 3
                        ? formatShortDateTime(date, locale, this.hass.config)
                        : relativeTime(date, locale)
                      : localize("ui.components.relative_time.never")}
                  </div>`
                : nothing}
              ${script.labels.length
                ? html`<ha-data-table-labels
                    @label-clicked=${this._labelClicked}
                    .labels=${script.labels}
                  ></ha-data-table-labels>`
                : nothing}
            `;
          },
        },
        area: {
          title: localize("ui.panel.config.script.picker.headers.area"),
          hidden: true,
          groupable: true,
          filterable: true,
          sortable: true,
        },
        category: {
          title: localize("ui.panel.config.script.picker.headers.category"),
          hidden: true,
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
          hidden: narrow,
          sortable: true,
          width: "40%",
          title: localize("ui.card.automation.last_triggered"),
          template: (script) => {
            const date = new Date(script.last_triggered);
            const now = new Date();
            const dayDifference = differenceInDays(now, date);
            return html`
              ${script.last_triggered
                ? dayDifference > 3
                  ? formatShortDateTime(
                      date,
                      this.hass.locale,
                      this.hass.config
                    )
                  : relativeTime(date, this.hass.locale)
                : this.hass.localize("ui.components.relative_time.never")}
            `;
          },
        },
        actions: {
          title: "",
          width: "64px",
          type: "overflow-menu",
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
    const categoryItems = html`${this._categories?.map(
        (category) =>
          html`<ha-menu-item
            .value=${category.category_id}
            @click=${this._handleBulkCategory}
          >
            ${category.icon
              ? html`<ha-icon slot="start" .icon=${category.icon}></ha-icon>`
              : html`<ha-svg-icon slot="start" .path=${mdiTag}></ha-svg-icon>`}
            <div slot="headline">${category.name}</div>
          </ha-menu-item>`
      )}
      <ha-menu-item .value=${null} @click=${this._handleBulkCategory}>
        <div slot="headline">
          ${this.hass.localize(
            "ui.panel.config.automation.picker.bulk_actions.no_category"
          )}
        </div> </ha-menu-item
      ><md-divider role="separator" tabindex="-1"></md-divider>
      <ha-menu-item @click=${this._bulkCreateCategory}>
        <div slot="headline">
          ${this.hass.localize("ui.panel.config.category.editor.add")}
        </div>
      </ha-menu-item>`;
    const labelItems = html`${this._labels?.map((label) => {
        const color = label.color ? computeCssColor(label.color) : undefined;
        const selected = this._selected.every((entityId) =>
          this.hass.entities[entityId]?.labels.includes(label.label_id)
        );
        const partial =
          !selected &&
          this._selected.some((entityId) =>
            this.hass.entities[entityId]?.labels.includes(label.label_id)
          );
        return html`<ha-menu-item
          .value=${label.label_id}
          .action=${selected ? "remove" : "add"}
          @click=${this._handleBulkLabel}
          keep-open
          reducedTouchTarget
        >
          <ha-checkbox
            slot="start"
            .checked=${selected}
            .indeterminate=${partial}
          ></ha-checkbox>
          <ha-label style=${color ? `--color: ${color}` : ""}>
            ${label.icon
              ? html`<ha-icon slot="icon" .icon=${label.icon}></ha-icon>`
              : nothing}
            ${label.name}
          </ha-label>
        </ha-menu-item>`;
      })}
      <md-divider role="separator" tabindex="-1"></md-divider>
      <ha-menu-item @click=${this._bulkCreateLabel}>
        <div slot="headline">
          ${this.hass.localize("ui.panel.config.labels.add_label")}
        </div></ha-menu-item
      >`;
    const labelsInOverflow =
      (this._sizeController.value && this._sizeController.value < 700) ||
      (!this._sizeController.value && this.hass.dockedSidebar === "docked");
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
        hasFilters
        initialGroupColumn="category"
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
        .columns=${this._columns(
          this.narrow,
          this.hass.localize,
          this.hass.locale
        )}
        .data=${scripts}
        .empty=${!this.scripts.length}
        .activeFilters=${this._activeFilters}
        id="entity_id"
        .noDataText=${this.hass.localize(
          "ui.panel.config.script.picker.no_scripts"
        )}
        @clear-filter=${this._clearFilter}
        hasFab
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
          ? html`<ha-button-menu-new slot="selection-bar">
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
              </ha-button-menu-new>
              ${labelsInOverflow
                ? nothing
                : html`<ha-button-menu-new slot="selection-bar">
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
                  </ha-button-menu-new>`}`
          : nothing}
        ${this.narrow || labelsInOverflow
          ? html`
          <ha-button-menu-new has-overflow slot="selection-bar">
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
                    .label=${"ui.panel.config.automation.picker.bulk_action"}
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
                    <ha-menu-item slot="item">
                      <div slot="headline">
                        ${this.hass.localize(
                          "ui.panel.config.automation.picker.bulk_actions.move_category"
                        )}
                      </div>
                      <ha-svg-icon
                        slot="end"
                        .path=${mdiChevronRight}
                      ></ha-svg-icon>
                    </ha-menu-item>
                    <ha-menu slot="menu">${categoryItems}</ha-menu>
                  </ha-sub-menu>`
                : nothing
            }
            ${
              this.narrow || this.hass.dockedSidebar === "docked"
                ? html` <ha-sub-menu>
                    <ha-menu-item slot="item">
                      <div slot="headline">
                        ${this.hass.localize(
                          "ui.panel.config.automation.picker.bulk_actions.add_label"
                        )}
                      </div>
                      <ha-svg-icon
                        slot="end"
                        .path=${mdiChevronRight}
                      ></ha-svg-icon>
                    </ha-menu-item>
                    <ha-menu slot="menu">${labelItems}</ha-menu>
                  </ha-sub-menu>`
                : nothing
            }
          </ha-button-menu-new>`
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
              <a
                href=${documentationUrl(this.hass, "/docs/script/editor/")}
                target="_blank"
                rel="noreferrer"
              >
                <ha-button>
                  ${this.hass.localize("ui.panel.config.common.learn_more")}
                </ha-button>
              </a>
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
    this._filters[type] = ev.detail;
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
      if (key === "ha-filter-categories" && filter.value?.length) {
        const categoryItems: Set<string> = new Set();
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
      }
      if (key === "ha-filter-labels" && filter.value?.length) {
        const labelItems: Set<string> = new Set();
        this.scripts
          .filter((script) =>
            this._entityReg
              .find((reg) => reg.entity_id === script.entity_id)
              ?.labels.some((lbl) => filter.value!.includes(lbl))
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

  private async _handleBulkCategory(ev) {
    const category = ev.currentTarget.value;
    this._bulkAddCategory(category);
  }

  private async _bulkAddCategory(category: string) {
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

  private async _handleBulkLabel(ev) {
    const label = ev.currentTarget.value;
    const action = ev.currentTarget.action;
    this._bulkLabel(label, action);
  }

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
    await triggerScript(this.hass, entry.unique_id);
    showToast(this, {
      message: this.hass.localize("ui.notification_toast.triggered", {
        name: computeStateName(script),
      }),
    });
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

  private async _bulkCreateCategory() {
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
  }

  private _bulkCreateLabel() {
    showLabelDetailDialog(this, {
      createEntry: async (values) => {
        const label = await createLabelRegistryEntry(this.hass, values);
        this._bulkLabel(label.label_id, "add");
        return label;
      },
    });
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
          --paper-font-headline_-_font-size: 28px;
          --mdc-icon-size: 80px;
          max-width: 500px;
        }
        ha-assist-chip {
          --ha-assist-chip-container-shape: 10px;
        }
        ha-button-menu-new ha-assist-chip {
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
