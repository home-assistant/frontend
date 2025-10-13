import { mdiClose } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-md-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-select";
import "../../../../components/ha-md-select-option";
import "../../../../components/ha-button";
import "../../../../components/ha-spinner";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { LovelaceDashboard } from "../../../../data/lovelace/dashboard";
import { fetchDashboards } from "../../../../data/lovelace/dashboard";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { SelectDashboardDialogParams } from "./show-select-dashboard-dialog";
import type { HaMdDialog } from "../../../../components/ha-md-dialog";

@customElement("hui-dialog-select-dashboard")
export class HuiDialogSelectDashboard extends LitElement {
  public hass!: HomeAssistant;

  @state() private _params?: SelectDashboardDialogParams;

  @state() private _dashboards?: LovelaceDashboard[];

  @state() private _fromUrlPath?: string | null;

  @state() private _toUrlPath?: string | null;

  @state() private _config?: LovelaceConfig;

  @state() private _saving = false;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public showDialog(params: SelectDashboardDialogParams): void {
    this._config = params.lovelaceConfig;
    this._fromUrlPath = params.urlPath;
    this._params = params;
    this._getDashboards();
  }

  public closeDialog(): void {
    this._saving = false;
    this._dashboards = undefined;
    this._toUrlPath = undefined;
    this._dialog?.close();
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const dialogTitle =
      this._params.header ||
      this.hass.localize("ui.panel.lovelace.editor.select_dashboard.header");

    return html`
      <ha-md-dialog
        open
        @closed=${this._dialogClosed}
        .ariaLabel=${dialogTitle}
        .disableCancelAction=${this._saving}
      >
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
            @click=${this.closeDialog}
            .disabled=${this._saving}
          ></ha-icon-button>
          <span slot="title" .title=${dialogTitle}>${dialogTitle}</span>
        </ha-dialog-header>
        <div slot="content">
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
        </div>
        <div slot="actions">
          <ha-button
            appearance="plain"
            @click=${this.closeDialog}
            .disabled=${this._saving}
          >
            ${this.hass!.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            @click=${this._selectDashboard}
            .disabled=${!this._config ||
            this._fromUrlPath === this._toUrlPath ||
            this._saving}
          >
            ${this._params.actionLabel || this.hass!.localize("ui.common.move")}
          </ha-button>
        </div>
      </ha-md-dialog>
    `;
  }

  private async _getDashboards() {
    this._dashboards = [
      {
        id: "lovelace",
        url_path: "lovelace",
        require_admin: false,
        show_in_sidebar: true,
        title: this.hass.localize("ui.common.default"),
        mode: this.hass.panels.lovelace?.config?.mode,
      },
      ...(this._params!.dashboards || (await fetchDashboards(this.hass))),
    ];

    const currentPath = this._fromUrlPath || this.hass.defaultPanel;
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
