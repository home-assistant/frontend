import { mdiContentCopy, mdiEye, mdiEyeOff, mdiHelpCircle } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-settings-row";
import "../../../../components/ha-switch";
// eslint-disable-next-line
import { formatDate } from "../../../../common/datetime/format_date";
import type { HaSwitch } from "../../../../components/ha-switch";
import {
  CloudStatusLoggedIn,
  connectCloudRemote,
  disconnectCloudRemote,
  updateCloudPref,
} from "../../../../data/cloud";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import { showCloudCertificateDialog } from "../dialog-cloud-certificate/show-dialog-cloud-certificate";
import { showAlertDialog } from "../../../lovelace/custom-card-helpers";

@customElement("cloud-remote-pref")
export class CloudRemotePref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatusLoggedIn;

  @state() private _unmaskedUrl = false;

  protected render() {
    if (!this.cloudStatus) {
      return nothing;
    }

    const { remote_enabled, remote_allow_remote_enable, strict_connection } =
      this.cloudStatus.prefs;

    const {
      remote_connected,
      remote_domain,
      remote_certificate,
      remote_certificate_status,
    } = this.cloudStatus;

    if (!remote_certificate || remote_certificate_status !== "ready") {
      return html`
        <ha-card
          outlined
          header=${this.hass.localize(
            "ui.panel.config.cloud.account.remote.title"
          )}
        >
          <div class="preparing">
            ${remote_certificate_status === "error"
              ? this.hass.localize(
                  "ui.panel.config.cloud.account.remote.cerificate_error"
                )
              : remote_certificate_status === "loading"
                ? this.hass.localize(
                    "ui.panel.config.cloud.account.remote.cerificate_loading"
                  )
                : remote_certificate_status === "loaded"
                  ? this.hass.localize(
                      "ui.panel.config.cloud.account.remote.cerificate_loaded"
                    )
                  : this.hass.localize(
                      "ui.panel.config.cloud.account.remote.access_is_being_prepared"
                    )}
          </div>
        </ha-card>
      `;
    }

    return html`
      <ha-card
        outlined
        header=${this.hass.localize(
          "ui.panel.config.cloud.account.remote.title"
        )}
      >
        <div class="header-actions">
          <a
            href="https://www.nabucasa.com/config/remote/"
            target="_blank"
            rel="noreferrer"
            class="icon-link"
          >
            <ha-icon-button
              .label=${this.hass.localize(
                "ui.panel.config.cloud.account.remote.link_learn_how_it_works"
              )}
              .path=${mdiHelpCircle}
            ></ha-icon-button>
          </a>
          <ha-switch
            .checked=${remote_enabled}
            @change=${this._toggleChanged}
          ></ha-switch>
        </div>

        <div class="card-content">
          ${!remote_connected && remote_enabled
            ? html`
                <ha-alert
                  .title=${this.hass.localize(
                    `ui.panel.config.cloud.account.remote.reconnecting`
                  )}
                ></ha-alert>
              `
            : strict_connection === "drop_connection"
              ? html`<ha-alert
                  alert-type="warning"
                  .title=${this.hass.localize(
                    `ui.panel.config.cloud.account.remote.drop_connection_warning_title`
                  )}
                  >${this.hass.localize(
                    `ui.panel.config.cloud.account.remote.drop_connection_warning`
                  )}</ha-alert
                >`
              : nothing}
          ${this.hass.localize("ui.panel.config.cloud.account.remote.info")}
          <br />
          ${this.hass.localize(
            `ui.panel.config.cloud.account.remote.${
              remote_connected
                ? "instance_is_available"
                : "instance_will_be_available"
            }`
          )}
          ${this.hass.localize(
            "ui.panel.config.cloud.account.remote.nabu_casa_url"
          )}.

          <div class="url-container">
            <div class="textfield-container">
              <ha-textfield
                .value=${this._unmaskedUrl
                  ? `https://${remote_domain}`
                  : "https://•••••••••••••••••.ui.nabu.casa"}
                readonly
                .suffix=${
                  // reserve some space for the icon.
                  html`<div style="width: 24px"></div>`
                }
              ></ha-textfield>
              <ha-icon-button
                class="toggle-unmasked-url"
                toggles
                .label=${this.hass.localize(
                  `ui.panel.config.cloud.account.remote.${this._unmaskedUrl ? "hide" : "show"}_url`
                )}
                @click=${this._toggleUnmaskedUrl}
                .path=${this._unmaskedUrl ? mdiEyeOff : mdiEye}
              ></ha-icon-button>
            </div>
            <ha-button
              .url=${`https://${remote_domain}`}
              @click=${this._copyURL}
              unelevated
            >
              <ha-svg-icon slot="icon" .path=${mdiContentCopy}></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.config.cloud.account.remote.copy_link"
              )}
            </ha-button>
          </div>

          <ha-settings-row>
            <span slot="heading"
              >${this.hass.localize(
                "ui.panel.config.cloud.account.remote.strict_connection"
              )}</span
            >
            <span slot="description"
              >${this.hass.localize(
                "ui.panel.config.cloud.account.remote.strict_connection_secondary"
              )}</span
            >

            <ha-switch
              .checked=${strict_connection === "disabled"}
              @change=${this._strictConnectionToggleChanged}
            ></ha-switch>
          </ha-settings-row>

          ${strict_connection !== "disabled"
            ? html`<ha-settings-row>
                <span slot="heading"
                  >${this.hass.localize(
                    "ui.panel.config.cloud.account.remote.strict_connection_link"
                  )}</span
                >
                <span slot="description"
                  >${this.hass.localize(
                    "ui.panel.config.cloud.account.remote.strict_connection_link_secondary"
                  )}</span
                >
                <ha-button @click=${this._createLoginUrl}
                  >${this.hass.localize(
                    "ui.panel.config.cloud.account.remote.strict_connection_create_link"
                  )}</ha-button
                >
              </ha-settings-row>`
            : nothing}

          <ha-expansion-panel
            outlined
            .header=${this.hass.localize(
              "ui.panel.config.cloud.account.remote.advanced_options"
            )}
          >
            ${strict_connection !== "disabled"
              ? html` <ha-settings-row>
                  <span slot="heading"
                    >${this.hass.localize(
                      "ui.panel.config.cloud.account.remote.guard_page"
                    )}</span
                  >
                  <span slot="description"
                    >${this.hass.localize(
                      "ui.panel.config.cloud.account.remote.guard_page_secondary"
                    )}</span
                  >
                  <ha-switch
                    .checked=${strict_connection === "guard_page"}
                    @change=${this._dropConnectionToggleChanged}
                  ></ha-switch>
                </ha-settings-row>`
              : nothing}
            <ha-settings-row>
              <span slot="heading"
                >${this.hass.localize(
                  "ui.panel.config.cloud.account.remote.external_activation"
                )}</span
              >
              <span slot="description"
                >${this.hass.localize(
                  "ui.panel.config.cloud.account.remote.external_activation_secondary"
                )}</span
              >
              <ha-switch
                .checked=${remote_allow_remote_enable}
                @change=${this._toggleAllowRemoteEnabledChanged}
              ></ha-switch>
            </ha-settings-row>
            <ha-settings-row>
              <span slot="heading"
                >${this.hass.localize(
                  "ui.panel.config.cloud.account.remote.certificate_info"
                )}</span
              >
              <span slot="description"
                >${this.cloudStatus!.remote_certificate
                  ? this.hass.localize(
                      "ui.panel.config.cloud.account.remote.certificate_expire",
                      {
                        date: formatDate(
                          new Date(
                            this.cloudStatus.remote_certificate.expire_date
                          ),
                          this.hass.locale,
                          this.hass.config
                        ),
                      }
                    )
                  : nothing}</span
              >
              <ha-button @click=${this._openCertInfo}>
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.remote.more_info"
                )}
              </ha-button>
            </ha-settings-row>
          </ha-expansion-panel>
        </div>
      </ha-card>
    `;
  }

  private _openCertInfo() {
    showCloudCertificateDialog(this, {
      certificateInfo: this.cloudStatus!.remote_certificate!,
    });
  }

  private _toggleUnmaskedUrl(): void {
    this._unmaskedUrl = !this._unmaskedUrl;
  }

  private async _toggleChanged(ev) {
    const toggle = ev.target as HaSwitch;

    try {
      if (toggle.checked) {
        await connectCloudRemote(this.hass);
      } else {
        await disconnectCloudRemote(this.hass);
      }
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      alert(err.message);
      toggle.checked = !toggle.checked;
    }
  }

  private async _toggleAllowRemoteEnabledChanged(ev) {
    const toggle = ev.target as HaSwitch;

    try {
      await updateCloudPref(this.hass, {
        remote_allow_remote_enable: toggle.checked,
      });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      alert(err.message);
      toggle.checked = !toggle.checked;
    }
  }

  private async _strictConnectionToggleChanged(ev) {
    const toggle = ev.target as HaSwitch;

    try {
      await updateCloudPref(this.hass, {
        strict_connection: toggle.checked ? "disabled" : "guard_page",
      });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      alert(err.message);
      toggle.checked = !toggle.checked;
    }
  }

  private async _dropConnectionToggleChanged(ev) {
    const toggle = ev.target as HaSwitch;

    try {
      await updateCloudPref(this.hass, {
        strict_connection: toggle.checked ? "guard_page" : "drop_connection",
      });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      alert(err.message);
      toggle.checked = !toggle.checked;
    }
  }

  private async _copyURL(ev): Promise<void> {
    const url = ev.currentTarget.url;
    await copyToClipboard(url);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  private async _createLoginUrl() {
    try {
      const result = await this.hass.callService(
        "cloud",
        "create_temporary_strict_connection_url",
        undefined,
        undefined,
        false,
        true
      );
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.cloud.account.remote.strict_connection_link"
        ),
        text: html`${this.hass.localize(
            "ui.panel.config.cloud.account.remote.strict_connection_link_created_message"
          )}
          <div
            style="display: flex; align-items: center; gap: 8px; margin-top: 8px;"
          >
            <ha-textfield .value=${result.response.url} readonly></ha-textfield>
            <ha-button
              style="flex-basis: 180px;"
              .url=${result.response.url}
              @click=${this._copyURL}
              unelevated
            >
              <ha-svg-icon slot="icon" .path=${mdiContentCopy}></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.config.cloud.account.remote.copy_link"
              )}
            </ha-button>
          </div>`,
      });
    } catch (err: any) {
      showAlertDialog(this, { text: err.message });
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      .preparing {
        padding: 0 16px 16px;
      }
      a {
        color: var(--primary-color);
      }
      .header-actions {
        position: absolute;
        right: 16px;
        inset-inline-end: 16px;
        inset-inline-start: initial;
        top: 24px;
        display: flex;
        flex-direction: row;
      }
      .header-actions .icon-link {
        margin-top: -16px;
        margin-right: 8px;
        margin-inline-end: 8px;
        margin-inline-start: initial;
        direction: var(--direction);
        color: var(--secondary-text-color);
      }
      .warning {
        font-weight: bold;
        margin-bottom: 1em;
      }
      .break-word {
        overflow-wrap: break-word;
      }
      .connection-status {
        position: absolute;
        right: 24px;
        top: 24px;
        inset-inline-end: 24px;
        inset-inline-start: initial;
      }
      .card-actions {
        display: flex;
      }
      .card-actions a {
        text-decoration: none;
      }
      ha-expansion-panel {
        margin-top: 8px;
      }
      ha-settings-row {
        padding: 0;
      }
      ha-expansion-panel {
        --expansion-panel-content-padding: 0 16px;
        --expansion-panel-summary-padding: 0 16px;
      }
      ha-alert {
        display: block;
        margin-bottom: 16px;
      }
      .url-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
      }
      .textfield-container {
        position: relative;
        flex: 1;
      }
      .textfield-container ha-textfield {
        display: block;
      }
      .toggle-unmasked-url {
        position: absolute;
        top: 8px;
        right: 8px;
        inset-inline-start: initial;
        inset-inline-end: 8px;
        --mdc-icon-button-size: 40px;
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color);
        direction: var(--direction);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-remote-pref": CloudRemotePref;
  }
}
