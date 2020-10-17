import "@material/mwc-fab";
import { mdiPlus } from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import memoize from "memoize-one";
import { navigate } from "../../../../common/navigate";
import { compare } from "../../../../common/string/compare";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../../components/data-table/ha-data-table";
import "../../../../components/ha-icon";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-svg-icon";
import {
  createDashboard,
  deleteDashboard,
  fetchDashboards,
  LovelaceDashboard,
  LovelaceDashboardCreateParams,
  LovelacePanelConfig,
  updateDashboard,
} from "../../../../data/lovelace";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import "../../../../layouts/hass-loading-screen";
import "../../../../layouts/hass-tabs-subpage-data-table";
import { HomeAssistant, Route } from "../../../../types";
import { lovelaceTabs } from "../ha-config-lovelace";
import { showDashboardDetailDialog } from "./show-dialog-lovelace-dashboard-detail";

@customElement("ha-config-lovelace-dashboards")
export class HaConfigLovelaceDashboards extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @internalProperty() private _dashboards: LovelaceDashboard[] = [];

  private _columns = memoize(
    (narrow: boolean, _language, dashboards): DataTableColumnContainer => {
      const columns: DataTableColumnContainer = {
        icon: {
          title: "",
          type: "icon",
          template: (icon) =>
            icon
              ? html` <ha-icon slot="item-icon" .icon=${icon}></ha-icon> `
              : html``,
        },
        title: {
          title: this.hass.localize(
            "ui.panel.config.lovelace.dashboards.picker.headers.title"
          ),
          sortable: true,
          filterable: true,
          direction: "asc",
          grows: true,
          template: (title, dashboard: any) => {
            const titleTemplate = html`
              ${title}
              ${dashboard.default
                ? html`
                    <ha-icon
                      style="padding-left: 10px;"
                      icon="hass:check-circle-outline"
                    ></ha-icon>
                    <paper-tooltip animation-delay="0">
                      ${this.hass.localize(
                        `ui.panel.config.lovelace.dashboards.default_dashboard`
                      )}
                    </paper-tooltip>
                  `
                : ""}
            `;
            return narrow
              ? html`
                  ${titleTemplate}
                  <div class="secondary">
                    ${this.hass.localize(
                      `ui.panel.config.lovelace.dashboards.conf_mode.${dashboard.mode}`
                    )}${dashboard.filename
                      ? html` - ${dashboard.filename} `
                      : ""}
                  </div>
                `
              : titleTemplate;
          },
        },
      };

      if (!narrow) {
        columns.mode = {
          title: this.hass.localize(
            "ui.panel.config.lovelace.dashboards.picker.headers.conf_mode"
          ),
          sortable: true,
          filterable: true,
          width: "20%",
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
            width: "15%",
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
          width: "100px",
          template: (requireAdmin: boolean) =>
            requireAdmin
              ? html` <ha-icon icon="hass:check"></ha-icon> `
              : html` - `,
        };
        columns.show_in_sidebar = {
          title: this.hass.localize(
            "ui.panel.config.lovelace.dashboards.picker.headers.sidebar"
          ),
          type: "icon",
          width: "121px",
          template: (sidebar) =>
            sidebar ? html` <ha-icon icon="hass:check"></ha-icon> ` : html` - `,
        };
      }

      columns.url_path = {
        title: "",
        filterable: true,
        width: "100px",
        template: (urlPath) =>
          narrow
            ? html`
                <ha-icon-button
                  icon="hass:open-in-new"
                  .urlPath=${urlPath}
                  @click=${this._navigate}
                ></ha-icon-button>
              `
            : html`
                <mwc-button .urlPath=${urlPath} @click=${this._navigate}
                  >${this.hass.localize(
                    "ui.panel.config.lovelace.dashboards.picker.open"
                  )}</mwc-button
                >
              `,
      };

      return columns;
    }
  );

  private _getItems = memoize((dashboards: LovelaceDashboard[]) => {
    const defaultMode = (this.hass.panels?.lovelace
      ?.config as LovelacePanelConfig).mode;
    const defaultUrlPath = this.hass.defaultPanel;
    const isDefault = defaultUrlPath === "lovelace";
    return [
      {
        icon: "hass:view-dashboard",
        title: this.hass.localize("panel.states"),
        default: isDefault,
        sidebar: isDefault,
        require_admin: false,
        url_path: "lovelace",
        mode: defaultMode,
        filename: defaultMode === "yaml" ? "ui-lovelace.yaml" : "",
      },
      ...dashboards.map((dashboard) => {
        return {
          filename: "",
          ...dashboard,
          default: defaultUrlPath === dashboard.url_path,
        };
      }),
    ];
  });

  protected render(): TemplateResult {
    if (!this.hass || this._dashboards === undefined) {
      return html` <hass-loading-screen></hass-loading-screen> `;
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
        hasFab
        clickable
      >
        <mwc-fab
          slot="fab"
          title="${this.hass.localize(
            "ui.panel.config.lovelace.dashboards.picker.add_dashboard"
          )}"
          @click=${this._addDashboard}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </mwc-fab>
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

  private _navigate(ev: Event) {
    ev.stopPropagation();
    const url = `/${(ev.target as any).urlPath}`;
    navigate(this, url);
  }

  private _editDashboard(ev: CustomEvent) {
    const urlPath = (ev.detail as RowClickedEvent).id;
    const dashboard = this._dashboards.find((res) => res.url_path === urlPath);
    this._openDialog(dashboard, urlPath);
  }

  private _addDashboard() {
    this._openDialog();
  }

  private async _openDialog(
    dashboard?: LovelaceDashboard,
    urlPath?: string
  ): Promise<void> {
    showDashboardDetailDialog(this, {
      dashboard,
      urlPath,
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
}
