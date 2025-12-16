import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-wa-dialog";
import "../../../../components/ha-md-select";
import "../../../../components/ha-md-select-option";
import "../../../../components/ha-spinner";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { LovelaceDashboard } from "../../../../data/lovelace/dashboard";
import { fetchDashboards } from "../../../../data/lovelace/dashboard";
import { getDefaultPanelUrlPath } from "../../../../data/panel";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { SelectDashboardDialogParams } from "./show-select-dashboard-dialog";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";

@customElement("hui-dialog-select-dashboard")
export class HuiDialogSelectDashboard extends LitElement {
  public hass!: HomeAssistant;

  @state() private _params?: SelectDashboardDialogParams;

  @state() private _dashboards?: LovelaceDashboard[];

  @state() private _fromUrlPath?: string | null;

  @state() private _toUrlPath?: string | null;

  @state() private _config?: LovelaceConfig;

  @state() private _saving = false;

  @state() private _open = false;

  public showDialog(params: SelectDashboardDialogParams): void {
    this._config = params.lovelaceConfig;
    this._fromUrlPath = params.urlPath;
    this._params = params;
    this._open = true;
    this._getDashboards();
  }

  public closeDialog(): void {
    if (this._open) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._saving = false;
    this._dashboards = undefined;
    this._toUrlPath = undefined;
    this._open = false;
    this._params = undefined;
  }

  private _dialogClosed(): void {
    this.closeDialog();
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const dialogTitle =
      this._params.header ||
      this.hass.localize("ui.panel.lovelace.editor.select_dashboard.header");

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${dialogTitle}
        .preventScrimClose=${this._saving}
        @closed=${this._dialogClosed}
      >
        ${this._dashboards && !this._saving
          ? html`
              <ha-md-select
                .label=${this.hass.localize(
                  "ui.panel.lovelace.editor.select_view.dashboard_label"
                )}
                @change=${this._dashboardChanged}
                .value=${this._toUrlPath || ""}
              >
                ${this._dashboards.map(
                  (dashboard) => html`
                    <ha-md-select-option
                      .disabled=${dashboard.mode !== "storage" ||
                      dashboard.url_path === this._fromUrlPath ||
                      (dashboard.url_path === "lovelace" &&
                        this._fromUrlPath === null)}
                      .value=${dashboard.url_path}
                      >${dashboard.title}</ha-md-select-option
                    >
                  `
                )}
              </ha-md-select>
            `
          : html`<div class="loading">
              <ha-spinner size="medium"></ha-spinner>
            </div>`}
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
            .disabled=${this._saving}
          >
            ${this.hass!.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._selectDashboard}
            .disabled=${!this._config ||
            this._fromUrlPath === this._toUrlPath ||
            this._saving}
          >
            ${this._params.actionLabel || this.hass!.localize("ui.common.move")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private async _getDashboards() {
    let dashboards: LovelaceDashboard[] | undefined = this._params!.dashboards;
    if (!dashboards) {
      try {
        dashboards = await fetchDashboards(this.hass);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error fetching dashboards:", error);

        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.lovelace.editor.select_dashboard.error_title"
          ),
          text: this.hass.localize(
            "ui.panel.lovelace.editor.select_dashboard.error_text"
          ),
        });
      }
    }

    this._dashboards = [
      {
        id: "lovelace",
        url_path: "lovelace",
        require_admin: false,
        show_in_sidebar: true,
        title: this.hass.localize("ui.common.default"),
        mode: this.hass.panels.lovelace?.config?.mode,
      },
      ...(dashboards ?? []),
    ];

    const defaultPanel = getDefaultPanelUrlPath(this.hass);

    const currentPath = this._fromUrlPath || defaultPanel;
    for (const dashboard of this._dashboards!) {
      if (dashboard.url_path !== currentPath) {
        this._toUrlPath = dashboard.url_path;
        break;
      }
    }
  }

  private async _dashboardChanged(ev) {
    const urlPath: string = ev.target.value;
    if (urlPath === this._toUrlPath) {
      return;
    }
    this._toUrlPath = urlPath;
  }

  private async _selectDashboard() {
    this._saving = true;
    if (this._toUrlPath === "lovelace") {
      this._toUrlPath = null;
    }
    this._params!.dashboardSelectedCallback(this._toUrlPath!);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-md-select {
          width: 100%;
        }
        .loading {
          display: flex;
          justify-content: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-select-dashboard": HuiDialogSelectDashboard;
  }
}
