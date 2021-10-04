import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { slugify } from "../../../../common/string/slugify";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import { createCloseHeading } from "../../../../components/ha-dialog";
import "../../../../components/ha-formfield";
import "../../../../components/ha-icon-input";
import "../../../../components/ha-switch";
import type { HaSwitch } from "../../../../components/ha-switch";
import {
  LovelaceDashboard,
  LovelaceDashboardCreateParams,
  LovelaceDashboardMutableParams,
} from "../../../../data/lovelace";
import { DEFAULT_PANEL, setDefaultPanel } from "../../../../data/panel";
import { PolymerChangedEvent } from "../../../../polymer-types";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { LovelaceDashboardDetailsDialogParams } from "./show-dialog-lovelace-dashboard-detail";

@customElement("dialog-lovelace-dashboard-detail")
export class DialogLovelaceDashboardDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: LovelaceDashboardDetailsDialogParams;

  @state() private _urlPath!: LovelaceDashboard["url_path"];

  @state() private _showInSidebar!: boolean;

  @state() private _icon!: string;

  @state() private _title!: string;

  @state()
  private _requireAdmin!: LovelaceDashboard["require_admin"];

  @state() private _error?: string;

  @state() private _submitting = false;

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
    const defaultPanelUrlPath = this.hass.defaultPanel;
    const urlInvalid =
      this._params.urlPath !== "lovelace" &&
      !/^[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]+$/.test(this._urlPath);
    const titleInvalid = !this._title.trim();
    const dir = computeRTLDirection(this.hass);

    return html`
      <ha-dialog
        open
        @closed=${this._close}
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
                  ? html` <div class="error">${this._error}</div> `
                  : ""}
                <div class="form">
                  <paper-input
                    .value=${this._title}
                    @value-changed=${this._titleChanged}
                    .label=${this.hass.localize(
                      "ui.panel.config.lovelace.dashboards.detail.title"
                    )}
                    @blur=${this.hass.userData?.showAdvanced
                      ? this._fillUrlPath
                      : undefined}
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
                  ${!this._params.dashboard && this.hass.userData?.showAdvanced
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
                  <div>
                    <ha-formfield
                      .label=${this.hass.localize(
                        "ui.panel.config.lovelace.dashboards.detail.show_sidebar"
                      )}
                      .dir=${dir}
                    >
                      <ha-switch
                        .checked=${this._showInSidebar}
                        @change=${this._showSidebarChanged}
                      >
                      </ha-switch>
                    </ha-formfield>
                  </div>
                  <div>
                    <ha-formfield
                      .label=${this.hass.localize(
                        "ui.panel.config.lovelace.dashboards.detail.require_admin"
                      )}
                      .dir=${dir}
                    >
                      <ha-switch
                        .checked=${this._requireAdmin}
                        @change=${this._requireAdminChanged}
                      >
                      </ha-switch>
                    </ha-formfield>
                  </div>
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
                defaultPanelUrlPath === "lovelace"}
              >
                ${this._params.urlPath === defaultPanelUrlPath
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
          @click=${this._updateDashboard}
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
    if (!this.hass.userData?.showAdvanced) {
      this._fillUrlPath();
    }
  }

  private _fillUrlPath() {
    if ((this.hass.userData?.showAdvanced && this._urlPath) || !this._title) {
      return;
    }

    const slugifyTitle = slugify(this._title, "-");
    this._urlPath = slugifyTitle.includes("-")
      ? slugifyTitle
      : `lovelace-${slugifyTitle}`;
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
    setDefaultPanel(
      this,
      urlPath === this.hass.defaultPanel ? DEFAULT_PANEL : urlPath
    );
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
        (values as LovelaceDashboardCreateParams).url_path =
          this._urlPath.trim();
        (values as LovelaceDashboardCreateParams).mode = "storage";
        await this._params!.createDashboard(
          values as LovelaceDashboardCreateParams
        );
      }
      this._close();
    } catch (err: any) {
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

  static get styles(): CSSResultGroup {
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
