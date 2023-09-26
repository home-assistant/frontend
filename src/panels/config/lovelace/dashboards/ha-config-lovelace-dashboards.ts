import {
  mdiCheck,
  mdiCheckCircleOutline,
  mdiDotsVertical,
  mdiOpenInNew,
  mdiPlus,
} from "@mdi/js";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import { html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoize from "memoize-one";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { navigate } from "../../../../common/navigate";
import { stringCompare } from "../../../../common/string/compare";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../../components/data-table/ha-data-table";
import "../../../../components/ha-clickable-list-item";
import "../../../../components/ha-fab";
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

type DataTableItem = Pick<
  LovelaceDashboard,
  "icon" | "title" | "show_in_sidebar" | "require_admin" | "mode" | "url_path"
> & {
  default: boolean;
  filename: string;
  iconColor?: string;
};

@customElement("ha-config-lovelace-dashboards")
export class HaConfigLovelaceDashboards extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @state() private _dashboards: LovelaceDashboard[] = [];

  private _columns = memoize(
    (narrow: boolean, _language, dashboards): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<DataTableItem> = {
        icon: {
          title: "",
          label: this.hass.localize(
            "ui.panel.config.lovelace.dashboards.picker.headers.icon"
          ),
          type: "icon",
          template: (dashboard) =>
            dashboard.icon
              ? html`
                  <ha-icon
                    slot="item-icon"
                    .icon=${dashboard.icon}
                    style=${ifDefined(
                      dashboard.iconColor
                        ? `color: ${dashboard.iconColor}`
                        : undefined
                    )}
                  ></ha-icon>
                `
              : nothing,
        },
        title: {
          title: this.hass.localize(
            "ui.panel.config.lovelace.dashboards.picker.headers.title"
          ),
          main: true,
          sortable: true,
          filterable: true,
          grows: true,
          template: (dashboard) => {
            const titleTemplate = html`
              ${dashboard.title}
              ${dashboard.default
                ? html`
                    <ha-svg-icon
                      style="padding-left: 10px; padding-inline-start: 10px; direction: var(--direction);"
                      .path=${mdiCheckCircleOutline}
                    ></ha-svg-icon>
                    <simple-tooltip animation-delay="0">
                      ${this.hass.localize(
                        `ui.panel.config.lovelace.dashboards.default_dashboard`
                      )}
                    </simple-tooltip>
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
                      ? html` – ${dashboard.filename} `
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
          template: (dashboard) => html`
            ${this.hass.localize(
              `ui.panel.config.lovelace.dashboards.conf_mode.${dashboard.mode}`
            ) || dashboard.mode}
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
          template: (dashboard) =>
            dashboard.require_admin
              ? html`<ha-svg-icon .path=${mdiCheck}></ha-svg-icon>`
              : html`—`,
        };
        columns.show_in_sidebar = {
          title: this.hass.localize(
            "ui.panel.config.lovelace.dashboards.picker.headers.sidebar"
          ),
          type: "icon",
          width: "121px",
          template: (dashboard) =>
            dashboard.show_in_sidebar
              ? html`<ha-svg-icon .path=${mdiCheck}></ha-svg-icon>`
              : html`—`,
        };
      }

      columns.url_path = {
        title: "",
        label: this.hass.localize(
          "ui.panel.config.lovelace.dashboards.picker.headers.url"
        ),
        filterable: true,
        width: "100px",
        template: (dashboard) =>
          narrow
            ? html`
                <ha-icon-button
                  .path=${mdiOpenInNew}
                  .urlPath=${dashboard.url_path}
                  @click=${this._navigate}
                  .label=${this.hass.localize(
                    "ui.panel.config.lovelace.dashboards.picker.open"
                  )}
                ></ha-icon-button>
              `
            : html`
                <mwc-button
                  .urlPath=${dashboard.url_path}
                  @click=${this._navigate}
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
    const defaultMode = (
      this.hass.panels?.lovelace?.config as LovelacePanelConfig
    ).mode;
    const defaultUrlPath = this.hass.defaultPanel;
    const isDefault = defaultUrlPath === "lovelace";
    const result: DataTableItem[] = [
      {
        icon: "hass:view-dashboard",
        title: this.hass.localize("panel.states"),
        default: isDefault,
        show_in_sidebar: isDefault,
        require_admin: false,
        url_path: "lovelace",
        mode: defaultMode,
        filename: defaultMode === "yaml" ? "ui-lovelace.yaml" : "",
        iconColor: "var(--primary-color)",
      },
    ];
    if (isComponentLoaded(this.hass, "energy")) {
      result.push({
        icon: "hass:lightning-bolt",
        title: this.hass.localize(`ui.panel.config.dashboard.energy.main`),
        show_in_sidebar: true,
        mode: "storage",
        url_path: "energy",
        filename: "",
        iconColor: "var(--label-badge-yellow)",
        default: false,
        require_admin: false,
      });
    }

    result.push(
      ...dashboards
        .sort((a, b) =>
          stringCompare(a.title, b.title, this.hass.locale.language)
        )
        .map((dashboard) => ({
          filename: "",
          ...dashboard,
          default: defaultUrlPath === dashboard.url_path,
        }))
    );
    return result;
  });

  protected render() {
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
        ${this.hass.userData?.showAdvanced
          ? html`
              <ha-button-menu slot="toolbar-icon" activatable>
                <ha-icon-button
                  slot="trigger"
                  .label=${this.hass.localize("ui.common.menu")}
                  .path=${mdiDotsVertical}
                ></ha-icon-button>
                <ha-clickable-list-item href="/config/lovelace/resources">
                  ${this.hass.localize(
                    "ui.panel.config.lovelace.resources.caption"
                  )}
                </ha-clickable-list-item>
              </ha-button-menu>
            `
          : ""}
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

  private _navigate(ev: Event) {
    ev.stopPropagation();
    navigate(`/${(ev.target as any).urlPath}`);
  }

  private _editDashboard(ev: CustomEvent) {
    const urlPath = (ev.detail as RowClickedEvent).id;

    if (urlPath === "energy") {
      navigate("/config/energy");
      return;
    }
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
        this._dashboards = this._dashboards!.concat(created).sort(
          (res1, res2) =>
            stringCompare(
              res1.url_path,
              res2.url_path,
              this.hass.locale.language
            )
        );
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
            title: this.hass!.localize(
              "ui.panel.config.lovelace.dashboards.confirm_delete_title",
              { dashboard_title: dashboard!.title }
            ),
            text: this.hass!.localize(
              "ui.panel.config.lovelace.dashboards.confirm_delete_text"
            ),
            confirmText: this.hass!.localize("ui.common.delete"),
            destructive: true,
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
        } catch (err: any) {
          return false;
        }
      },
    });
  }
}
