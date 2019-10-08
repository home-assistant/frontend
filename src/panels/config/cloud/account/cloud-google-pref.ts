import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";
import "@material/mwc-button";
import "../../../../components/buttons/ha-call-api-button";

import "../../../../components/ha-card";
import "../../../../components/ha-switch";

// tslint:disable-next-line
import { HaSwitch } from "../../../../components/ha-switch";
import { fireEvent } from "../../../../common/dom/fire_event";
import { HomeAssistant } from "../../../../types";
import { CloudStatusLoggedIn, updateCloudPref } from "../../../../data/cloud";
import { PaperInputElement } from "@polymer/paper-input/paper-input";
import { showSaveSuccessToast } from "../../../../util/toast-saved-success";

export class CloudGooglePref extends LitElement {
  public hass?: HomeAssistant;
  public cloudStatus?: CloudStatusLoggedIn;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      cloudStatus: {},
    };
  }

  protected render(): TemplateResult | void {
    if (!this.cloudStatus) {
      return html``;
    }

    const {
      google_enabled,
      google_report_state,
      google_secure_devices_pin,
    } = this.cloudStatus.prefs;

    return html`
      <ha-card
        header=${this.hass!.localize(
          "ui.panel.config.cloud.account.google.title"
        )}
      >
        <div class="switch">
          <ha-switch
            id="google_enabled"
            .checked="${google_enabled}"
            @change="${this._enableToggleChanged}"
          ></ha-switch>
        </div>
        <div class="card-content">
          ${this.hass!.localize("ui.panel.config.cloud.account.google.info")}
          <ul>
            <li>
              <a
                href="https://assistant.google.com/services/a/uid/00000091fd5fb875?hl=en-US"
                target="_blank"
              >
                ${this.hass!.localize(
                  "ui.panel.config.cloud.account.google.enable_ha_skill"
                )}
              </a>
            </li>
            <li>
              <a
                href="https://www.nabucasa.com/config/google_assistant/"
                target="_blank"
              >
                ${this.hass!.localize(
                  "ui.panel.config.cloud.account.google.config_documentation"
                )}
              </a>
            </li>
          </ul>
          <em
            >${this.hass!.localize(
              "ui.panel.config.cloud.account.google.requirements"
            )}</em
          >
          ${google_enabled
            ? html`
                <h3>Enable State Reporting</h3>
                <p>
                  If you enable state reporting, Home Assistant will send
                  <b>all</b> state changes of exposed entities to Google. This
                  allows you to always see the latest states in the Google app.
                </p>
                <ha-switch
                  .checked=${google_report_state}
                  @change=${this._reportToggleChanged}
                ></ha-switch>

                <div class="secure_devices">
                  ${this.hass!.localize(
                    "ui.panel.config.cloud.account.google.enter_pin_info"
                  )}
                  <paper-input
                    label="${this.hass!.localize(
                      "ui.panel.config.cloud.account.google.devices_pin"
                    )}"
                    id="google_secure_devices_pin"
                    placeholder="${this.hass!.localize(
                      "ui.panel.config.cloud.account.google.enter_pin_hint"
                    )}"
                    .value=${google_secure_devices_pin || ""}
                    @change="${this._pinChanged}"
                  ></paper-input>
                </div>
              `
            : ""}
        </div>
        <div class="card-actions">
          <ha-call-api-button
            .hass="${this.hass}"
            .disabled="${!google_enabled}"
            path="cloud/google_actions/sync"
          >
            ${this.hass!.localize(
              "ui.panel.config.cloud.account.google.sync_entities"
            )}
          </ha-call-api-button>
          <div class="spacer"></div>
          <a href="/config/cloud/google-assistant">
            <mwc-button
              >${this.hass!.localize(
                "ui.panel.config.cloud.account.google.manage_entities"
              )}</mwc-button
            >
          </a>
        </div>
      </ha-card>
    `;
  }

  private async _enableToggleChanged(ev) {
    const toggle = ev.target as HaSwitch;
    try {
      await updateCloudPref(this.hass!, { [toggle.id]: toggle.checked! });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err) {
      toggle.checked = !toggle.checked;
    }
  }

  private async _reportToggleChanged(ev) {
    const toggle = ev.target as HaSwitch;
    try {
      await updateCloudPref(this.hass!, {
        google_report_state: toggle.checked!,
      });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err) {
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
      await updateCloudPref(this.hass!, {
        [input.id]: input.value || null,
      });
      showSaveSuccessToast(this, this.hass!);
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err) {
      alert(
        `${this.hass!.localize(
          "ui.panel.config.cloud.account.google.enter_pin_error"
        )} ${err.message}`
      );
      input.value = this.cloudStatus!.prefs.google_secure_devices_pin;
    }
  }

  static get styles(): CSSResult {
    return css`
      a {
        color: var(--primary-color);
      }
      .switch {
        position: absolute;
        right: 24px;
        top: 32px;
      }
      ha-call-api-button {
        color: var(--primary-color);
        font-weight: 500;
      }
      .secure_devices {
        padding-top: 16px;
      }
      paper-input {
        width: 250px;
      }
      .card-actions {
        display: flex;
      }
      .card-actions a {
        text-decoration: none;
      }
      .spacer {
        flex-grow: 1;
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
