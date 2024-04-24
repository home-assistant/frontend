import { consume } from "@lit-labs/context";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import {
  mdiChevronRight,
  mdiCog,
  mdiContentDuplicate,
  mdiDelete,
  mdiDotsVertical,
  mdiHelpCircle,
  mdiInformationOutline,
  mdiMenuDown,
  mdiPalette,
  mdiPencilOff,
  mdiPlay,
  mdiPlus,
  mdiTag,
  mdiTextureBox,
} from "@mdi/js";
import { differenceInDays } from "date-fns";
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
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import { formatShortDateTime } from "../../../common/datetime/format_date_time";
import { relativeTime } from "../../../common/datetime/relative_time";
import { storage } from "../../../common/decorators/storage";
import { HASSDomEvent, fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { navigate } from "../../../common/navigate";
import { LocalizeFunc } from "../../../common/translations/localize";
import {
  hasRejectedItems,
  rejectedItems,
} from "../../../common/util/promise-all-settled-results";
import {
  DataTableColumnContainer,
  RowClickedEvent,
  SelectionChangedEvent,
  SortingChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/data-table/ha-data-table-labels";
import "../../../components/ha-button";
import "../../../components/ha-fab";
import "../../../components/ha-filter-categories";
import "../../../components/ha-filter-devices";
import "../../../components/ha-filter-entities";
import "../../../components/ha-filter-floor-areas";
import "../../../components/ha-filter-labels";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-menu-item";
import "../../../components/ha-state-icon";
import "../../../components/ha-sub-menu";
import "../../../components/ha-svg-icon";
import { createAreaRegistryEntry } from "../../../data/area_registry";
import {
  CategoryRegistryEntry,
  createCategoryRegistryEntry,
  subscribeCategoryRegistry,
} from "../../../data/category_registry";
import { fullEntitiesContext } from "../../../data/context";
import { isUnavailableState } from "../../../data/entity";
import {
  EntityRegistryEntry,
  UpdateEntityRegistryEntryResult,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import { forwardHaptic } from "../../../data/haptics";
import {
  LabelRegistryEntry,
  createLabelRegistryEntry,
  subscribeLabelRegistry,
} from "../../../data/label_registry";
import {
  SceneEntity,
  activateScene,
  deleteScene,
  getSceneConfig,
  showSceneEditor,
} from "../../../data/scene";
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
import { showAreaRegistryDetailDialog } from "../areas/show-dialog-area-registry-detail";
import { showAssignCategoryDialog } from "../category/show-dialog-assign-category";
import { showCategoryRegistryDetailDialog } from "../category/show-dialog-category-registry-detail";
import { configSections } from "../ha-panel-config";
import { showLabelDetailDialog } from "../labels/show-dialog-label-detail";

type SceneItem = SceneEntity & {
  name: string;
  area: string | undefined;
  category: string | undefined;
  labels: LabelRegistryEntry[];
};

@customElement("ha-scene-dashboard")
class HaSceneDashboard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public isWide = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public scenes!: SceneEntity[];

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _selected: string[] = [];

  @state() private _activeFilters?: string[];

  @state() private _filteredScenes?: string[] | null;

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

  @storage({ key: "scene-table-sort", state: false, subscribe: false })
  private _activeSorting?: SortingChangedEvent;

  @storage({ key: "scene-table-grouping", state: false, subscribe: false })
  private _activeGrouping?: string;

  @storage({
    key: "scene-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed?: string;

  private _sizeController = new ResizeController(this, {
    callback: (entries) => entries[0]?.contentRect.width,
  });

  private _scenes = memoizeOne(
    (
      scenes: SceneEntity[],
      entityReg: EntityRegistryEntry[],
      areas: HomeAssistant["areas"],
      categoryReg?: CategoryRegistryEntry[],
      labelReg?: LabelRegistryEntry[],
      filteredScenes?: string[] | null
    ): SceneItem[] => {
      if (filteredScenes === null) {
        return [];
      }
      return (
        filteredScenes
          ? scenes.filter((scene) => filteredScenes!.includes(scene.entity_id))
          : scenes
      ).map((scene) => {
        const entityRegEntry = entityReg.find(
          (reg) => reg.entity_id === scene.entity_id
        );
        const category = entityRegEntry?.categories.scene;
        const labels = labelReg && entityRegEntry?.labels;
        return {
          ...scene,
          name: computeStateName(scene),
          area: entityRegEntry?.area_id
            ? areas[entityRegEntry?.area_id]?.name
            : undefined,
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
    (narrow, localize: LocalizeFunc): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<SceneItem> = {
        icon: {
          title: "",
          label: localize("ui.panel.config.scene.picker.headers.state"),
          type: "icon",
          template: (scene) => html`
            <ha-state-icon
              .hass=${this.hass}
              .stateObj=${scene}
            ></ha-state-icon>
          `,
        },
        name: {
          title: localize("ui.panel.config.scene.picker.headers.name"),
          main: true,
          sortable: true,
          filterable: true,
          direction: "asc",
          grows: true,
          template: (scene) => html`
            <div style="font-size: 14px;">${scene.name}</div>
            ${scene.labels.length
              ? html`<ha-data-table-labels
                  @label-clicked=${this._labelClicked}
                  .labels=${scene.labels}
                ></ha-data-table-labels>`
              : nothing}
          `,
        },
        area: {
          title: localize("ui.panel.config.scene.picker.headers.area"),
          hidden: true,
          groupable: true,
          filterable: true,
          sortable: true,
        },
        category: {
          title: localize("ui.panel.config.scene.picker.headers.category"),
          hidden: true,
          groupable: true,
          filterable: true,
          sortable: true,
        },
        labels: {
          title: "",
          hidden: true,
          filterable: true,
          template: (scene) => scene.labels.map((lbl) => lbl.name).join(" "),
        },
        state: {
          title: localize(
            "ui.panel.config.scene.picker.headers.last_activated"
          ),
          sortable: true,
          width: "30%",
          hidden: narrow,
          template: (scene) => {
            const lastActivated = scene.state;
            if (!lastActivated || isUnavailableState(lastActivated)) {
              return localize("ui.components.relative_time.never");
            }
            const date = new Date(scene.state);
            const now = new Date();
            const dayDifference = differenceInDays(now, date);
            return html`
              ${dayDifference > 3
                ? formatShortDateTime(date, this.hass.locale, this.hass.config)
                : relativeTime(date, this.hass.locale)}
            `;
          },
        },
        only_editable: {
          title: "",
          width: "56px",
          template: (scene) =>
            !scene.attributes.id
              ? html`
                  <simple-tooltip animation-delay="0" position="left">
                    ${this.hass.localize(
                      "ui.panel.config.scene.picker.only_editable"
                    )}
                  </simple-tooltip>
                  <ha-svg-icon
                    .path=${mdiPencilOff}
                    style="color: var(--secondary-text-color)"
                  ></ha-svg-icon>
                `
              : "",
        },
        actions: {
          title: "",
          width: "64px",
          type: "overflow-menu",
          template: (scene) => html`
            <ha-icon-overflow-menu
              .hass=${this.hass}
              narrow
              .items=${[
                {
                  path: mdiInformationOutline,
                  label: this.hass.localize(
                    "ui.panel.config.scene.picker.show_info"
                  ),
                  action: () => this._showInfo(scene),
                },
                {
                  path: mdiCog,
                  label: this.hass.localize(
                    "ui.panel.config.automation.picker.show_settings"
                  ),
                  action: () => this._openSettings(scene),
                },
                {
                  path: mdiPlay,
                  label: this.hass.localize(
                    "ui.panel.config.scene.picker.activate"
                  ),
                  action: () => this._activateScene(scene),
                },
                {
                  path: mdiTag,
                  label: this.hass.localize(
                    `ui.panel.config.scene.picker.${scene.category ? "edit_category" : "assign_category"}`
                  ),
                  action: () => this._editCategory(scene),
                },
                {
                  divider: true,
                },
                {
                  path: mdiContentDuplicate,
                  label: this.hass.localize(
                    "ui.panel.config.scene.picker.duplicate"
                  ),
                  action: () => this._duplicate(scene),
                  disabled: !scene.attributes.id,
                },
                {
                  label: this.hass.localize(
                    "ui.panel.config.scene.picker.delete"
                  ),
                  path: mdiDelete,
                  action: () => this._deleteConfirm(scene),
                  warning: scene.attributes.id,
                  disabled: !scene.attributes.id,
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

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("_entityReg")) {
      this._applyFilters();
    }
  }

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeCategoryRegistry(this.hass.connection, "scene", (categories) => {
        this._categories = categories;
      }),
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
        </div>
      </ha-menu-item>
      <md-divider role="separator" tabindex="-1"></md-divider>
      <ha-menu-item @click=${this._bulkCreateCategory}>
        <div slot="headline">
          ${this.hass.localize("ui.panel.config.category.editor.add")}
        </div>
      </ha-menu-item>`;

    const labelItems = html` ${this._labels?.map((label) => {
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
        </ha-menu-item>`;
      })}
      <md-divider role="separator" tabindex="-1"></md-divider>
      <ha-menu-item @click=${this._bulkCreateLabel}>
        <div slot="headline">
          ${this.hass.localize("ui.panel.config.labels.add_label")}
        </div></ha-menu-item
      >`;

    const areaItems = html`${Object.values(this.hass.areas).map(
        (area) =>
          html`<ha-menu-item
            .value=${area.area_id}
            @click=${this._handleBulkArea}
          >
            ${area.icon
              ? html`<ha-icon slot="start" .icon=${area.icon}></ha-icon>`
              : html`<ha-svg-icon
                  slot="start"
                  .path=${mdiTextureBox}
                ></ha-svg-icon>`}
            <div slot="headline">${area.name}</div>
          </ha-menu-item>`
      )}
      <ha-menu-item .value=${null} @click=${this._handleBulkArea}>
        <div slot="headline">
          ${this.hass.localize(
            "ui.panel.config.devices.picker.bulk_actions.no_area"
          )}
        </div>
      </ha-menu-item>
      <md-divider role="separator" tabindex="-1"></md-divider>
      <ha-menu-item @click=${this._bulkCreateArea}>
        <div slot="headline">
          ${this.hass.localize(
            "ui.panel.config.devices.picker.bulk_actions.add_area"
          )}
        </div>
      </ha-menu-item>`;

    const areasInOverflow =
      (this._sizeController.value && this._sizeController.value < 900) ||
      (!this._sizeController.value && this.hass.dockedSidebar === "docked");

    const labelsInOverflow =
      areasInOverflow &&
      (!this._sizeController.value || this._sizeController.value < 700);

    const scenes = this._scenes(
      this.scenes,
      this._entityReg,
      this.hass.areas,
      this._categories,
      this._labels,
      this._filteredScenes
    );

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.automations}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.scene.picker.search",
          { number: scenes.length }
        )}
        selectable
        .selected=${this._selected.length}
        @selection-changed=${this._handleSelectionChanged}
        hasFilters
        .filters=${Object.values(this._filters).filter((filter) =>
          Array.isArray(filter.value)
            ? filter.value.length
            : filter.value &&
              Object.values(filter.value).some((val) =>
                Array.isArray(val) ? val.length : val
              )
        ).length}
        .columns=${this._columns(this.narrow, this.hass.localize)}
        id="entity_id"
        .initialGroupColumn=${this._activeGrouping || "category"}
        .initialCollapsedGroups=${this._activeCollapsed}
        .initialSorting=${this._activeSorting}
        @sorting-changed=${this._handleSortingChanged}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        .data=${scenes}
        .empty=${!this.scenes.length}
        .activeFilters=${this._activeFilters}
        .noDataText=${this.hass.localize(
          "ui.panel.config.scene.picker.no_scenes"
        )}
        @clear-filter=${this._clearFilter}
        hasFab
        clickable
        @row-click=${this._handleRowClicked}
      >
        <ha-icon-button
          slot="toolbar-icon"
          @click=${this._showHelp}
          .label=${this.hass.localize("ui.common.help")}
          .path=${mdiHelpCircle}
        ></ha-icon-button>

        <ha-filter-floor-areas
          .hass=${this.hass}
          .type=${"scene"}
          .value=${this._filters["ha-filter-floor-areas"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-floor-areas"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-floor-areas>
        <ha-filter-devices
          .hass=${this.hass}
          .type=${"scene"}
          .value=${this._filters["ha-filter-devices"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-devices"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-devices>
        <ha-filter-entities
          .hass=${this.hass}
          .type=${"scene"}
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
          scope="scene"
          .value=${this._filters["ha-filter-categories"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-categories"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-categories>

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
                  </ha-button-menu-new>`}
              ${areasInOverflow
                ? nothing
                : html`<ha-button-menu-new slot="selection-bar">
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
                    ${areaItems}
                  </ha-button-menu-new>`}`
          : nothing}
        ${this.narrow || areasInOverflow
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
              this.narrow || labelsInOverflow
                ? html`<ha-sub-menu>
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
            ${
              this.narrow || areasInOverflow
                ? html`<ha-sub-menu>
                    <ha-menu-item slot="item">
                      <div slot="headline">
                        ${this.hass.localize(
                          "ui.panel.config.devices.picker.bulk_actions.move_area"
                        )}
                      </div>
                      <ha-svg-icon
                        slot="end"
                        .path=${mdiChevronRight}
                      ></ha-svg-icon>
                    </ha-menu-item>
                    <ha-menu slot="menu">${areaItems}</ha-menu>
                  </ha-sub-menu>`
                : nothing
            }
          </ha-button-menu-new>`
          : nothing}
        ${!this.scenes.length
          ? html`<div class="empty" slot="empty">
              <ha-svg-icon .path=${mdiPalette}></ha-svg-icon>
              <h1>
                ${this.hass.localize(
                  "ui.panel.config.scene.picker.empty_header"
                )}
              </h1>
              <p>
                ${this.hass.localize("ui.panel.config.scene.picker.empty_text")}
              </p>
              <a
                href=${documentationUrl(this.hass, "/docs/scene/editor/")}
                target="_blank"
                rel="noreferrer"
              >
                <ha-button>
                  ${this.hass.localize("ui.panel.config.common.learn_more")}
                </ha-button>
              </a>
            </div>`
          : nothing}
        <a href="/config/scene/edit/new" slot="fab">
          <ha-fab
            .label=${this.hass.localize(
              "ui.panel.config.scene.picker.add_scene"
            )}
            extended
          >
            <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
          </ha-fab>
        </a>
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
        this.scenes
          .filter(
            (scene) =>
              filter.value![0] ===
              this._entityReg.find((reg) => reg.entity_id === scene.entity_id)
                ?.categories.scene
          )
          .forEach((scene) => categoryItems.add(scene.entity_id));
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
        this.scenes
          .filter((scene) =>
            this._entityReg
              .find((reg) => reg.entity_id === scene.entity_id)
              ?.labels.some((lbl) => filter.value!.includes(lbl))
          )
          .forEach((scene) => labelItems.add(scene.entity_id));
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
    this._filteredScenes = items ? [...items] : undefined;
  }

  private _clearFilter() {
    this._filters = {};
    this._applyFilters();
  }

  firstUpdated() {
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

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selected = ev.detail.value;
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const scene = this.scenes.find((a) => a.entity_id === ev.detail.id);

    if (scene?.attributes.id) {
      navigate(`/config/scene/edit/${scene?.attributes.id}`);
    }
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
          categories: { scene: category },
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

  private async _handleBulkArea(ev) {
    const area = ev.currentTarget.value;
    this._bulkAddArea(area);
  }

  private async _bulkAddArea(area: string) {
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

  private async _bulkCreateArea() {
    showAreaRegistryDetailDialog(this, {
      createEntry: async (values) => {
        const area = await createAreaRegistryEntry(this.hass, values);
        this._bulkAddArea(area.area_id);
        return area;
      },
    });
  }

  private _editCategory(scene: any) {
    const entityReg = this._entityReg.find(
      (reg) => reg.entity_id === scene.entity_id
    );
    if (!entityReg) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.scene.picker.no_category_support"
        ),
        text: this.hass.localize(
          "ui.panel.config.scene.picker.no_category_entity_reg"
        ),
      });
      return;
    }
    showAssignCategoryDialog(this, {
      scope: "scene",
      entityReg,
    });
  }

  private _showInfo(scene: SceneEntity) {
    fireEvent(this, "hass-more-info", { entityId: scene.entity_id });
  }

  private _openSettings(scene: SceneEntity) {
    showMoreInfoDialog(this, {
      entityId: scene.entity_id,
      view: "settings",
    });
  }

  private _activateScene = async (scene: SceneEntity) => {
    await activateScene(this.hass, scene.entity_id);
    showToast(this, {
      message: this.hass.localize("ui.panel.config.scene.activated", {
        name: computeStateName(scene),
      }),
    });
    forwardHaptic("light");
  };

  private _deleteConfirm(scene: SceneEntity): void {
    showConfirmationDialog(this, {
      title: this.hass!.localize(
        "ui.panel.config.scene.picker.delete_confirm_title"
      ),
      text: this.hass!.localize(
        "ui.panel.config.scene.picker.delete_confirm_text",
        { name: computeStateName(scene) }
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirm: () => this._delete(scene),
      destructive: true,
    });
  }

  private async _delete(scene: SceneEntity): Promise<void> {
    if (scene.attributes.id) {
      await deleteScene(this.hass, scene.attributes.id);
    }
  }

  private async _duplicate(scene) {
    if (scene.attributes.id) {
      const config = await getSceneConfig(this.hass, scene.attributes.id);
      showSceneEditor({
        ...config,
        id: undefined,
        name: `${config?.name} (${this.hass.localize(
          "ui.panel.config.scene.picker.duplicate"
        )})`,
      });
    }
  }

  private _showHelp() {
    showAlertDialog(this, {
      title: this.hass.localize("ui.panel.config.scene.picker.header"),
      text: html`
        ${this.hass.localize("ui.panel.config.scene.picker.introduction")}
        <p>
          <a
            href=${documentationUrl(this.hass, "/docs/scene/editor/")}
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize("ui.panel.config.scene.picker.learn_more")}
          </a>
        </p>
      `,
    });
  }

  private async _bulkCreateCategory() {
    showCategoryRegistryDetailDialog(this, {
      scope: "scene",
      createEntry: async (values) => {
        const category = await createCategoryRegistryEntry(
          this.hass,
          "scene",
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

  private _handleSortingChanged(ev: CustomEvent) {
    this._activeSorting = ev.detail;
  }

  private _handleGroupingChanged(ev: CustomEvent) {
    this._activeGrouping = ev.detail.value;
  }

  private _handleCollapseChanged(ev: CustomEvent) {
    this._activeCollapsed = ev.detail.value;
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
    "ha-scene-dashboard": HaSceneDashboard;
  }
}
