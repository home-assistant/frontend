import {
  mdiCheck,
  mdiDelete,
  mdiDotsVertical,
  mdiHomeCircleOutline,
  mdiHomeEdit,
  mdiPencil,
  mdiPlus,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoize from "memoize-one";
import { storage } from "../../../../common/decorators/storage";
import { navigate } from "../../../../common/navigate";
import { stringCompare } from "../../../../common/string/compare";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SortingChangedEvent,
} from "../../../../components/data-table/ha-data-table";
import "../../../../components/ha-button";
import "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-fab";
import "../../../../components/ha-icon";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-overflow-menu";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import { saveFrontendSystemData } from "../../../../data/frontend";
import type { LovelaceRawConfig } from "../../../../data/lovelace/config/types";
import {
  isStrategyDashboard,
  saveConfig,
} from "../../../../data/lovelace/config/types";
import type {
  LovelaceDashboard,
  LovelaceDashboardCreateParams,
} from "../../../../data/lovelace/dashboard";
import {
  createDashboard,
  deleteDashboard,
  fetchDashboards,
  updateDashboard,
} from "../../../../data/lovelace/dashboard";
import {
  DEFAULT_PANEL,
  getPanelIcon,
  getPanelTitle,
} from "../../../../data/panel";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import "../../../../layouts/hass-loading-screen";
import "../../../../layouts/hass-tabs-subpage-data-table";
import type { HomeAssistant, Route } from "../../../../types";
import { getLovelaceStrategy } from "../../../lovelace/strategies/get-strategy";
import { showNewDashboardDialog } from "../../dashboard/show-dialog-new-dashboard";
import { lovelaceTabs } from "../ha-config-lovelace";
import { showDashboardConfigureStrategyDialog } from "./show-dialog-lovelace-dashboard-configure-strategy";
import { showDashboardDetailDialog } from "./show-dialog-lovelace-dashboard-detail";

export const PANEL_DASHBOARDS = [
  "home",
  "light",
  "security",
  "climate",
  "energy",
] as string[];

type DataTableItem = Pick<
  LovelaceDashboard,
  "icon" | "title" | "show_in_sidebar" | "require_admin" | "mode" | "url_path"
> & {
  default: boolean;
  filename: string;
  localized_type: string;
  type: string;
};

@customElement("ha-config-lovelace-dashboards")
export class HaConfigLovelaceDashboards extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _dashboards: LovelaceDashboard[] = [];

  @state()
  @storage({
    storage: "sessionStorage",
    key: "lovelace-dashboards-table-search",
    state: true,
    subscribe: false,
  })
  private _filter = "";

  @storage({
    key: "lovelace-dashboards-table-sort",
    state: false,
    subscribe: false,
  })
  private _activeSorting?: SortingChangedEvent;

  @storage({
    key: "lovelace-dashboards-table-column-order",
    state: false,
    subscribe: false,
  })
  private _activeColumnOrder?: string[];

  @storage({
    key: "lovelace-dashboards-table-hidden-columns",
    state: false,
    subscribe: false,
  })
  private _activeHiddenColumns?: string[];

  @storage({
    key: "lovelace-dashboards-table-grouping",
    state: false,
    subscribe: false,
  })
  private _activeGrouping?: string = "localized_type";

  @storage({
    key: "lovelace-dashboards-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed: string[] = [];

  public willUpdate() {
    if (!this.hasUpdated) {
      this.hass.loadFragmentTranslation("lovelace");
    }
  }

  private _columns = memoize(
    (
      narrow: boolean,
      _language,
      dashboards,
      localize: LocalizeFunc
    ): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<DataTableItem> = {
        icon: {
          title: "",
          moveable: false,
          showNarrow: true,
          label: localize(
            "ui.panel.config.lovelace.dashboards.picker.headers.icon"
          ),
          type: "icon",
          template: (dashboard) =>
            dashboard.icon
              ? html`
                  <ha-icon slot="item-icon" .icon=${dashboard.icon}></ha-icon>
                `
              : nothing,
        },
        title: {
          title: localize(
            "ui.panel.config.lovelace.dashboards.picker.headers.title"
          ),
          main: true,
          sortable: true,
          filterable: true,
          flex: 2,
          template: narrow
            ? undefined
            : (dashboard) => html`
                <span
                  style="display:flex; align-items:center; gap: var(--ha-space-2); min-width:0; width:100%;"
                >
                  <span
                    style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;"
                    >${dashboard.title}</span
                  >
                  ${dashboard.default
                    ? html`
                        <ha-svg-icon
                          .id="default-icon-${dashboard.title}"
                          style="flex-shrink:0;"
                          .path=${mdiHomeCircleOutline}
                        ></ha-svg-icon>
                        <ha-tooltip
                          .for="default-icon-${dashboard.title}"
                          placement="right"
                        >
                          ${this.hass.localize(
                            `ui.panel.config.lovelace.dashboards.default_dashboard`
                          )}
                        </ha-tooltip>
                      `
                    : nothing}
                </span>
              `,
        },
      };

      columns.localized_type = {
        title: localize(
          "ui.panel.config.lovelace.dashboards.picker.headers.type"
        ),
        sortable: true,
        groupable: true,
        filterable: true,
      };

      columns.mode = {
        title: localize(
          "ui.panel.config.lovelace.dashboards.picker.headers.conf_mode"
        ),
        sortable: true,
        filterable: true,
        template: (dashboard) => html`
          ${this.hass.localize(
            `ui.panel.config.lovelace.dashboards.conf_mode.${dashboard.mode}`
          ) || dashboard.mode}
        `,
      };
      if (dashboards.some((dashboard) => dashboard.filename)) {
        columns.filename = {
          title: localize(
            "ui.panel.config.lovelace.dashboards.picker.headers.filename"
          ),
          sortable: true,
          filterable: true,
        };
      }
      columns.require_admin = {
        title: localize(
          "ui.panel.config.lovelace.dashboards.picker.headers.require_admin"
        ),
        sortable: true,
        hidden: narrow,
        type: "icon",
        minWidth: "120px",
        maxWidth: "120px",
        template: (dashboard) =>
          dashboard.require_admin
            ? html`<ha-svg-icon .path=${mdiCheck}></ha-svg-icon>`
            : html`—`,
      };
      columns.show_in_sidebar = {
        title: localize(
          "ui.panel.config.lovelace.dashboards.picker.headers.sidebar"
        ),
        hidden: narrow,
        type: "icon",
        minWidth: "120px",
        maxWidth: "120px",
        template: (dashboard) =>
          dashboard.show_in_sidebar
            ? html`<ha-svg-icon .path=${mdiCheck}></ha-svg-icon>`
            : html`—`,
      };

      columns.actions = {
        title: "",
        label: this.hass.localize("ui.panel.config.generic.headers.actions"),
        type: "overflow-menu",
        showNarrow: true,
        moveable: false,
        hideable: false,
        template: (dashboard) => html`
          <ha-icon-overflow-menu
            .hass=${this.hass}
            narrow
            .items=${[
              {
                path: mdiHomeEdit,
                label: localize(
                  "ui.panel.config.lovelace.dashboards.picker.set_as_default"
                ),
                action: () => this._handleSetAsDefault(dashboard),
                disabled: dashboard.default,
              },
              ...(dashboard.type === "user_created"
                ? [
                    {
                      path: mdiPencil,
                      label: this.hass.localize(
                        "ui.panel.config.lovelace.dashboards.picker.edit"
                      ),
                      action: () => this._handleEdit(dashboard),
                    },
                    {
                      label: this.hass.localize(
                        "ui.panel.config.lovelace.dashboards.picker.delete"
                      ),
                      path: mdiDelete,
                      action: () => this._handleDelete(dashboard),
                      warning: true,
                    },
                  ]
                : []),
            ]}
          >
          </ha-icon-overflow-menu>
        `,
      };

      return columns;
    }
  );

  private _getItems = memoize(
    (dashboards: LovelaceDashboard[], defaultUrlPath: string | null) => {
      const result: DataTableItem[] = [];

      PANEL_DASHBOARDS.forEach((panel) => {
        const panelInfo = this.hass.panels[panel];
        if (!panelInfo) {
          return;
        }
        const item: DataTableItem = {
          icon: getPanelIcon(panelInfo),
          title: getPanelTitle(this.hass, panelInfo) || panelInfo.url_path,
          show_in_sidebar: true,
          mode: "storage",
          url_path: panelInfo.url_path,
          filename: "",
          default: defaultUrlPath === panelInfo.url_path,
          require_admin: false,
          type: "built_in",
          localized_type: this._localizeType("built_in"),
        };
        result.push(item);
      });

      result.push(
        ...dashboards
          .sort((a, b) =>
            stringCompare(a.title, b.title, this.hass.locale.language)
          )
          .map(
            (dashboard) =>
              ({
                filename: "",
                ...dashboard,
                default: defaultUrlPath === dashboard.url_path,
                type: "user_created",
                localized_type: this._localizeType("user_created"),
              }) satisfies DataTableItem
          )
      );
      return result;
    }
  );

  private _localizeType = (type: "user_created" | "built_in") =>
    this.hass.localize(
      `ui.panel.config.lovelace.dashboards.picker.type.${type}`
    );

  protected render() {
    if (!this.hass || this._dashboards === undefined) {
      return html` <hass-loading-screen></hass-loading-screen> `;
    }

    const defaultPanel = this.hass.systemData?.default_panel || DEFAULT_PANEL;

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${lovelaceTabs}
        .columns=${this._columns(
          this.narrow,
          this.hass.language,
          this._dashboards,
          this.hass.localize
        )}
        .data=${this._getItems(this._dashboards, defaultPanel)}
        .initialGroupColumn=${this._activeGrouping}
        .initialCollapsedGroups=${this._activeCollapsed}
        .initialSorting=${this._activeSorting}
        .columnOrder=${this._activeColumnOrder}
        .hiddenColumns=${this._activeHiddenColumns}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        @columns-changed=${this._handleColumnsChanged}
        @sorting-changed=${this._handleSortingChanged}
        .filter=${this._filter}
        @search-changed=${this._handleSearchChange}
        @row-click=${this._handleRowClicked}
        id="url_path"
        has-fab
        clickable
      >
        <ha-dropdown slot="toolbar-icon">
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <a href="/config/lovelace/resources">
            <ha-dropdown-item>
              ${this.hass.localize(
                "ui.panel.config.lovelace.resources.caption"
              )}
            </ha-dropdown-item>
          </a>
        </ha-dropdown>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.lovelace.dashboards.picker.add_dashboard"
          )}
          extended
          @click=${this._addDashboard}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._getDashboards();
  }

  private async _getDashboards() {
    this._dashboards = await fetchDashboards(this.hass);
  }

  private _handleRowClicked(ev: CustomEvent) {
    ev.stopPropagation();
    const urlPath = (ev.detail as RowClickedEvent).id;
    navigate(`/${urlPath}`);
  }

  private _handleEdit(item: DataTableItem) {
    const urlPath = item.url_path;

    if (urlPath === "energy") {
      navigate("/config/energy");
      return;
    }
    const dashboard = this._dashboards.find((res) => res.url_path === urlPath);
    this._openDetailDialog(dashboard, urlPath);
  }

  private _handleSetAsDefault = async (item: DataTableItem) => {
    if (item.default) {
      return;
    }

    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.lovelace.dashboards.detail.set_default_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.lovelace.dashboards.detail.set_default_confirm_text"
      ),
      confirmText: this.hass.localize("ui.common.ok"),
      dismissText: this.hass.localize("ui.common.cancel"),
      destructive: false,
    });

    if (!confirm) {
      return;
    }

    await saveFrontendSystemData(this.hass.connection, "core", {
      ...this.hass.systemData,
      default_panel: item.url_path,
    });
  };

  private _handleDelete = async (item: DataTableItem) => {
    const dashboard = this._dashboards.find(
      (res) => res.url_path === item.url_path
    );
    if (!dashboard) {
      return;
    }
    this._deleteDashboard(dashboard);
  };

  private async _addDashboard() {
    showNewDashboardDialog(this, {
      selectConfig: async (config) => {
        if (config && isStrategyDashboard(config)) {
          const strategyType = config.strategy.type;
          const strategyClass = await getLovelaceStrategy(
            "dashboard",
            strategyType
          );

          if (strategyClass.configRequired) {
            showDashboardConfigureStrategyDialog(this, {
              config: config,
              saveConfig: async (updatedConfig) => {
                this._openDetailDialog(undefined, undefined, updatedConfig);
              },
            });
            return;
          }
        }

        this._openDetailDialog(undefined, undefined, config);
      },
    });
  }

  private async _openDetailDialog(
    dashboard?: LovelaceDashboard,
    urlPath?: string,
    defaultConfig?: LovelaceRawConfig
  ): Promise<void> {
    showDashboardDetailDialog(this, {
      dashboard,
      urlPath,
      createDashboard: async (values: LovelaceDashboardCreateParams) => {
        const created = await createDashboard(this.hass!, values);
        this._dashboards = this._dashboards!.concat(created).sort(
          (res1, res2) =>
            stringCompare(
              res1.url_path,
              res2.url_path,
              this.hass.locale.language
            )
        );
        if (defaultConfig) {
          await saveConfig(this.hass!, created.url_path, defaultConfig);
        }
      },
      updateDashboard: async (values) => {
        const updated = await updateDashboard(
          this.hass!,
          dashboard!.id,
          values
        );
        this._dashboards = this._dashboards!.map((res) =>
          res === dashboard ? updated : res
        );
      },
      removeDashboard: async () => {
        if (!dashboard) {
          return false;
        }
        return this._deleteDashboard(dashboard);
      },
    });
  }

  private async _deleteDashboard(
    dashboard: LovelaceDashboard
  ): Promise<boolean> {
    const confirm = await showConfirmationDialog(this, {
      title: this.hass!.localize(
        "ui.panel.config.lovelace.dashboards.confirm_delete_title",
        { dashboard_title: dashboard.title }
      ),
      text: this.hass!.localize(
        "ui.panel.config.lovelace.dashboards.confirm_delete_text"
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      destructive: true,
    });
    if (!confirm) {
      return false;
    }
    try {
      await deleteDashboard(this.hass!, dashboard.id);
      this._dashboards = this._dashboards.filter((res) => res !== dashboard);
      return true;
    } catch (_err: any) {
      return false;
    }
  }

  private _handleSortingChanged(ev: CustomEvent) {
    this._activeSorting = ev.detail;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  private _handleColumnsChanged(ev: CustomEvent) {
    this._activeColumnOrder = ev.detail.columnOrder;
    this._activeHiddenColumns = ev.detail.hiddenColumns;
  }

  private _handleGroupingChanged(ev: CustomEvent) {
    this._activeGrouping = ev.detail.value;
  }

  private _handleCollapseChanged(ev: CustomEvent) {
    this._activeCollapsed = ev.detail.value;
  }

  static styles = css`
    ha-dropdown a {
      text-decoration: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-lovelace-dashboards": HaConfigLovelaceDashboards;
  }
}
