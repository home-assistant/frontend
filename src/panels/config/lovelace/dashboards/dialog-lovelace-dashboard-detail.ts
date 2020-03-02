import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../../components/ha-icon-input";
import { HomeAssistant } from "../../../../types";
import {
  LovelaceDashboard,
  LovelaceDashboardMutableParams,
  LovelaceDashboardCreateParams,
} from "../../../../data/lovelace";
import { LovelaceDashboardDetailsDialogParams } from "./show-dialog-lovelace-dashboard-detail";
import { PolymerChangedEvent } from "../../../../polymer-types";
import { HaSwitch } from "../../../../components/ha-switch";
import { createCloseHeading } from "../../../../components/ha-dialog";
import { haStyleDialog } from "../../../../resources/styles";

@customElement("dialog-lovelace-dashboard-detail")
export class DialogLovelaceDashboardDetail extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _params?: LovelaceDashboardDetailsDialogParams;
  @property() private _urlPath!: LovelaceDashboard["url_path"];
  @property() private _showSidebar!: boolean;
  @property() private _sidebarIcon!: string;
  @property() private _sidebarTitle!: string;
  @property() private _requireAdmin!: LovelaceDashboard["require_admin"];

  @property() private _error?: string;
  @property() private _submitting = false;

  public async showDialog(
    params: LovelaceDashboardDetailsDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    if (this._params.dashboard) {
      this._urlPath = this._params.dashboard.url_path || "";
      this._showSidebar = !!this._params.dashboard.sidebar;
      this._sidebarIcon = this._params.dashboard.sidebar?.icon || "";
      this._sidebarTitle = this._params.dashboard.sidebar?.title || "";
      this._requireAdmin = this._params.dashboard.require_admin || false;
    } else {
      this._urlPath = "";
      this._showSidebar = true;
      this._sidebarIcon = "";
      this._sidebarTitle = "";
      this._requireAdmin = false;
    }
    await this.updateComplete;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const urlInvalid = !/^[a-zA-Z0-9_-]+$/.test(this._urlPath);
    return html`
      <ha-dialog
        open
        @closing="${this._close}"
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this._params.dashboard
            ? this._sidebarTitle ||
                this.hass!.localize(
                  "ui.panel.config.lovelace.dashboards.detail.edit_dashboard"
                )
            : this.hass!.localize(
                "ui.panel.config.lovelace.dashboards.detail.new_dashboard"
              )
        )}
      >
        <div>
          ${this._error
            ? html`
                <div class="error">${this._error}</div>
              `
            : ""}
          <div class="form">
            <ha-switch
              .checked=${this._showSidebar}
              @change=${this._showSidebarChanged}
              >${this.hass!.localize(
                "ui.panel.config.lovelace.dashboards.detail.show_sidebar"
              )}</ha-switch
            >
            ${this._showSidebar
              ? html`
                  <ha-icon-input
                    .value=${this._sidebarIcon}
                    @value-changed=${this._sidebarIconChanged}
                    .label=${this.hass!.localize(
                      "ui.panel.config.lovelace.dashboards.detail.icon"
                    )}
                  ></ha-icon-input>
                  <paper-input
                    .value=${this._sidebarTitle}
                    @value-changed=${this._sidebarTitleChanged}
                    .label=${this.hass!.localize(
                      "ui.panel.config.lovelace.dashboards.detail.title"
                    )}
                    @blur=${this._fillUrlPath}
                  ></paper-input>
                `
              : ""}
            ${!this._params.dashboard
              ? html`
                  <paper-input
                    .value=${this._urlPath}
                    @value-changed=${this._urlChanged}
                    .label=${this.hass!.localize(
                      "ui.panel.config.lovelace.dashboards.detail.url"
                    )}
                    .errorMessage=${this.hass!.localize(
                      "ui.panel.config.lovelace.dashboards.detail.url_error_msg"
                    )}
                    .invalid=${urlInvalid}
                  ></paper-input>
                `
              : ""}
            <ha-switch
              .checked=${this._requireAdmin}
              @change=${this._requireAdminChanged}
              >${this.hass!.localize(
                "ui.panel.config.lovelace.dashboards.detail.require_admin"
              )}</ha-switch
            >
          </div>
        </div>
        ${this._params.dashboard
          ? html`
              <mwc-button
                slot="secondaryAction"
                class="warning"
                @click=${this._deleteDashboard}
                .disabled=${this._submitting}
              >
                ${this.hass!.localize(
                  "ui.panel.config.lovelace.dashboards.detail.delete"
                )}
              </mwc-button>
              <mwc-button slot="secondaryAction" @click=${this._toggleDefault}>
                ${this._params.dashboard.url_path === localStorage.defaultPage
                  ? this.hass!.localize(
                      "ui.panel.config.lovelace.dashboards.detail.remove_default"
                    )
                  : this.hass!.localize(
                      "ui.panel.config.lovelace.dashboards.detail.set_default"
                    )}
              </mwc-button>
            `
          : html``}
        <mwc-button
          slot="primaryAction"
          @click="${this._updateDashboard}"
          .disabled=${urlInvalid || this._submitting}
        >
          ${this._params.dashboard
            ? this.hass!.localize(
                "ui.panel.config.lovelace.dashboards.detail.update"
              )
            : this.hass!.localize(
                "ui.panel.config.lovelace.dashboards.detail.create"
              )}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _urlChanged(ev: PolymerChangedEvent<string>) {
    this._error = undefined;
    this._urlPath = ev.detail.value;
  }

  private _sidebarIconChanged(ev: PolymerChangedEvent<string>) {
    this._error = undefined;
    this._sidebarIcon = ev.detail.value;
  }

  private _sidebarTitleChanged(ev: PolymerChangedEvent<string>) {
    this._error = undefined;
    this._sidebarTitle = ev.detail.value;
  }

  private _fillUrlPath() {
    if (this._urlPath) {
      return;
    }
    const parts = this._sidebarTitle.split(" ");

    if (parts.length) {
      this._urlPath = parts[0].toLowerCase();
    }
  }

  private _showSidebarChanged(ev: Event) {
    this._showSidebar = (ev.target as HaSwitch).checked;
  }

  private _requireAdminChanged(ev: Event) {
    this._requireAdmin = (ev.target as HaSwitch).checked;
  }

  private _toggleDefault() {
    const urlPath = this._params?.dashboard?.url_path;
    if (!urlPath) {
      return;
    }
    if (urlPath === localStorage.defaultPage) {
      delete localStorage.defaultPage;
    } else {
      localStorage.defaultPage = urlPath;
    }
    location.reload();
  }

  private async _updateDashboard() {
    this._submitting = true;
    try {
      const values: Partial<LovelaceDashboardMutableParams> = {
        require_admin: this._requireAdmin,
        sidebar: this._showSidebar
          ? { icon: this._sidebarIcon, title: this._sidebarTitle }
          : null,
      };
      if (this._params!.dashboard) {
        await this._params!.updateDashboard(values);
      } else {
        (values as LovelaceDashboardCreateParams).url_path = this._urlPath.trim();
        (values as LovelaceDashboardCreateParams).mode = "storage";
        await this._params!.createDashboard(
          values as LovelaceDashboardCreateParams
        );
      }
      this._params = undefined;
    } catch (err) {
      this._error = err?.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _deleteDashboard() {
    this._submitting = true;
    try {
      if (await this._params!.removeDashboard()) {
        this._close();
      }
    } finally {
      this._submitting = false;
    }
  }

  private _close(): void {
    this._params = undefined;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        .form {
          padding-bottom: 24px;
        }
        ha-switch {
          padding: 16px 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-lovelace-dashboard-detail": DialogLovelaceDashboardDetail;
  }
}
