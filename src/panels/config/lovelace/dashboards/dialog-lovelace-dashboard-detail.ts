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
  @property() private _showInSidebar!: boolean;
  @property() private _icon!: string;
  @property() private _title!: string;
  @property() private _requireAdmin!: LovelaceDashboard["require_admin"];

  @property() private _error?: string;
  @property() private _submitting = false;

  public async showDialog(
    params: LovelaceDashboardDetailsDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._urlPath = this._params.urlPath || "";
    if (this._params.dashboard) {
      this._showInSidebar = !!this._params.dashboard.show_in_sidebar;
      this._icon = this._params.dashboard.icon || "";
      this._title = this._params.dashboard.title || "";
      this._requireAdmin = this._params.dashboard.require_admin || false;
    } else {
      this._showInSidebar = true;
      this._icon = "";
      this._title = "";
      this._requireAdmin = false;
    }
    await this.updateComplete;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const urlInvalid = !/^[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]+$/.test(this._urlPath);
    const titleInvalid = !this._urlPath.trim();
    return html`
      <ha-dialog
        open
        @closing="${this._close}"
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this._params.urlPath
            ? this._title ||
                this.hass.localize(
                  "ui.panel.config.lovelace.dashboards.detail.edit_dashboard"
                )
            : this.hass.localize(
                "ui.panel.config.lovelace.dashboards.detail.new_dashboard"
              )
        )}
      >
        <div>
          ${this._params.dashboard && !this._params.dashboard.id
            ? this.hass.localize(
                "ui.panel.config.lovelace.dashboards.cant_edit_yaml"
              )
            : this._params.urlPath === "lovelace"
            ? this.hass.localize(
                "ui.panel.config.lovelace.dashboards.cant_edit_default"
              )
            : html`
                ${this._error
                  ? html`
                      <div class="error">${this._error}</div>
                    `
                  : ""}
                <div class="form">
                  <paper-input
                    .value=${this._title}
                    @value-changed=${this._titleChanged}
                    .label=${this.hass.localize(
                      "ui.panel.config.lovelace.dashboards.detail.title"
                    )}
                    @blur=${this._fillUrlPath}
                    .invalid=${titleInvalid}
                    .errorMessage=${this.hass.localize(
                      "ui.panel.config.lovelace.dashboards.detail.title_required"
                    )}
                    dialogInitialFocus
                  ></paper-input>
                  <ha-icon-input
                    .value=${this._icon}
                    @value-changed=${this._iconChanged}
                    .label=${this.hass.localize(
                      "ui.panel.config.lovelace.dashboards.detail.icon"
                    )}
                  ></ha-icon-input>
                  ${!this._params.dashboard
                    ? html`
                        <paper-input
                          .value=${this._urlPath}
                          @value-changed=${this._urlChanged}
                          .label=${this.hass.localize(
                            "ui.panel.config.lovelace.dashboards.detail.url"
                          )}
                          .errorMessage=${this.hass.localize(
                            "ui.panel.config.lovelace.dashboards.detail.url_error_msg"
                          )}
                          .invalid=${urlInvalid}
                        ></paper-input>
                      `
                    : ""}
                  <ha-switch
                    .checked=${this._showInSidebar}
                    @change=${this._showSidebarChanged}
                    >${this.hass.localize(
                      "ui.panel.config.lovelace.dashboards.detail.show_sidebar"
                    )}
                  </ha-switch>
                  <ha-switch
                    .checked=${this._requireAdmin}
                    @change=${this._requireAdminChanged}
                    >${this.hass.localize(
                      "ui.panel.config.lovelace.dashboards.detail.require_admin"
                    )}
                  </ha-switch>
                </div>
              `}
        </div>
        ${this._params.urlPath
          ? html`
              ${this._params.dashboard?.id
                ? html`
                    <mwc-button
                      slot="secondaryAction"
                      class="warning"
                      @click=${this._deleteDashboard}
                      .disabled=${this._submitting}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.lovelace.dashboards.detail.delete"
                      )}
                    </mwc-button>
                  `
                : ""}
              <mwc-button
                slot="secondaryAction"
                @click=${this._toggleDefault}
                .disabled=${this._params.urlPath === "lovelace" &&
                  (!localStorage.defaultPage ||
                    localStorage.defaultPage === "lovelace")}
              >
                ${this._params.urlPath === localStorage.defaultPage ||
                (this._params.urlPath === "lovelace" &&
                  !localStorage.defaultPage)
                  ? this.hass.localize(
                      "ui.panel.config.lovelace.dashboards.detail.remove_default"
                    )
                  : this.hass.localize(
                      "ui.panel.config.lovelace.dashboards.detail.set_default"
                    )}
              </mwc-button>
            `
          : ""}
        <mwc-button
          slot="primaryAction"
          @click="${this._updateDashboard}"
          .disabled=${urlInvalid || titleInvalid || this._submitting}
        >
          ${this._params.urlPath
            ? this._params.dashboard?.id
              ? this.hass.localize(
                  "ui.panel.config.lovelace.dashboards.detail.update"
                )
              : this.hass.localize("ui.common.close")
            : this.hass.localize(
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

  private _iconChanged(ev: PolymerChangedEvent<string>) {
    this._error = undefined;
    this._icon = ev.detail.value;
  }

  private _titleChanged(ev: PolymerChangedEvent<string>) {
    this._error = undefined;
    this._title = ev.detail.value;
  }

  private _fillUrlPath() {
    if (this._urlPath || !this._title) {
      return;
    }
    const parts = this._title.split(" ");

    if (parts.length === 1) {
      this._urlPath = `lovelace-${parts[0].toLowerCase()}`;
    } else {
      this._urlPath = parts.join("_").toLowerCase();
    }
  }

  private _showSidebarChanged(ev: Event) {
    this._showInSidebar = (ev.target as HaSwitch).checked;
  }

  private _requireAdminChanged(ev: Event) {
    this._requireAdmin = (ev.target as HaSwitch).checked;
  }

  private _toggleDefault() {
    const urlPath = this._params?.urlPath;
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
    if (this._params?.urlPath && !this._params.dashboard?.id) {
      this._close();
    }
    this._submitting = true;
    try {
      const values: Partial<LovelaceDashboardMutableParams> = {
        require_admin: this._requireAdmin,
        show_in_sidebar: this._showInSidebar,
        icon: this._icon || undefined,
        title: this._title,
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
      this._close();
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
