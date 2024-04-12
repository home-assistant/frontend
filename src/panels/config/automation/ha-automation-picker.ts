import { consume } from "@lit-labs/context";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import "@material/web/divider/divider";
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
  mdiRobotHappy,
  mdiTag,
  mdiToggleSwitch,
  mdiToggleSwitchOffOutline,
  mdiTransitConnection,
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
import { customElement, property, query, state } from "lit/decorators";
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
import "../../../components/chips/ha-assist-chip";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SelectionChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/data-table/ha-data-table-labels";
import "../../../components/entity/ha-entity-toggle";
import "../../../components/ha-fab";
import "../../../components/ha-filter-blueprints";
import "../../../components/ha-filter-categories";
import "../../../components/ha-filter-devices";
import "../../../components/ha-filter-entities";
import "../../../components/ha-filter-floor-areas";
import "../../../components/ha-filter-labels";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-menu";
import type { HaMenu } from "../../../components/ha-menu";
import "../../../components/ha-menu-item";
import "../../../components/ha-sub-menu";
import "../../../components/ha-svg-icon";
import {
  AutomationEntity,
  deleteAutomation,
  duplicateAutomation,
  fetchAutomationFileConfig,
  getAutomationStateConfig,
  showAutomationEditor,
  triggerAutomationActions,
} from "../../../data/automation";
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
import { findRelated } from "../../../data/search";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route, ServiceCallResponse } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { turnOnOffEntity } from "../../lovelace/common/entity/turn-on-off-entity";
import { showAssignCategoryDialog } from "../category/show-dialog-assign-category";
import { showCategoryRegistryDetailDialog } from "../category/show-dialog-category-registry-detail";
import { configSections } from "../ha-panel-config";
import { showLabelDetailDialog } from "../labels/show-dialog-label-detail";
import { showNewAutomationDialog } from "./show-dialog-new-automation";
import {
  hasRejectedItems,
  rejectedItems,
} from "../../../common/util/promise-all-settled-results";

type AutomationItem = AutomationEntity & {
  name: string;
  area: string | undefined;
  last_triggered?: string | undefined;
  formatted_state: string;
  category: string | undefined;
  labels: LabelRegistryEntry[];
};

@customElement("ha-automation-picker")
class HaAutomationPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public automations!: AutomationEntity[];

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _filteredAutomations?: string[] | null;

  @state() private _filters: Record<
    string,
    { value: string[] | undefined; items: Set<string> | undefined }
  > = {};

  @state() private _expandedFilter?: string;

  @state() private _selected: string[] = [];

  @state()
  _categories!: CategoryRegistryEntry[];

  @state()
  _labels!: LabelRegistryEntry[];

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  @state() private _overflowAutomation?: AutomationItem;

  @query("#overflow-menu") private _overflowMenu!: HaMenu;

  private _sizeController = new ResizeController(this, {
    callback: (entries) => entries[0]?.contentRect.width,
  });

  private _automations = memoizeOne(
    (
      automations: AutomationEntity[],
      entityReg: EntityRegistryEntry[],
      areas: HomeAssistant["areas"],
      categoryReg?: CategoryRegistryEntry[],
      labelReg?: LabelRegistryEntry[],
      filteredAutomations?: string[] | null
    ): AutomationItem[] => {
      if (filteredAutomations === null) {
        return [];
      }
      return (
        filteredAutomations
          ? automations.filter((automation) =>
              filteredAutomations!.includes(automation.entity_id)
            )
          : automations
      ).map((automation) => {
        const entityRegEntry = entityReg.find(
          (reg) => reg.entity_id === automation.entity_id
        );
        const category = entityRegEntry?.categories.automation;
        const labels = labelReg && entityRegEntry?.labels;
        return {
          ...automation,
          name: computeStateName(automation),
          area: entityRegEntry?.area_id
            ? areas[entityRegEntry?.area_id]?.name
            : undefined,
          last_triggered: automation.attributes.last_triggered || undefined,
          formatted_state: this.hass.formatEntityState(automation),
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
      narrow: boolean,
      localize: LocalizeFunc,
      locale: HomeAssistant["locale"]
    ): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<AutomationItem> = {
        icon: {
          title: "",
          label: localize("ui.panel.config.automation.picker.headers.state"),
          type: "icon",
          template: (automation) =>
            html`<ha-state-icon
              .hass=${this.hass}
              .stateObj=${automation}
              style=${styleMap({
                color:
                  automation.state === UNAVAILABLE
                    ? "var(--error-color)"
                    : "unset",
              })}
            ></ha-state-icon>`,
        },
        name: {
          title: localize("ui.panel.config.automation.picker.headers.name"),
          main: true,
          sortable: true,
          filterable: true,
          direction: "asc",
          grows: true,
          template: (automation) => {
            const date = new Date(automation.attributes.last_triggered);
            const now = new Date();
            const dayDifference = differenceInDays(now, date);
            return html`
              <div style="font-size: 14px;">${automation.name}</div>
              ${narrow
                ? html`<div class="secondary">
                    ${this.hass.localize("ui.card.automation.last_triggered")}:
                    ${automation.attributes.last_triggered
                      ? dayDifference > 3
                        ? formatShortDateTime(date, locale, this.hass.config)
                        : relativeTime(date, locale)
                      : localize("ui.components.relative_time.never")}
                  </div>`
                : nothing}
              ${automation.labels.length
                ? html`<ha-data-table-labels
                    @label-clicked=${this._labelClicked}
                    .labels=${automation.labels}
                  ></ha-data-table-labels>`
                : nothing}
            `;
          },
        },
        area: {
          title: localize("ui.panel.config.automation.picker.headers.area"),
          hidden: true,
          groupable: true,
          filterable: true,
          sortable: true,
        },
        category: {
          title: localize("ui.panel.config.automation.picker.headers.category"),
          hidden: true,
          groupable: true,
          filterable: true,
          sortable: true,
        },
        labels: {
          title: "",
          hidden: true,
          filterable: true,
          template: (automation) =>
            automation.labels.map((lbl) => lbl.name).join(" "),
        },
        last_triggered: {
          sortable: true,
          width: "130px",
          title: localize("ui.card.automation.last_triggered"),
          hidden: narrow,
          template: (automation) => {
            if (!automation.last_triggered) {
              return this.hass.localize("ui.components.relative_time.never");
            }
            const date = new Date(automation.last_triggered);
            const now = new Date();
            const dayDifference = differenceInDays(now, date);
            return html`
              ${dayDifference > 3
                ? formatShortDateTime(date, locale, this.hass.config)
                : relativeTime(date, locale)}
            `;
          },
        },
        formatted_state: {
          width: "82px",
          sortable: true,
          groupable: true,
          title: "",
          type: "overflow",
          hidden: narrow,
          label: this.hass.localize("ui.panel.config.automation.picker.state"),
          template: (automation) => html`
            <ha-entity-toggle
              .stateObj=${automation}
              .hass=${this.hass}
            ></ha-entity-toggle>
          `,
        },
        actions: {
          title: "",
          width: "64px",
          type: "icon-button",
          template: (automation) => html`
            <ha-icon-button
              .automation=${automation}
              .label=${this.hass.localize("ui.common.overflow_menu")}
              .path=${mdiDotsVertical}
              @click=${this._showOverflowMenu}
            ></ha-icon-button>
          `,
        },
      };
      return columns;
    }
  );

  private _showOverflowMenu = (ev) => {
    if (
      this._overflowMenu.open &&
      ev.target === this._overflowMenu.anchorElement
    ) {
      this._overflowMenu.close();
      return;
    }
    this._overflowAutomation = ev.target.automation;
    this._overflowMenu.anchorElement = ev.target;
    this._overflowMenu.show();
  };

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeCategoryRegistry(
        this.hass.connection,
        "automation",
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
        </div>
      </ha-menu-item>
      <md-divider role="separator" tabindex="-1"></md-divider>
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
    const labelsInOverflow =
      (this._sizeController.value && this._sizeController.value < 700) ||
      (!this._sizeController.value && this.hass.dockedSidebar === "docked");
    const automations = this._automations(
      this.automations,
      this._entityReg,
      this.hass.areas,
      this._categories,
      this._labels,
      this._filteredAutomations
    );
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .backPath=${
          this._searchParms.has("historyBack") ? undefined : "/config"
        }
        id="entity_id"
        .route=${this.route}
        .tabs=${configSections.automations}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.automation.picker.search",
          { number: automations.length }
        )}
        selectable
        .selected=${this._selected.length}
        @selection-changed=${this._handleSelectionChanged}
        hasFilters
        .filters=${
          Object.values(this._filters).filter((filter) =>
            Array.isArray(filter.value)
              ? filter.value.length
              : filter.value &&
                Object.values(filter.value).some((val) =>
                  Array.isArray(val) ? val.length : val
                )
          ).length
        }
        .columns=${this._columns(
          this.narrow,
          this.hass.localize,
          this.hass.locale
        )}
        initialGroupColumn="category"
        .data=${automations}
        .empty=${!this.automations.length}
        @row-click=${this._handleRowClicked}
        .noDataText=${this.hass.localize(
          "ui.panel.config.automation.picker.no_automations"
        )}
        @clear-filter=${this._clearFilter}
        hasFab
        clickable
        class=${this.narrow ? "narrow" : ""}
      >
        <ha-icon-button
          slot="toolbar-icon"
          .label=${this.hass.localize("ui.common.help")}
          .path=${mdiHelpCircle}
          @click=${this._showHelp}
        ></ha-icon-button>
        <ha-filter-floor-areas
          .hass=${this.hass}
          .type=${"automation"}
          .value=${this._filters["ha-filter-floor-areas"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-floor-areas"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-floor-areas>
        <ha-filter-devices
          .hass=${this.hass}
          .type=${"automation"}
          .value=${this._filters["ha-filter-devices"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-devices"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-devices>
        <ha-filter-entities
          .hass=${this.hass}
          .type=${"automation"}
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
          scope="automation"
          .value=${this._filters["ha-filter-categories"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-categories"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-categories>
        <ha-filter-blueprints
          .hass=${this.hass}
          .type=${"automation"}
          .value=${this._filters["ha-filter-blueprints"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-blueprints"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-blueprints>
          ${
            !this.narrow
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
              : nothing
          }
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
            <ha-menu-item @click=${this._handleBulkEnable}>
              <ha-svg-icon slot="start" .path=${mdiToggleSwitch}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.automation.picker.bulk_actions.enable"
                )}
              </div>
            </ha-menu-item>
            <ha-menu-item @click=${this._handleBulkDisable}>
              <ha-svg-icon
                slot="start"
                .path=${mdiToggleSwitchOffOutline}
              ></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.automation.picker.bulk_actions.disable"
                )}
              </div>
            </ha-menu-item>
          </ha-button-menu-new>
        ${
          !this.automations.length
            ? html`<div class="empty" slot="empty">
                <ha-svg-icon .path=${mdiRobotHappy}></ha-svg-icon>
                <h1>
                  ${this.hass.localize(
                    "ui.panel.config.automation.picker.empty_header"
                  )}
                </h1>
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.automation.picker.empty_text_1"
                  )}
                </p>
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.automation.picker.empty_text_2",
                    { user: this.hass.user?.name || "Alice" }
                  )}
                </p>
                <a
                  href=${documentationUrl(
                    this.hass,
                    "/docs/automation/editor/"
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ha-button>
                    ${this.hass.localize("ui.panel.config.common.learn_more")}
                  </ha-button>
                </a>
              </div>`
            : nothing
        }
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.automation.picker.add_automation"
          )}
          extended
          @click=${this._createNew}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
      <ha-menu id="overflow-menu" positioning="fixed">
        <ha-menu-item @click=${this._showInfo}>
          <ha-svg-icon
            .path=${mdiInformationOutline}
            slot="start"
          ></ha-svg-icon>
          <div slot="headline">
            ${this.hass.localize("ui.panel.config.automation.editor.show_info")}
          </div>
        </ha-menu-item>

        <ha-menu-item @click=${this._showSettings}>
          <ha-svg-icon .path=${mdiCog} slot="start"></ha-svg-icon>
          <div slot="headline">
            ${this.hass.localize(
              "ui.panel.config.automation.picker.show_settings"
            )}
          </div>
        </ha-menu-item>
        <ha-menu-item @click=${this._editCategory}>
          <ha-svg-icon .path=${mdiTag} slot="start"></ha-svg-icon>
          <div slot="headline">
            ${this.hass.localize(
              `ui.panel.config.automation.picker.${this._overflowAutomation?.category ? "edit_category" : "assign_category"}`
            )}
          </div>
        </ha-menu-item>
        <ha-menu-item @click=${this._runActions}>
          <ha-svg-icon .path=${mdiPlay} slot="start"></ha-svg-icon>
          <div slot="headline">
            ${this.hass.localize("ui.panel.config.automation.editor.run")}
          </div>
        </ha-menu-item>
        <ha-menu-item @click=${this._showTrace}>
          <ha-svg-icon .path=${mdiTransitConnection} slot="start"></ha-svg-icon>
          <div slot="headline">
            ${this.hass.localize(
              "ui.panel.config.automation.editor.show_trace"
            )}
          </div>
        </ha-menu-item>
        <md-divider role="separator" tabindex="-1"></md-divider>
        <ha-menu-item @click=${this._duplicate}>
          <ha-svg-icon .path=${mdiContentDuplicate} slot="start"></ha-svg-icon>
          <div slot="headline">
            ${this.hass.localize("ui.panel.config.automation.picker.duplicate")}
          </div>
        </ha-menu-item>
        <ha-menu-item @click=${this._toggle}>
          <ha-svg-icon
            .path=${
              this._overflowAutomation?.state === "off"
                ? mdiToggleSwitch
                : mdiToggleSwitchOffOutline
            }
            slot="start"
          ></ha-svg-icon>
          <div slot="headline">
            ${
              this._overflowAutomation?.state === "off"
                ? this.hass.localize("ui.panel.config.automation.editor.enable")
                : this.hass.localize(
                    "ui.panel.config.automation.editor.disable"
                  )
            }
          </div>
        </ha-menu-item>
        <ha-menu-item @click=${this._deleteConfirm} class="warning">
          <ha-svg-icon .path=${mdiDelete} slot="start"></ha-svg-icon>
          <div slot="headline">
            ${this.hass.localize("ui.panel.config.automation.picker.delete")}
          </div>
        </ha-menu-item>
      </ha-menu>
    `;
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
        this.automations
          .filter(
            (automation) =>
              filter.value![0] ===
              this._entityReg.find(
                (reg) => reg.entity_id === automation.entity_id
              )?.categories.automation
          )
          .forEach((automation) => categoryItems.add(automation.entity_id));
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
        this.automations
          .filter((automation) =>
            this._entityReg
              .find((reg) => reg.entity_id === automation.entity_id)
              ?.labels.some((lbl) => filter.value!.includes(lbl))
          )
          .forEach((automation) => labelItems.add(automation.entity_id));
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
    this._filteredAutomations = items ? [...items] : undefined;
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
    const related = await findRelated(
      this.hass,
      "automation_blueprint",
      blueprint
    );
    this._filters = {
      ...this._filters,
      "ha-filter-blueprints": {
        value: [blueprint],
        items: new Set(related.automation || []),
      },
    };
    this._applyFilters();
  }

  private _clearFilter() {
    this._filters = {};
    this._applyFilters();
  }

  private _showInfo(ev) {
    const automation = ev.currentTarget.parentElement.anchorElement.automation;
    fireEvent(this, "hass-more-info", { entityId: automation.entity_id });
  }

  private _showSettings(ev) {
    const automation = ev.currentTarget.parentElement.anchorElement.automation;

    fireEvent(this, "hass-more-info", {
      entityId: automation.entity_id,
      view: "settings",
    });
  }

  private _runActions(ev) {
    const automation = ev.currentTarget.parentElement.anchorElement.automation;

    triggerAutomationActions(this.hass, automation.entity_id);
  }

  private _editCategory(ev) {
    const automation = ev.currentTarget.parentElement.anchorElement.automation;

    const entityReg = this._entityReg.find(
      (reg) => reg.entity_id === automation.entity_id
    );
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
      scope: "automation",
      entityReg,
    });
  }

  private _showTrace(ev) {
    const automation = ev.currentTarget.parentElement.anchorElement.automation;

    if (!automation.attributes.id) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.automation.picker.traces_not_available"
        ),
      });
      return;
    }
    navigate(
      `/config/automation/trace/${encodeURIComponent(automation.attributes.id)}`
    );
  }

  private async _toggle(ev): Promise<void> {
    const automation = ev.currentTarget.parentElement.anchorElement.automation;

    const service = automation.state === "off" ? "turn_on" : "turn_off";
    await this.hass.callService("automation", service, {
      entity_id: automation.entity_id,
    });
  }

  private async _deleteConfirm(ev) {
    const automation = ev.currentTarget.parentElement.anchorElement.automation;

    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.picker.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.automation.picker.delete_confirm_text",
        { name: automation.name }
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirm: () => this._delete(automation),
      destructive: true,
    });
  }

  private async _delete(automation) {
    try {
      await deleteAutomation(this.hass, automation.attributes.id);
    } catch (err: any) {
      await showAlertDialog(this, {
        text:
          err.status_code === 400
            ? this.hass.localize(
                "ui.panel.config.automation.editor.load_error_not_deletable"
              )
            : this.hass.localize(
                "ui.panel.config.automation.editor.load_error_unknown",
                { err_no: err.status_code }
              ),
      });
    }
  }

  private async _duplicate(ev) {
    const automation = ev.currentTarget.parentElement.anchorElement.automation;

    try {
      const config = await fetchAutomationFileConfig(
        this.hass,
        automation.attributes.id
      );
      duplicateAutomation(config);
    } catch (err: any) {
      if (err.status_code === 404) {
        const response = await getAutomationStateConfig(
          this.hass,
          automation.entity_id
        );
        showAutomationEditor({ ...response.config, id: undefined });
        return;
      }
      await showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.automation.editor.load_error_unknown",
          { err_no: err.status_code }
        ),
      });
    }
  }

  private _showHelp() {
    showAlertDialog(this, {
      title: this.hass.localize("ui.panel.config.automation.caption"),
      text: html`
        ${this.hass.localize("ui.panel.config.automation.picker.introduction")}
        <p>
          <a
            href=${documentationUrl(this.hass, "/docs/automation/editor/")}
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize(
              "ui.panel.config.automation.picker.learn_more"
            )}
          </a>
        </p>
      `,
    });
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const automation = this.automations.find(
      (a) => a.entity_id === ev.detail.id
    );

    if (automation?.attributes.id) {
      navigate(
        `/config/automation/edit/${encodeURIComponent(automation.attributes.id)}`
      );
    } else {
      navigate(`/config/automation/show/${encodeURIComponent(ev.detail.id)}`);
    }
  }

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selected = ev.detail.value;
  }

  private _createNew() {
    if (isComponentLoaded(this.hass, "blueprint")) {
      showNewAutomationDialog(this, { mode: "automation" });
    } else {
      navigate("/config/automation/edit/new");
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
          categories: { automation: category },
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

  private async _handleBulkEnable() {
    const promises: Promise<ServiceCallResponse>[] = [];
    this._selected.forEach((entityId) => {
      promises.push(turnOnOffEntity(this.hass, entityId, true));
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

  private async _handleBulkDisable() {
    const promises: Promise<ServiceCallResponse>[] = [];
    this._selected.forEach((entityId) => {
      promises.push(turnOnOffEntity(this.hass, entityId, false));
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

  private async _bulkCreateCategory() {
    showCategoryRegistryDetailDialog(this, {
      scope: "automation",
      createEntry: async (values) => {
        const category = await createCategoryRegistryEntry(
          this.hass,
          "automation",
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
    "ha-automation-picker": HaAutomationPicker;
  }
}
