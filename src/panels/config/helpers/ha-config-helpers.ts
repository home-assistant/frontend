import { consume } from "@lit-labs/context";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import {
  mdiAlertCircle,
  mdiChevronRight,
  mdiCog,
  mdiDotsVertical,
  mdiMenuDown,
  mdiPencilOff,
  mdiPlus,
  mdiTag,
} from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
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
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { navigate } from "../../../common/navigate";
import {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../common/translations/localize";
import { extractSearchParam } from "../../../common/url/search-params";
import {
  hasRejectedItems,
  rejectedItems,
} from "../../../common/util/promise-all-settled-results";
import {
  DataTableColumnContainer,
  RowClickedEvent,
  SelectionChangedEvent,
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
import "../../../components/ha-state-icon";
import "../../../components/ha-svg-icon";
import {
  CategoryRegistryEntry,
  createCategoryRegistryEntry,
  subscribeCategoryRegistry,
} from "../../../data/category_registry";
import {
  ConfigEntry,
  subscribeConfigEntries,
} from "../../../data/config_entries";
import { getConfigFlowHandlers } from "../../../data/config_flow";
import { fullEntitiesContext } from "../../../data/context";
import {
  EntityRegistryEntry,
  UpdateEntityRegistryEntryResult,
  subscribeEntityRegistry,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import { domainToName } from "../../../data/integration";
import {
  LabelRegistryEntry,
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
import { HomeAssistant, Route } from "../../../types";
import { showAssignCategoryDialog } from "../category/show-dialog-assign-category";
import { showCategoryRegistryDetailDialog } from "../category/show-dialog-category-registry-detail";
import { configSections } from "../ha-panel-config";
import "../integrations/ha-integration-overflow-menu";
import { showLabelDetailDialog } from "../labels/show-dialog-label-detail";
import { isHelperDomain } from "./const";
import { showHelperDetailDialog } from "./show-dialog-helper-detail";

type HelperItem = {
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
};

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

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _stateItems: HassEntity[] = [];

  @state() private _entityEntries?: Record<string, EntityRegistryEntry>;

  @state() private _configEntries?: Record<string, ConfigEntry>;

  @state() private _selected: string[] = [];

  @state() private _activeFilters?: string[];

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

  @state() private _filteredStateItems?: string[] | null;

  private _sizeController = new ResizeController(this, {
    callback: (entries) => entries[0]?.contentRect.width,
  });

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
    (
      narrow: boolean,
      localize: LocalizeFunc
    ): DataTableColumnContainer<HelperItem> => ({
      icon: {
        title: "",
        label: localize("ui.panel.config.helpers.picker.headers.icon"),
        type: "icon",
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
        grows: true,
        direction: "asc",
        template: (helper) => html`
          <div style="font-size: 14px;">${helper.name}</div>
          ${narrow
            ? html`<div class="secondary">${helper.entity_id}</div> `
            : nothing}
          ${helper.label_entries.length
            ? html`
                <ha-data-table-labels
                  .labels=${helper.label_entries}
                ></ha-data-table-labels>
              `
            : nothing}
        `,
      },
      entity_id: {
        title: localize("ui.panel.config.helpers.picker.headers.entity_id"),
        hidden: this.narrow,
        sortable: true,
        filterable: true,
        width: "25%",
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
        width: "25%",
        filterable: true,
        groupable: true,
      },
      editable: {
        title: "",
        label: this.hass.localize(
          "ui.panel.config.helpers.picker.headers.editable"
        ),
        type: "icon",
        template: (helper) => html`
          ${!helper.editable
            ? html`
                <div
                  tabindex="0"
                  style="display:inline-block; position: relative;"
                >
                  <ha-svg-icon .path=${mdiPencilOff}></ha-svg-icon>
                  <simple-tooltip animation-delay="0" position="left">
                    ${this.hass.localize(
                      "ui.panel.config.entities.picker.status.readonly"
                    )}
                  </simple-tooltip>
                </div>
              `
            : ""}
        `,
      },
      actions: {
        title: "",
        width: "64px",
        type: "overflow-menu",
        template: (helper) => html`
          <ha-icon-overflow-menu
            .hass=${this.hass}
            narrow
            .items=${[
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
            : computeStateDomain(entityState),
          configEntry,
          entity: entityState,
        };
      });

      const entries = Object.values(configEntriesCopy).map((configEntry) => ({
        id: configEntry.entry_id,
        entity_id: "",
        icon: mdiAlertCircle,
        name: configEntry.title || "",
        editable: true,
        type: configEntry.domain,
        configEntry,
        entity: undefined,
        selectable: false,
      }));

      return [...states, ...entries]
        .filter((item) =>
          filteredStateItems
            ? filteredStateItems?.includes(item.entity_id)
            : true
        )
        .map((item) => {
          const entityRegEntry = entityReg.find(
            (reg) => reg.entity_id === item.entity_id
          );
          const labels = labelReg && entityRegEntry?.labels;
          const category = entityRegEntry?.categories.helpers;
          return {
            ...item,
            localized_type: item.configEntry
              ? domainToName(localize, item.type)
              : localize(
                  `ui.panel.config.helpers.types.${item.type}` as LocalizeKeys
                ) || item.type,
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

  protected render(): TemplateResult {
    if (
      !this.hass ||
      this._stateItems === undefined ||
      this._entityEntries === undefined ||
      this._configEntries === undefined
    ) {
      return html` <hass-loading-screen></hass-loading-screen> `;
    }

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
        </ha-menu-item> `;
      })}<md-divider role="separator" tabindex="-1"></md-divider>
      <ha-menu-item @click=${this._bulkCreateLabel}>
        <div slot="headline">
          ${this.hass.localize("ui.panel.config.labels.add_label")}
        </div>
      </ha-menu-item>`;
    const labelsInOverflow =
      (this._sizeController.value && this._sizeController.value < 700) ||
      (!this._sizeController.value && this.hass.dockedSidebar === "docked");
    const helpers = this._getItems(
      this.hass.localize,
      this._stateItems,
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
        .data=${helpers}
        initialGroupColumn="category"
        .activeFilters=${this._activeFilters}
        @clear-filter=${this._clearFilter}
        @row-click=${this._openEditDialog}
        hasFab
        clickable
        .noDataText=${this.hass.localize(
          "ui.panel.config.helpers.picker.no_helpers"
        )}
        class=${this.narrow ? "narrow" : ""}
      >
        <ha-filter-floor-areas
          .hass=${this.hass}
          .type=${"entity"}
          .value=${this._filters["ha-filter-floor-areas"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-floor-areas"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-floor-areas>
        <ha-filter-devices
          .hass=${this.hass}
          .type=${"entity"}
          .value=${this._filters["ha-filter-devices"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-devices"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-devices>
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
          scope="helpers"
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
      if (key === "ha-filter-labels" && filter.value?.length) {
        const labelItems: Set<string> = new Set();
        this._stateItems
          .filter((stateItem) =>
            this._entityReg
              .find((reg) => reg.entity_id === stateItem.entity_id)
              ?.labels.some((lbl) => filter.value!.includes(lbl))
          )
          .forEach((stateItem) => labelItems.add(stateItem.entity_id));
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
      if (key === "ha-filter-categories" && filter.value?.length) {
        const categoryItems: Set<string> = new Set();
        this._stateItems
          .filter(
            (stateItem) =>
              filter.value![0] ===
              this._entityReg.find(
                (reg) => reg.entity_id === stateItem.entity_id
              )?.categories.helpers
          )
          .forEach((stateItem) => categoryItems.add(stateItem.entity_id));
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
    this._applyFilters();
  }

  private _editCategory(helper: any) {
    const entityReg = this._entityReg.find(
      (reg) => reg.entity_id === helper.entity_id
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
      scope: "helpers",
      entityReg,
    });
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

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selected = ev.detail.value;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (this.route.path === "/add") {
      this._handleAdd();
    }
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
      showAdvanced: this.hass.userData?.showAdvanced,
    });
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!this._entityEntries || !this._configEntries) {
      return;
    }

    let changed =
      !this._stateItems ||
      changedProps.has("_entityEntries") ||
      changedProps.has("_configEntries");

    if (!changed && changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      changed = !oldHass || oldHass.states !== this.hass.states;
    }
    if (!changed) {
      return;
    }

    const extraEntities = new Set<string>();

    for (const entityEntry of Object.values(this._entityEntries)) {
      if (
        entityEntry.config_entry_id &&
        entityEntry.config_entry_id in this._configEntries
      ) {
        extraEntities.add(entityEntry.entity_id);
      }
    }

    const newStates = Object.values(this.hass!.states).filter(
      (entity) =>
        extraEntities.has(entity.entity_id) ||
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

  private async _bulkCreateCategory() {
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
    "ha-config-helpers": HaConfigHelpers;
  }
}
