import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { isIPAddress } from "../../../common/string/is_ip_address";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-formfield";
import "../../../components/ha-switch";
import "../../../components/ha-textfield";
import type { HaTextField } from "../../../components/ha-textfield";
import { CloudStatus, fetchCloudStatus } from "../../../data/cloud";
import { saveCoreConfig } from "../../../data/core";
import type { ValueChangedEvent, HomeAssistant } from "../../../types";

@customElement("ha-config-url-form")
class ConfigUrlForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: string;

  @state() private _working = false;

  @state() private _external_url?: string;

  @state() private _internal_url?: string;

  @state() private _cloudStatus?: CloudStatus | null;

  @state() private _showCustomExternalUrl = false;

  @state() private _showCustomInternalUrl = false;

  protected render() {
    const canEdit = ["storage", "default"].includes(
      this.hass.config.config_source
    );
    const disabled = this._working || !canEdit;

    if (!this.hass.userData?.showAdvanced || this._cloudStatus === undefined) {
      return nothing;
    }

    const internalUrl = this._internalUrlValue;
    const externalUrl = this._externalUrlValue;
    let hasCloud: boolean;
    let remoteEnabled: boolean;
    let httpUseHttps: boolean;

    if (this._cloudStatus === null) {
      hasCloud = false;
      remoteEnabled = false;
      httpUseHttps = false;
    } else {
      httpUseHttps = this._cloudStatus.http_use_ssl;

      if (this._cloudStatus.logged_in) {
        hasCloud = true;
        remoteEnabled =
          this._cloudStatus.active_subscription &&
          this._cloudStatus.prefs.remote_enabled;
      } else {
        hasCloud = false;
        remoteEnabled = false;
      }
    }

    return html`
      <ha-card
        outlined
        .header=${this.hass.localize("ui.panel.config.url.caption")}
      >
        <div class="card-content">
          ${!canEdit
            ? html`
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.core.section.core.core_config.edit_requires_storage"
                  )}
                </p>
              `
            : ""}
          ${this._error ? html`<div class="error">${this._error}</div>` : ""}

          <div class="description">
            ${this.hass.localize("ui.panel.config.url.description")}
          </div>

          ${hasCloud
            ? html`
                <div class="row">
                  <div class="flex">
                    ${this.hass.localize(
                      "ui.panel.config.url.external_url_label"
                    )}
                  </div>
                  <ha-formfield
                    .label=${this.hass.localize(
                      "ui.panel.config.url.external_use_ha_cloud"
                    )}
                  >
                    <ha-switch
                      .disabled=${disabled}
                      .checked=${externalUrl === null}
                      @change=${this._toggleCloud}
                    ></ha-switch>
                  </ha-formfield>
                </div>
              `
            : ""}
          ${!this._showCustomExternalUrl
            ? ""
            : html`
                <div class="row">
                  <div class="flex">
                    ${hasCloud
                      ? ""
                      : this.hass.localize(
                          "ui.panel.config.url.external_url_label"
                        )}
                  </div>
                  <ha-textfield
                    class="flex"
                    name="external_url"
                    type="url"
                    .disabled=${disabled}
                    .value=${externalUrl || ""}
                    @change=${this._handleChange}
                    placeholder="https://example.duckdns.org:8123"
                  >
                  </ha-textfield>
                </div>
              `}
          ${hasCloud || !isComponentLoaded(this.hass, "cloud")
            ? ""
            : html`
                <div class="row">
                  <div class="flex"></div>
                  <a href="/config/cloud"
                    >${this.hass.localize(
                      "ui.panel.config.url.external_get_ha_cloud"
                    )}</a
                  >
                </div>
              `}
          ${!this._showCustomExternalUrl && hasCloud
            ? html`
                ${remoteEnabled
                  ? html`
                      <div class="row">
                        <div class="flex"></div>
                        <a href="/config/cloud"
                          >${this.hass.localize(
                            "ui.panel.config.url.manage_ha_cloud"
                          )}</a
                        >
                      </div>
                    `
                  : html`
                      <ha-alert alert-type="error">
                        ${this.hass.localize(
                          "ui.panel.config.url.ha_cloud_remote_not_enabled"
                        )}
                        <a href="/config/cloud" slot="action"
                          ><mwc-button
                            .label=${this.hass.localize(
                              "ui.panel.config.url.enable_remote"
                            )}
                          ></mwc-button
                        ></a>
                      </ha-alert>
                    `}
              `
            : ""}

          <div class="row">
            <div class="flex">
              ${this.hass.localize("ui.panel.config.url.internal_url_label")}
            </div>

            <ha-formfield
              .label=${this.hass.localize(
                "ui.panel.config.url.internal_url_automatic"
              )}
            >
              <ha-switch
                .checked=${internalUrl === null}
                @change=${this._toggleInternalAutomatic}
              ></ha-switch>
            </ha-formfield>
          </div>

          ${!this._showCustomInternalUrl
            ? ""
            : html`
                <div class="row">
                  <div class="flex"></div>
                  <ha-textfield
                    class="flex"
                    name="internal_url"
                    type="url"
                    placeholder="http://<some IP address>:8123"
                    .disabled=${disabled}
                    .value=${internalUrl || ""}
                    @change=${this._handleChange}
                  >
                  </ha-textfield>
                </div>
              `}
          ${
            // If the user has configured a cert, show an error if
            httpUseHttps && // there is no internal url configured
            (!internalUrl ||
              // the internal url does not start with https
              !internalUrl.startsWith("https://") ||
              // the internal url points at an IP address
              isIPAddress(new URL(internalUrl).hostname))
              ? html`
                  <ha-alert
                    .alertType=${this._showCustomInternalUrl
                      ? "info"
                      : "warning"}
                    .title=${this.hass.localize(
                      "ui.panel.config.url.internal_url_https_error_title"
                    )}
                  >
                    ${this.hass.localize(
                      "ui.panel.config.url.internal_url_https_error_description"
                    )}
                  </ha-alert>
                `
              : ""
          }
        </div>
        <div class="card-actions">
          <mwc-button @click=${this._save} .disabled=${disabled}>
            ${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.save_button"
            )}
          </mwc-button>
        </div>
      </ha-card>
    `;
  }

  protected override firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    this._showCustomInternalUrl = this._internalUrlValue !== null;

    if (isComponentLoaded(this.hass, "cloud")) {
      fetchCloudStatus(this.hass).then((cloudStatus) => {
        this._cloudStatus = cloudStatus;
        if (cloudStatus.logged_in) {
          this._showCustomExternalUrl = this._externalUrlValue !== null;
        } else {
          this._showCustomExternalUrl = true;
        }
      });
    } else {
      this._cloudStatus = null;
      this._showCustomExternalUrl = true;
    }
  }

  private get _internalUrlValue() {
    return this._internal_url !== undefined
      ? this._internal_url
      : this.hass.config.internal_url;
  }

  private get _externalUrlValue() {
    return this._external_url !== undefined
      ? this._external_url
      : this.hass.config.external_url;
  }

  private _toggleCloud(ev) {
    this._showCustomExternalUrl = !ev.currentTarget.checked;
  }

  private _toggleInternalAutomatic(ev) {
    this._showCustomInternalUrl = !ev.currentTarget.checked;
  }

  private _handleChange(ev: ValueChangedEvent<string>) {
    const target = ev.currentTarget as HaTextField;
    this[`_${target.name}`] = target.value || null;
  }

  private async _save() {
    this._working = true;
    this._error = undefined;
    try {
      await saveCoreConfig(this.hass, {
        external_url: this._showCustomExternalUrl
          ? this._external_url || null
          : null,
        internal_url: this._showCustomInternalUrl
          ? this._internal_url || null
          : null,
      });
    } catch (err: any) {
      this._error = err.message || err;
    } finally {
      this._working = false;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      .description {
        margin-bottom: 1em;
      }
      .row {
        display: flex;
        flex-direction: row;
        margin: 0 -8px;
        align-items: center;
        padding: 8px 0;
      }

      .secondary {
        color: var(--secondary-text-color);
      }

      .flex {
        flex: 1;
      }

      .row > * {
        margin: 0 8px;
      }
      .error {
        color: var(--error-color);
      }

      .card-actions {
        display: flex;
        flex-direction: row-reverse;
      }

      a {
        color: var(--primary-color);
        text-decoration: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-url-form": ConfigUrlForm;
  }
}
