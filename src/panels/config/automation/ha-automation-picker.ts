import { consume } from "@lit-labs/context";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import {
  mdiContentDuplicate,
  mdiDelete,
  mdiHelpCircle,
  mdiInformationOutline,
  mdiPlay,
  mdiPlayCircleOutline,
  mdiPlus,
  mdiRobotHappy,
  mdiStopCircleOutline,
  mdiTag,
  mdiTransitConnection,
} from "@mdi/js";
import { differenceInDays } from "date-fns/esm";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  CSSResultGroup,
  LitElement,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
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
} from "../../../components/data-table/ha-data-table";
import "../../../components/entity/ha-entity-toggle";
import "../../../components/ha-fab";
import "../../../components/ha-filter-floor-areas";
import "../../../components/ha-filter-blueprints";
import "../../../components/ha-filter-categories";
import "../../../components/ha-filter-devices";
import "../../../components/ha-filter-entities";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-overflow-menu";
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
  subscribeCategoryRegistry,
} from "../../../data/category_registry";
import { fullEntitiesContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity";
import { EntityRegistryEntry } from "../../../data/entity_registry";
import { findRelated } from "../../../data/search";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showAssignCategoryDialog } from "../category/show-dialog-assign-category";
import { configSections } from "../ha-panel-config";
import { showNewAutomationDialog } from "./show-dialog-new-automation";
import "../../../components/data-table/ha-data-table-labels";
import {
  LabelRegistryEntry,
  subscribeLabelRegistry,
} from "../../../data/label_registry";
import "../../../components/ha-filter-labels";

type AutomationItem = AutomationEntity & {
  name: string;
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

  @state()
  _categories!: CategoryRegistryEntry[];

  @state()
  _labels!: LabelRegistryEntry[];

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  private _automations = memoizeOne(
    (
      automations: AutomationEntity[],
      entityReg: EntityRegistryEntry[],
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
          last_triggered: automation.attributes.last_triggered || undefined,
          formatted_state: this.hass.formatEntityState(automation),
          category: category
            ? categoryReg?.find((cat) => cat.category_id === category)?.name
            : undefined,
          labels: (labels || []).map(
            (lbl) => labelReg!.find((label) => label.label_id === lbl)!
          ),
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
          type: "overflow",
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
              <ha-data-table-labels
                @label-clicked=${this._labelClicked}
                .labels=${automation.labels}
              ></ha-data-table-labels>
            `;
          },
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
      };
      columns.last_triggered = {
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
      };

      if (!this.narrow) {
        columns.formatted_state = {
          width: "82px",
          sortable: true,
          groupable: true,
          title: "",
          label: this.hass.localize("ui.panel.config.automation.picker.state"),
          template: (automation) => html`
            <ha-entity-toggle
              .stateObj=${automation}
              .hass=${this.hass}
            ></ha-entity-toggle>
          `,
        };
      }

      columns.actions = {
        title: "",
        width: "64px",
        type: "overflow-menu",
        template: (automation) => html`
          <ha-icon-overflow-menu
            .hass=${this.hass}
            narrow
            .items=${[
              {
                path: mdiInformationOutline,
                label: this.hass.localize(
                  "ui.panel.config.automation.editor.show_info"
                ),
                action: () => this._showInfo(automation),
              },
              {
                path: mdiTag,
                label: this.hass.localize(
                  `ui.panel.config.automation.picker.${automation.category ? "edit_category" : "assign_category"}`
                ),
                action: () => this._editCategory(automation),
              },
              {
                path: mdiPlay,
                label: this.hass.localize(
                  "ui.panel.config.automation.editor.run"
                ),
                action: () => this._runActions(automation),
              },
              {
                path: mdiTransitConnection,
                label: this.hass.localize(
                  "ui.panel.config.automation.editor.show_trace"
                ),
                action: () => this._showTrace(automation),
              },
              {
                divider: true,
              },
              {
                path: mdiContentDuplicate,
                label: this.hass.localize(
                  "ui.panel.config.automation.picker.duplicate"
                ),
                action: () => this.duplicate(automation),
              },
              {
                path:
                  automation.state === "off"
                    ? mdiPlayCircleOutline
                    : mdiStopCircleOutline,
                label:
                  automation.state === "off"
                    ? this.hass.localize(
                        "ui.panel.config.automation.editor.enable"
                      )
                    : this.hass.localize(
                        "ui.panel.config.automation.editor.disable"
                      ),
                action: () => this._toggle(automation),
              },
              {
                label: this.hass.localize(
                  "ui.panel.config.automation.picker.delete"
                ),
                path: mdiDelete,
                action: () => this._deleteConfirm(automation),
                warning: true,
              },
            ]}
          >
          </ha-icon-overflow-menu>
        `,
      };
      return columns;
    }
  );

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
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        id="entity_id"
        .route=${this.route}
        .tabs=${configSections.automations}
        hasFilters
        .filters=${Object.values(this._filters).filter(
          (filter) => filter.value?.length
        ).length}
        .columns=${this._columns(
          this.narrow,
          this.hass.localize,
          this.hass.locale
        )}
        initialGroupColumn="category"
        .data=${this._automations(
          this.automations,
          this._entityReg,
          this._categories,
          this._labels,
          this._filteredAutomations
        )}
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
        ${!this.automations.length
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
                href=${documentationUrl(this.hass, "/docs/automation/editor/")}
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
          .label=${this.hass.localize(
            "ui.panel.config.automation.picker.add_automation"
          )}
          extended
          @click=${this._createNew}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  firstUpdated() {
    if (this._searchParms.has("blueprint")) {
      this._filterBlueprint();
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

  private _showInfo(automation: any) {
    fireEvent(this, "hass-more-info", { entityId: automation.entity_id });
  }

  private _runActions(automation: any) {
    triggerAutomationActions(this.hass, automation.entity_id);
  }

  private _editCategory(automation: any) {
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

  private _showTrace(automation: any) {
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

  private async _toggle(automation): Promise<void> {
    const service = automation.state === "off" ? "turn_on" : "turn_off";
    await this.hass.callService("automation", service, {
      entity_id: automation.entity_id,
    });
  }

  private async _deleteConfirm(automation) {
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

  private async duplicate(automation) {
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

  private _createNew() {
    if (isComponentLoaded(this.hass, "blueprint")) {
      showNewAutomationDialog(this, { mode: "automation" });
    } else {
      navigate("/config/automation/edit/new");
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-picker": HaAutomationPicker;
  }
}
