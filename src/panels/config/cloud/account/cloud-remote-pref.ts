import { mdiHelpCircle } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-settings-row";
import "../../../../components/ha-switch";

import { formatDate } from "../../../../common/datetime/format_date";
import type { HaSwitch } from "../../../../components/ha-switch";
import type { CloudStatusLoggedIn } from "../../../../data/cloud";
import {
  connectCloudRemote,
  disconnectCloudRemote,
  updateCloudPref,
} from "../../../../data/cloud";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import { showCloudCertificateDialog } from "../dialog-cloud-certificate/show-dialog-cloud-certificate";
import { obfuscateUrl } from "../../../../util/url";
import "../../../../components/ha-copy-textfield";

@customElement("cloud-remote-pref")
export class CloudRemotePref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatusLoggedIn;

  @property({ type: Boolean }) public narrow = false;

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
          <p>
            ${this.hass.localize("ui.panel.config.cloud.account.remote.info")}
          </p>
          ${remote_connected
            ? nothing
            : html`
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.remote.info_instance_will_be_available"
                  )}
                </p>
              `}

          <ha-copy-textfield
            .hass=${this.hass}
            .value=${`https://${remote_domain}`}
            .maskedValue=${obfuscateUrl(`https://${remote_domain}`)}
            .label=${this.hass!.localize("ui.panel.config.common.copy_link")}
          ></ha-copy-textfield>

          <ha-expansion-panel
            outlined
            .header=${this.hass.localize(
              "ui.panel.config.cloud.account.remote.security_options"
            )}
          >
            <ha-settings-row wrap-heading>
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
            <hr />
            <ha-settings-row .narrow=${this.narrow}>
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
      showToast(this, { message: err.message });
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
      showToast(this, { message: err.message });
      toggle.checked = !toggle.checked;
    }
  }

  static styles = css`
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
      font-weight: var(--ha-font-weight-bold);
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
      margin-top: 16px;
    }
    ha-settings-row {
      padding: 0;
      border-top: none !important;
    }
    ha-expansion-panel {
      --expansion-panel-content-padding: 0 16px;
      --expansion-panel-summary-padding: 0 16px;
    }
    ha-alert {
      display: block;
      margin-bottom: 16px;
    }
    hr {
      border: none;
      height: 1px;
      background-color: var(--divider-color);
      margin: 8px 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-remote-pref": CloudRemotePref;
  }
}
