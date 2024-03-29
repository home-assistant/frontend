import { consume } from "@lit-labs/context";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import {
  mdiContentDuplicate,
  mdiDelete,
  mdiHelpCircle,
  mdiInformationOutline,
  mdiPalette,
  mdiPencilOff,
  mdiPlay,
  mdiPlus,
  mdiTag,
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
import memoizeOne from "memoize-one";
import { formatShortDateTime } from "../../../common/datetime/format_date_time";
import { relativeTime } from "../../../common/datetime/relative_time";
import { HASSDomEvent, fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { navigate } from "../../../common/navigate";
import { LocalizeFunc } from "../../../common/translations/localize";
import {
  DataTableColumnContainer,
  RowClickedEvent,
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
import "../../../components/ha-state-icon";
import "../../../components/ha-svg-icon";
import {
  CategoryRegistryEntry,
  subscribeCategoryRegistry,
} from "../../../data/category_registry";
import { fullEntitiesContext } from "../../../data/context";
import { isUnavailableState } from "../../../data/entity";
import { EntityRegistryEntry } from "../../../data/entity_registry";
import { forwardHaptic } from "../../../data/haptics";
import {
  LabelRegistryEntry,
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
import "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import { showAssignCategoryDialog } from "../category/show-dialog-assign-category";
import { configSections } from "../ha-panel-config";

type SceneItem = SceneEntity & {
  name: string;
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

  private _scenes = memoizeOne(
    (
      scenes: SceneEntity[],
      entityReg: EntityRegistryEntry[],
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
      };
      if (!narrow) {
        columns.state = {
          title: localize(
            "ui.panel.config.scene.picker.headers.last_activated"
          ),
          sortable: true,
          width: "30%",
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
        };
      }
      columns.only_editable = {
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
      };
      columns.actions = {
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
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.automations}
        hasFilters
        .filters=${Object.values(this._filters).filter(
          (filter) => filter.value?.length
        ).length}
        .columns=${this._columns(this.narrow, this.hass.localize)}
        id="entity_id"
        initialGroupColumn="category"
        .data=${this._scenes(
          this.scenes,
          this._entityReg,
          this._categories,
          this._labels,
          this._filteredScenes
        )}
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

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const scene = this.scenes.find((a) => a.entity_id === ev.detail.id);

    if (scene?.attributes.id) {
      navigate(`/config/scene/edit/${scene?.attributes.id}`);
    }
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

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-scene-dashboard": HaSceneDashboard;
  }
}
