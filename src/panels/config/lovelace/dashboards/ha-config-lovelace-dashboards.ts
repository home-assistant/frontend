import {
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";
import memoize from "memoize-one";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../../components/data-table/ha-data-table";
import "../../../../components/ha-icon";
import "../../../../layouts/hass-loading-screen";
import "../../../../layouts/hass-tabs-subpage-data-table";
import { HomeAssistant, Route } from "../../../../types";
import {
  LovelaceDashboard,
  fetchDashboards,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  LovelaceDashboardCreateParams,
} from "../../../../data/lovelace";
import { showDashboardDetailDialog } from "./show-dialog-lovelace-dashboard-detail";
import { compare } from "../../../../common/string/compare";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { lovelaceTabs } from "../ha-config-lovelace";
import { navigate } from "../../../../common/navigate";

@customElement("ha-config-lovelace-dashboards")
export class HaConfigLovelaceDashboards extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public isWide!: boolean;
  @property() public narrow!: boolean;
  @property() public route!: Route;
  @property() private _dashboards: LovelaceDashboard[] = [];

  private _columns = memoize(
    (narrow: boolean, _language, dashboards): DataTableColumnContainer => {
      const columns: DataTableColumnContainer = {
        icon: {
          title: "",
          type: "icon",
          template: (icon) =>
            icon
              ? html`
                  <ha-icon slot="item-icon" .icon=${icon}></ha-icon>
                `
              : html``,
        },
        title: {
          title: this.hass.localize(
            "ui.panel.config.lovelace.dashboards.picker.headers.title"
          ),
          sortable: true,
          filterable: true,
          direction: "asc",
          template: (title, dashboard: any) =>
            narrow
              ? html`
                  ${title}
                  <div class="secondary">
                    ${this.hass.localize(
                      `ui.panel.config.lovelace.dashboards.conf_mode.${dashboard.mode}`
                    ) || dashboard.mode}${dashboard.filename
                      ? html`
                          - ${dashboard.filename}
                        `
                      : ""}
                  </div>
                `
              : html`
                  ${title}
                `,
        },
      };

      if (!narrow) {
        columns.mode = {
          title: this.hass.localize(
            "ui.panel.config.lovelace.dashboards.picker.headers.conf_mode"
          ),
          sortable: true,
          filterable: true,
          template: (mode) =>
            html`
              ${this.hass.localize(
                `ui.panel.config.lovelace.dashboards.conf_mode.${mode}`
              ) || mode}
            `,
        };
        if (dashboards.some((dashboard) => dashboard.filename)) {
          columns.filename = {
            title: this.hass.localize(
              "ui.panel.config.lovelace.dashboards.picker.headers.filename"
            ),
            sortable: true,
            filterable: true,
          };
        }
        columns.require_admin = {
          title: this.hass.localize(
            "ui.panel.config.lovelace.dashboards.picker.headers.require_admin"
          ),
          sortable: true,
          type: "icon",
          template: (requireAdmin: boolean) =>
            requireAdmin
              ? html`
                  <ha-icon icon="hass:check"></ha-icon>
                `
              : html`
                  -
                `,
        };
        columns.sidebar = {
          title: this.hass.localize(
            "ui.panel.config.lovelace.dashboards.picker.headers.sidebar"
          ),
          type: "icon",
          template: (sidebar) =>
            sidebar
              ? html`
                  <ha-icon icon="hass:check"></ha-icon>
                `
              : html`
                  -
                `,
        };
      }

      const columns2: DataTableColumnContainer = {
        url_path: {
          title: "",
          type: "icon",
          filterable: true,
          template: (urlPath) =>
            narrow
              ? html`
                  <paper-icon-button
                    icon="hass:open-in-new"
                    .urlPath=${urlPath}
                    @click=${this._navigate}
                  ></paper-icon-button>
                `
              : html`
                  <mwc-button .urlPath=${urlPath} @click=${this._navigate}
                    >${this.hass.localize(
                      "ui.panel.config.lovelace.dashboards.picker.open"
                    )}</mwc-button
                  >
                `,
        },
      };

      return { ...columns, ...columns2 };
    }
  );

  private _getItems = memoize((dashboards: LovelaceDashboard[]) => {
    return dashboards.map((dashboard) => {
      return {
        filename: "",
        ...dashboard,
        icon: dashboard.sidebar?.icon,
        title: dashboard.sidebar?.title || dashboard.url_path,
      };
    });
  });

  protected render(): TemplateResult {
    if (!this.hass || this._dashboards === undefined) {
      return html`
        <hass-loading-screen></hass-loading-screen>
      `;
    }

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
          this._dashboards
        )}
        .data=${this._getItems(this._dashboards)}
        @row-click=${this._editDashboard}
        id="url_path"
      >
      </hass-tabs-subpage-data-table>
      <ha-fab
        ?is-wide=${this.isWide}
        ?narrow=${this.narrow}
        icon="hass:plus"
        title="${this.hass.localize(
          "ui.panel.config.lovelace.dashboards.picker.add_dashboard"
        )}"
        @click=${this._addDashboard}
      ></ha-fab>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._getDashboards();
  }

  private async _getDashboards() {
    this._dashboards = await fetchDashboards(this.hass);
  }

  private _navigate(ev: Event) {
    ev.stopPropagation();
    const url = `/${(ev.target as any).urlPath}`;
    navigate(this, url);
  }

  private _editDashboard(ev: CustomEvent) {
    const urlPath = (ev.detail as RowClickedEvent).id;
    const dashboard = this._dashboards.find((res) => res.url_path === urlPath);
    this._openDialog(dashboard);
  }

  private _addDashboard() {
    this._openDialog();
  }

  private async _openDialog(dashboard?: LovelaceDashboard): Promise<void> {
    showDashboardDetailDialog(this, {
      dashboard,
      createDashboard: async (values: LovelaceDashboardCreateParams) => {
        const created = await createDashboard(this.hass!, values);
        this._dashboards = this._dashboards!.concat(
          created
        ).sort((res1, res2) => compare(res1.url_path, res2.url_path));
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
        if (
          !(await showConfirmationDialog(this, {
            text: this.hass!.localize(
              "ui.panel.config.lovelace.dashboards.confirm_delete"
            ),
          }))
        ) {
          return false;
        }

        try {
          await deleteDashboard(this.hass!, dashboard!.id);
          this._dashboards = this._dashboards!.filter(
            (res) => res !== dashboard
          );
          return true;
        } catch (err) {
          return false;
        }
      },
    });
  }

  static get styles(): CSSResult {
    return css`
      ha-fab {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 1;
      }
      ha-fab[is-wide] {
        bottom: 24px;
        right: 24px;
      }
      ha-fab[narrow] {
        bottom: 84px;
      }
    `;
  }
}
