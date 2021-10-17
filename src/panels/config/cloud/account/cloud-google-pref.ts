import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/buttons/ha-call-api-button";
import "../../../../components/ha-card";
import "../../../../components/ha-alert";
import type { HaSwitch } from "../../../../components/ha-switch";
import { CloudStatusLoggedIn, updateCloudPref } from "../../../../data/cloud";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../../types";
import { showSaveSuccessToast } from "../../../../util/toast-saved-success";

export class CloudGooglePref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public cloudStatus?: CloudStatusLoggedIn;

  protected render(): TemplateResult {
    if (!this.cloudStatus) {
      return html``;
    }

    const { google_enabled, google_report_state, google_secure_devices_pin } =
      this.cloudStatus.prefs;

    return html`
      <ha-card
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
          ${google_enabled && !this.cloudStatus.google_registered
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
            : ""}
          ${google_enabled
            ? html`
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
                  <paper-input
                    label=${this.hass.localize(
                      "ui.panel.config.cloud.account.google.devices_pin"
                    )}
                    id="google_secure_devices_pin"
                    placeholder=${this.hass.localize(
                      "ui.panel.config.cloud.account.google.enter_pin_hint"
                    )}
                    .value=${google_secure_devices_pin || ""}
                    @change=${this._pinChanged}
                  ></paper-input>
                </div>
              `
            : ""}
        </div>
        <div class="card-actions">
          <ha-call-api-button
            .hass=${this.hass}
            .disabled=${!google_enabled}
            @hass-api-called=${this._syncEntitiesCalled}
            path="cloud/google_actions/sync"
          >
            ${this.hass.localize(
              "ui.panel.config.cloud.account.google.sync_entities"
            )}
          </ha-call-api-button>
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

  private async _syncEntitiesCalled(ev: CustomEvent) {
    if (!ev.detail.success && ev.detail.response.status_code === 404) {
      this._syncFailed();
    }
  }

  private async _syncFailed() {
    showAlertDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.cloud.account.google.not_configured_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.cloud.account.google.not_configured_text"
      ),
    });
    fireEvent(this, "ha-refresh-cloud-status");
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
    const input = ev.target as PaperInputElement;
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
      input.value = this.cloudStatus!.prefs.google_secure_devices_pin;
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
      ha-call-api-button {
        color: var(--primary-color);
        font-weight: 500;
      }
      paper-input {
        width: 250px;
      }
      .card-actions {
        display: flex;
        justify-content: space-between;
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
