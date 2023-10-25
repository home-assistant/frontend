import "@material/mwc-button";
import { mdiHelpCircle } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { isEmptyFilter } from "../../../common/entity/entity_filter";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-settings-row";
import type { HaSwitch } from "../../../components/ha-switch";
import "../../../components/ha-textfield";
import type { HaTextField } from "../../../components/ha-textfield";
import { CloudStatusLoggedIn, updateCloudPref } from "../../../data/cloud";
import {
  ExposeEntitySettings,
  getExposeNewEntities,
  setExposeNewEntities,
} from "../../../data/expose";
import { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { showSaveSuccessToast } from "../../../util/toast-saved-success";

export class CloudGooglePref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public exposedEntities?: Record<
    string,
    ExposeEntitySettings
  >;

  @property({ attribute: false }) public cloudStatus?: CloudStatusLoggedIn;

  @state() private _exposeNew?: boolean;

  protected willUpdate() {
    if (!this.hasUpdated) {
      getExposeNewEntities(this.hass, "cloud.google_assistant").then(
        (value) => {
          this._exposeNew = value.expose_new;
        }
      );
    }
  }

  private _exposedEntitiesCount = memoizeOne(
    (exposedEntities: Record<string, ExposeEntitySettings>) =>
      Object.entries(exposedEntities).filter(
        ([entityId, expose]) =>
          expose["cloud.google_assistant"] && entityId in this.hass.states
      ).length
  );

  protected render() {
    if (!this.cloudStatus) {
      return nothing;
    }

    const google_registered = this.cloudStatus.google_registered;
    const { google_enabled, google_report_state, google_secure_devices_pin } =
      this.cloudStatus.prefs;

    const manualConfig = !isEmptyFilter(this.cloudStatus.google_entities);

    return html`
      <ha-card outlined>
        <h1 class="card-header">
          <img
            alt=""
            src=${brandsUrl({
              domain: "google_assistant",
              type: "icon",
              darkOptimized: this.hass.themes?.darkMode,
            })}
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
          />${this.hass.localize("ui.panel.config.cloud.account.google.title")}
        </h1>
        <div class="header-actions">
          <a
            href="https://www.nabucasa.com/config/google_assistant/"
            target="_blank"
            rel="noreferrer"
            class="icon-link"
          >
            <ha-icon-button
              .label=${this.hass.localize(
                "ui.panel.config.cloud.account.google.link_learn_how_it_works"
              )}
              .path=${mdiHelpCircle}
            ></ha-icon-button>
          </a>
          <ha-switch
            .checked=${google_enabled}
            @change=${this._enabledToggleChanged}
          ></ha-switch>
        </div>
        <div class="card-content">
          <p>
            ${this.hass.localize("ui.panel.config.cloud.account.google.info")}
          </p>
          ${manualConfig
            ? html`<ha-alert alert-type="warning">
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.google.manual_config"
                )}
              </ha-alert>`
            : ""}
          ${!google_enabled
            ? ""
            : html`${!google_registered
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
                <ha-settings-row>
                  <span slot="heading">
                    ${this.hass!.localize(
                      "ui.panel.config.cloud.account.google.expose_new_entities"
                    )}
                  </span>
                  <span slot="description">
                    ${this.hass!.localize(
                      "ui.panel.config.cloud.account.google.expose_new_entities_info"
                    )}
                  </span>
                  <ha-switch
                    .checked=${this._exposeNew}
                    .disabled=${this._exposeNew === undefined}
                    @change=${this._exposeNewToggleChanged}
                  ></ha-switch> </ha-settings-row
                >${google_registered
                  ? html`
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

                      <ha-settings-row>
                        <span slot="heading">
                          ${this.hass!.localize(
                            "ui.panel.config.cloud.account.google.enable_state_reporting"
                          )}
                        </span>
                        <span slot="description">
                          ${this.hass!.localize(
                            "ui.panel.config.cloud.account.google.info_state_reporting"
                          )}
                        </span>
                        <ha-switch
                          .checked=${google_report_state}
                          @change=${this._reportToggleChanged}
                        ></ha-switch>
                      </ha-settings-row>

                      <ha-settings-row>
                        <span slot="heading">
                          ${this.hass.localize(
                            "ui.panel.config.cloud.account.google.security_devices"
                          )}
                        </span>
                        <span slot="description">
                          ${this.hass.localize(
                            "ui.panel.config.cloud.account.google.enter_pin_info"
                          )}
                        </span>
                      </ha-settings-row>

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
                    `
                  : ""}`}
        </div>
        ${google_enabled
          ? html`<div class="card-actions">
              <a
                href="/config/voice-assistants/expose?assistants=cloud.google_assistant&historyBack"
              >
                <mwc-button>
                  ${manualConfig
                    ? this.hass!.localize(
                        "ui.panel.config.cloud.account.google.show_entities"
                      )
                    : this.hass.localize(
                        "ui.panel.config.cloud.account.google.exposed_entities",
                        {
                          number: this.exposedEntities
                            ? this._exposedEntitiesCount(this.exposedEntities)
                            : 0,
                        }
                      )}
                </mwc-button>
              </a>
            </div>`
          : nothing}
      </ha-card>
    `;
  }

  private async _exposeNewToggleChanged(ev) {
    const toggle = ev.target as HaSwitch;
    if (this._exposeNew === undefined || this._exposeNew === toggle.checked) {
      return;
    }
    try {
      await setExposeNewEntities(
        this.hass,
        "cloud.google_assistant",
        toggle.checked
      );
    } catch (err: any) {
      toggle.checked = !toggle.checked;
    }
  }

  private async _enabledToggleChanged(ev) {
    const toggle = ev.target as HaSwitch;
    try {
      await updateCloudPref(this.hass, { google_enabled: toggle.checked! });
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
      .header-actions {
        position: absolute;
        right: 24px;
        top: 24px;
        display: flex;
        flex-direction: row;
      }
      :host([dir="rtl"]) .header-actions {
        right: auto;
        left: 24px;
      }
      .header-actions .icon-link {
        margin-top: -16px;
        margin-inline-end: 8px;
        margin-right: 8px;
        direction: var(--direction);
        color: var(--secondary-text-color);
      }
      ha-settings-row {
        padding: 0;
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
      .card-header {
        display: flex;
        align-items: center;
      }
      img {
        height: 28px;
        margin-right: 16px;
        margin-inline-end: 16px;
        margin-inline-start: initial;
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
