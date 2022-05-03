import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-card";
import type { HaSwitch } from "../../../../components/ha-switch";
import "../../../../components/ha-textfield";
import type { HaTextField } from "../../../../components/ha-textfield";
import { CloudStatusLoggedIn, updateCloudPref } from "../../../../data/cloud";
import { syncCloudGoogleEntities } from "../../../../data/google_assistant";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../../types";
import { showSaveSuccessToast } from "../../../../util/toast-saved-success";

export class CloudGooglePref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatusLoggedIn;

  @state() private _syncing = false;

  protected render(): TemplateResult {
    if (!this.cloudStatus) {
      return html``;
    }

    const google_registered = this.cloudStatus.google_registered;
    const { google_enabled, google_report_state, google_secure_devices_pin } =
      this.cloudStatus.prefs;

    return html`
      <ha-card
        outlined
        header=${this.hass.localize(
          "ui.panel.config.cloud.account.google.title"
        )}
      >
        <div class="switch">
          <ha-switch
            id="google_enabled"
            .checked=${google_enabled}
            @change=${this._enableToggleChanged}
          ></ha-switch>
        </div>
        <div class="card-content">
          <p>
            ${this.hass.localize("ui.panel.config.cloud.account.google.info")}
          </p>
          ${!google_enabled
            ? ""
            : !google_registered
            ? html`
                <ha-alert
                  .title=${this.hass.localize(
                    "ui.panel.config.cloud.account.google.not_configured_title"
                  )}
                >
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.google.not_configured_text"
                  )}

                  <ul>
                    <li>
                      <a
                        href="https://assistant.google.com/services/a/uid/00000091fd5fb875?hl=en-US"
                        target="_blank"
                        rel="noreferrer"
                      >
                        ${this.hass.localize(
                          "ui.panel.config.cloud.account.google.enable_ha_skill"
                        )}
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://www.nabucasa.com/config/google_assistant/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        ${this.hass.localize(
                          "ui.panel.config.cloud.account.google.config_documentation"
                        )}
                      </a>
                    </li>
                  </ul>
                </ha-alert>
              `
            : html`
                ${this.cloudStatus.http_use_ssl
                  ? html`
                      <ha-alert
                        alert-type="warning"
                        .title=${this.hass.localize(
                          "ui.panel.config.cloud.account.google.http_use_ssl_warning_title"
                        )}
                      >
                        ${this.hass.localize(
                          "ui.panel.config.cloud.account.google.http_use_ssl_warning_text"
                        )}
                        <a
                          href="https://www.nabucasa.com/config/google_assistant/#local-communication"
                          target="_blank"
                          rel="noreferrer"
                          >${this.hass.localize(
                            "ui.panel.config.common.learn_more"
                          )}</a
                        >
                      </ha-alert>
                    `
                  : ""}

                <div class="state-reporting">
                  <h3>
                    ${this.hass.localize(
                      "ui.panel.config.cloud.account.google.enable_state_reporting"
                    )}
                  </h3>
                  <div class="state-reporting-switch">
                    <ha-switch
                      .checked=${google_report_state}
                      @change=${this._reportToggleChanged}
                    ></ha-switch>
                  </div>
                </div>
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.google.info_state_reporting"
                  )}
                </p>
                <div class="secure_devices">
                  <h3>
                    ${this.hass.localize(
                      "ui.panel.config.cloud.account.google.security_devices"
                    )}
                  </h3>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.google.enter_pin_info"
                  )}
                  <ha-textfield
                    id="google_secure_devices_pin"
                    .label=${this.hass.localize(
                      "ui.panel.config.cloud.account.google.devices_pin"
                    )}
                    .placeholder=${this.hass.localize(
                      "ui.panel.config.cloud.account.google.enter_pin_hint"
                    )}
                    .value=${google_secure_devices_pin || ""}
                    @change=${this._pinChanged}
                  ></ha-textfield>
                </div>
              `}
        </div>
        <div class="card-actions">
          ${google_registered
            ? html`
                <mwc-button
                  @click=${this._handleSync}
                  .disabled=${!google_enabled || this._syncing}
                >
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.google.sync_entities"
                  )}
                </mwc-button>
              `
            : ""}
          <div class="spacer"></div>
          <a href="/config/cloud/google-assistant">
            <mwc-button>
              ${this.hass.localize(
                "ui.panel.config.cloud.account.google.manage_entities"
              )}
            </mwc-button>
          </a>
        </div>
      </ha-card>
    `;
  }

  private async _handleSync() {
    this._syncing = true;
    try {
      await syncCloudGoogleEntities(this.hass!);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          `ui.panel.config.cloud.account.google.${
            err.status_code === 404
              ? "not_configured_title"
              : "sync_failed_title"
          }`
        ),
        text: this.hass.localize(
          `ui.panel.config.cloud.account.google.${
            err.status_code === 404 ? "not_configured_text" : "sync_failed_text"
          }`
        ),
      });
      fireEvent(this, "ha-refresh-cloud-status");
    } finally {
      this._syncing = false;
    }
  }

  private async _enableToggleChanged(ev) {
    const toggle = ev.target as HaSwitch;
    try {
      await updateCloudPref(this.hass, { [toggle.id]: toggle.checked! });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      toggle.checked = !toggle.checked;
    }
  }

  private async _reportToggleChanged(ev) {
    const toggle = ev.target as HaSwitch;
    try {
      await updateCloudPref(this.hass, {
        google_report_state: toggle.checked!,
      });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      alert(
        `Unable to ${toggle.checked ? "enable" : "disable"} report state. ${
          err.message
        }`
      );
      toggle.checked = !toggle.checked;
    }
  }

  private async _pinChanged(ev) {
    const input = ev.target as HaTextField;
    try {
      await updateCloudPref(this.hass, {
        [input.id]: input.value || null,
      });
      showSaveSuccessToast(this, this.hass);
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      alert(
        `${this.hass.localize(
          "ui.panel.config.cloud.account.google.enter_pin_error"
        )} ${err.message}`
      );
      input.value = this.cloudStatus!.prefs.google_secure_devices_pin || "";
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      a {
        color: var(--primary-color);
      }
      .switch {
        position: absolute;
        right: 24px;
        top: 24px;
      }
      :host([dir="rtl"]) .switch {
        right: auto;
        left: 24px;
      }
      ha-textfield {
        width: 250px;
        display: block;
        margin-top: 8px;
      }
      .card-actions {
        display: flex;
      }
      .card-actions a {
        text-decoration: none;
      }
      .warning {
        color: var(--error-color);
      }
      .secure_devices {
        padding-top: 8px;
      }
      .spacer {
        flex-grow: 1;
      }

      .state-reporting {
        display: flex;
        margin-top: 1.5em;
      }
      .state-reporting + p {
        margin-top: 0.5em;
      }
      h3 {
        margin: 0 0 8px 0;
      }
      .state-reporting h3 {
        flex-grow: 1;
        margin: 0;
      }
      .state-reporting-switch {
        margin-top: 0.25em;
        margin-right: 7px;
        margin-left: 0.5em;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-google-pref": CloudGooglePref;
  }
}

customElements.define("cloud-google-pref", CloudGooglePref);
