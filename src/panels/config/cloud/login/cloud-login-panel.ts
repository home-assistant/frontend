import { mdiDeleteForever, mdiDotsVertical, mdiDownload } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { navigate } from "../../../../common/navigate";
import "../../../../components/ha-alert";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-list";
import "../../../../components/ha-list-item";
import { removeCloudData } from "../../../../data/cloud";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "../../ha-config-section";
import { showSupportPackageDialog } from "../account/show-dialog-cloud-support-package";
import "./cloud-login";
import type { CloudLogin } from "./cloud-login";

@customElement("cloud-login-panel")
export class CloudLoginPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property() public email?: string;

  @property({ attribute: false }) public flashMessage?: string;

  @query("cloud-login") private _cloudLoginElement!: CloudLogin;

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        header="Home Assistant Cloud"
      >
        <ha-button-menu slot="toolbar-icon" @action=${this._handleMenuAction}>
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>

          <ha-list-item graphic="icon">
            ${this.hass.localize(
              "ui.panel.config.cloud.account.reset_cloud_data"
            )}
            <ha-svg-icon slot="graphic" .path=${mdiDeleteForever}></ha-svg-icon>
          </ha-list-item>
          <ha-list-item graphic="icon">
            ${this.hass.localize(
              "ui.panel.config.cloud.account.download_support_package"
            )}
            <ha-svg-icon slot="graphic" .path=${mdiDownload}></ha-svg-icon>
          </ha-list-item>
        </ha-button-menu>
        <div class="content">
          <ha-config-section .isWide=${this.isWide}>
            <span slot="header">Home Assistant Cloud</span>
            <div slot="introduction">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.login.introduction"
                )}
              </p>
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.login.introduction2"
                )}
                <a
                  href="https://www.nabucasa.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Nabu&nbsp;Casa,&nbsp;Inc</a
                >${this.hass.localize(
                  "ui.panel.config.cloud.login.introduction2a"
                )}
              </p>
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.login.introduction3"
                )}
              </p>
              <p>
                <a
                  href="https://www.nabucasa.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  ${this.hass.localize(
                    "ui.panel.config.cloud.login.learn_more_link"
                  )}
                </a>
              </p>
            </div>

            ${this.flashMessage
              ? html`<ha-alert
                  dismissable
                  @alert-dismissed-clicked=${this._dismissFlash}
                >
                  ${this.flashMessage}
                </ha-alert>`
              : ""}

            <cloud-login
              .hass=${this.hass}
              .email=${this.email}
              .localize=${this.hass.localize}
              @cloud-forgot-password=${this._handleForgotPassword}
              check-connection
            ></cloud-login>

            <ha-card outlined>
              <ha-list>
                <ha-list-item @click=${this._handleRegister} twoline hasMeta>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.login.start_trial"
                  )}
                  <span slot="secondary">
                    ${this.hass.localize(
                      "ui.panel.config.cloud.login.trial_info"
                    )}
                  </span>
                  <ha-icon-next slot="meta"></ha-icon-next>
                </ha-list-item>
              </ha-list>
            </ha-card>
          </ha-config-section>
        </div>
      </hass-subpage>
    `;
  }

  private _handleForgotPassword() {
    this._dismissFlash();
    fireEvent(this, "cloud-email-changed", {
      value: this._cloudLoginElement.emailField.value,
    });
    navigate("/config/cloud/forgot-password");
  }

  private _handleRegister() {
    this._dismissFlash();

    fireEvent(this, "cloud-email-changed", {
      value: this._cloudLoginElement.emailField.value,
    });
    navigate("/config/cloud/register");
  }

  private _dismissFlash() {
    fireEvent(this, "flash-message-changed", { value: "" });
  }

  private _handleMenuAction(ev) {
    switch (ev.detail.index) {
      case 0:
        this._deleteCloudData();
        break;
      case 1:
        this._downloadSupportPackage();
    }
  }

  private async _deleteCloudData() {
    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.cloud.account.reset_data_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.cloud.account.reset_data_confirm_text"
      ),
      confirmText: this.hass.localize("ui.panel.config.cloud.account.reset"),
      destructive: true,
    });
    if (!confirm) {
      return;
    }
    try {
      await removeCloudData(this.hass);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.cloud.account.reset_data_failed"
        ),
        text: err?.message,
      });
      return;
    } finally {
      fireEvent(this, "ha-refresh-cloud-status");
    }
  }

  private async _downloadSupportPackage() {
    showSupportPackageDialog(this);
  }

  static get styles() {
    return [
      haStyle,
      css`
        .content {
          padding-bottom: 24px;
        }
        [slot="introduction"] {
          margin: -1em 0;
        }
        [slot="introduction"] a {
          color: var(--primary-color);
        }
        ha-card {
          overflow: hidden;
        }
        ha-card .card-header {
          margin-bottom: -8px;
        }
        h1 {
          margin: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-login-panel": CloudLoginPanel;
  }

  interface HASSDomEvents {
    "cloud-email-changed": { value: string };
    "flash-message-changed": { value: string };
  }
}
