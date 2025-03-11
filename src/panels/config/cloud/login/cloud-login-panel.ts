import "@material/mwc-list/mwc-list";
import { mdiDeleteForever, mdiDotsVertical, mdiDownload } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { navigate } from "../../../../common/navigate";
import "../../../../components/ha-alert";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-list-item";
import "../../../../components/ha-button-menu";
import {
  cloudLogin,
  handleCloudLoginError,
  removeCloudData,
} from "../../../../data/cloud";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "../../ha-config-section";
import "./cloud-login";
import { showSupportPackageDialog } from "../account/show-dialog-cloud-support-package";
import type { CloudLogin } from "./cloud-login";
import { setAssistPipelinePreferred } from "../../../../data/assist_pipeline";

@customElement("cloud-login-panel")
export class CloudLoginPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property() public email?: string;

  @property({ attribute: false }) public flashMessage?: string;

  @state() private _requestInProgress = false;

  @state() private _password?: string;

  @state() private _error?: string;

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
              .email=${this.email}
              .password=${this._password}
              .inProgress=${this._requestInProgress}
              .error=${this._error}
              .localize=${this.hass.localize}
              @cloud-login=${this._handleLogin}
              @cloud-forgot-password=${this._handleForgotPassword}
            ></cloud-login>

            <ha-card outlined>
              <mwc-list>
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
              </mwc-list>
            </ha-card>
          </ha-config-section>
        </div>
      </hass-subpage>
    `;
  }

  private _doLogin = async (
    email: string,
    password: string,
    checkConnection: boolean,
    code?: string
  ) => {
    if (!password && !code) {
      throw new Error("Password or code required");
    }

    try {
      const result = await cloudLogin({
        hass: this.hass,
        email,
        ...(code ? { code } : { password }),
        check_connection: checkConnection,
      });
      this.email = "";
      this._password = "";
      if (result.cloud_pipeline) {
        if (
          await showConfirmationDialog(this, {
            title: this.hass.localize(
              "ui.panel.config.cloud.login.cloud_pipeline_title"
            ),
            text: this.hass.localize(
              "ui.panel.config.cloud.login.cloud_pipeline_text"
            ),
          })
        ) {
          setAssistPipelinePreferred(this.hass, result.cloud_pipeline);
        }
      }
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      const error = await handleCloudLoginError(
        err,
        this,
        email,
        password,
        checkConnection,
        this.hass.localize,
        this._doLogin
      );

      if (error === "cancel") {
        this._requestInProgress = false;
        this.email = "";
        this._password = "";
        return;
      }
      if (error === "password-change") {
        navigate("/config/cloud/forgot-password");
        return;
      }
      if (error === "re-login") {
        return;
      }

      this._password = "";
      this._requestInProgress = false;
      this._error = error;
      this._cloudLoginElement._emailField.focus();
    }
  };

  private async _handleLogin(ev: CustomEvent) {
    const email = ev.detail.email;
    const password = ev.detail.password;

    this._requestInProgress = true;

    await this._doLogin(email, password, true);

    this._requestInProgress = false;
  }

  private _handleForgotPassword() {
    this._dismissFlash();
    // @ts-ignore
    fireEvent(this, "email-changed", {
      value: this._cloudLoginElement._emailField.value,
    });
    navigate("/config/cloud/forgot-password");
  }

  private _handleRegister() {
    this._dismissFlash();

    // @ts-ignore
    fireEvent(this, "email-changed", {
      value: this._cloudLoginElement._emailField.value,
    });
    navigate("/config/cloud/register");
  }

  private _dismissFlash() {
    // @ts-ignore
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
}
