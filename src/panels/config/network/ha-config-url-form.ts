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
import { mdiContentCopy, mdiEyeOff, mdiEye } from "@mdi/js";
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
import { getNetworkUrls, type NetworkUrls } from "../../../data/network";
import type { ValueChangedEvent, HomeAssistant } from "../../../types";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import { showToast } from "../../../util/toast";

@customElement("ha-config-url-form")
class ConfigUrlForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: string;

  @state() private _working = false;

  @state() private _urls?: NetworkUrls;

  @state() private _external_url?: string;

  @state() private _internal_url?: string;

  @state() private _cloudStatus?: CloudStatus | null;

  @state() private _showCustomExternalUrl = false;

  @state() private _showCustomInternalUrl = false;

  @state() private _unmaskedExternalUrl = false;

  @state() private _unmaskedInternalUrl = false;

  @state() private _cloudChecked = false;

  protected render() {
    const canEdit = ["storage", "default"].includes(
      this.hass.config.config_source
    );
    const disabled = this._working || !canEdit;

    if (
      !this.hass.userData?.showAdvanced ||
      this._cloudStatus === undefined ||
      this._urls === undefined
    ) {
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
                <h4>
                  ${this.hass.localize(
                    "ui.panel.config.url.external_url_label"
                  )}
                </h4>
                <ha-settings-row slim>
                  <span slot="heading">
                    ${this.hass.localize(
                      "ui.panel.config.url.external_use_ha_cloud"
                    )}
                  </span>
                  <ha-switch
                    .disabled=${disabled}
                    .checked=${this._cloudChecked}
                    @change=${this._toggleCloud}
                  ></ha-switch>
                </ha-settings-row>
              `
            : ""}
          <div class="url-container">
            <div class="textfield-container">
              <ha-textfield
                name="external_url"
                type="url"
                placeholder="https://example.duckdns.org:8123"
                .value=${this._unmaskedExternalUrl ||
                (this._showCustomExternalUrl && canEdit)
                  ? externalUrl
                  : this._obfuscateUrl(externalUrl)}
                @change=${this._handleChange}
                .disabled=${disabled || !this._showCustomExternalUrl}
                .suffix=${
                  // reserve some space for the icon.
                  html`<div style="width: 24px"></div>`
                }
              ></ha-textfield>
              ${!this._showCustomExternalUrl || !canEdit
                ? html`
                    <ha-icon-button
                      class="toggle-unmasked-url"
                      toggles
                      .label=${this.hass.localize(
                        `ui.panel.config.common.${this._unmaskedExternalUrl ? "hide" : "show"}_url`
                      )}
                      @click=${this._toggleUnmaskedExternalUrl}
                      .path=${this._unmaskedExternalUrl ? mdiEyeOff : mdiEye}
                    ></ha-icon-button>
                  `
                : ""}
            </div>
            <ha-button .url=${externalUrl} @click=${this._copyURL}>
              <ha-svg-icon slot="icon" .path=${mdiContentCopy}></ha-svg-icon>
              ${this.hass.localize("ui.panel.config.common.copy_link")}
            </ha-button>
          </div>
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

          <h4>
            ${this.hass.localize("ui.panel.config.url.internal_url_label")}
          </h4>
          <ha-settings-row slim>
            <span slot="heading">
              ${this.hass.localize(
                "ui.panel.config.url.internal_url_automatic"
              )}
            </span>
            <span slot="description">
              ${this.hass.localize(
                "ui.panel.config.url.internal_url_automatic_description"
              )}
            </span>
            <ha-switch
              .disabled=${disabled}
              .checked=${this._cloudChecked}
              @change=${this._toggleCloud}
            ></ha-switch>
          </ha-settings-row>

          <div class="url-container">
            <div class="textfield-container">
              <ha-textfield
                name="internal_url"
                type="url"
                placeholder="http://<some IP address>:8123"
                .value=${this._unmaskedInternalUrl ||
                (this._showCustomInternalUrl && canEdit)
                  ? internalUrl
                  : this._obfuscateUrl(internalUrl)}
                @change=${this._handleChange}
                .disabled=${disabled || !this._showCustomInternalUrl}
                .suffix=${
                  // reserve some space for the icon.
                  html`<div style="width: 24px"></div>`
                }
              ></ha-textfield>
              ${!this._showCustomInternalUrl || !canEdit
                ? html`
                    <ha-icon-button
                      class="toggle-unmasked-url"
                      toggles
                      .label=${this.hass.localize(
                        `ui.panel.config.common.${this._unmaskedInternalUrl ? "hide" : "show"}_url`
                      )}
                      @click=${this._toggleUnmaskedInternalUrl}
                      .path=${this._unmaskedInternalUrl ? mdiEyeOff : mdiEye}
                    ></ha-icon-button>
                  `
                : ""}
            </div>
            <ha-button .url=${internalUrl} @click=${this._copyURL}>
              <ha-svg-icon slot="icon" .path=${mdiContentCopy}></ha-svg-icon>
              ${this.hass.localize("ui.panel.config.common.copy_link")}
            </ha-button>
          </div>
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

    if (isComponentLoaded(this.hass, "cloud")) {
      fetchCloudStatus(this.hass).then((cloudStatus) => {
        this._cloudStatus = cloudStatus;
        if (cloudStatus.logged_in) {
          this._showCustomExternalUrl = !!this.hass.config.external_url;
        } else {
          this._showCustomExternalUrl = true;
        }
      });
    } else {
      this._cloudStatus = null;
    }
    this._fetchUrls();
    this._showCustomInternalUrl = !!this.hass.config.internal_url;
  }

  private get _internalUrlValue() {
    if (this._internal_url && this._showCustomInternalUrl) {
      return this._internal_url;
    }
    return this._urls?.internal ?? "";
  }

  private get _externalUrlValue() {
    if (this._external_url && this._showCustomExternalUrl) {
      return this._external_url;
    }
    if (this._cloudChecked) {
      return this._urls?.cloud ?? "";
    }
    return this._urls?.external ?? "";
  }

  private _toggleCloud(ev) {
    this._cloudChecked = ev.currentTarget.checked;
    this._showCustomExternalUrl = !ev.currentTarget.checked;
  }

  private _toggleInternalAutomatic(ev) {
    this._showCustomInternalUrl = !ev.currentTarget.checked;
  }

  private _toggleUnmaskedInternalUrl() {
    this._unmaskedInternalUrl = !this._unmaskedInternalUrl;
  }

  private _toggleUnmaskedExternalUrl() {
    this._unmaskedExternalUrl = !this._unmaskedExternalUrl;
  }

  private _obfuscateUrl(url: string) {
    // hide any words that look like they might be a hostname or IP address
    return url.replace(/(?<=:\/\/)[\w-]+|(?<=\.)[\w-]+/g, (match) =>
      "•".repeat(match.length)
    );
  }

  private async _copyURL(ev) {
    const url = ev.currentTarget.url;
    await copyToClipboard(url);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
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
          ? this._externalUrlValue || null
          : null,
        internal_url: this._showCustomInternalUrl
          ? this._internalUrlValue || null
          : null,
      });
      await this._fetchUrls();
    } catch (err: any) {
      this._error = err.message || err;
    } finally {
      this._working = false;
    }
  }

  private async _fetchUrls() {
    this._urls = await getNetworkUrls(this.hass);
    this._cloudChecked = this._urls?.cloud === this._urls?.external;
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
    "ha-config-url-form": ConfigUrlForm;
  }
}
