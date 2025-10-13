import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiContentCopy, mdiEyeOff, mdiEye } from "@mdi/js";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { isIPAddress } from "../../../common/string/is_ip_address";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-switch";
import "../../../components/ha-textfield";
import "../../../components/ha-settings-row";
import "../../../components/ha-button";
import type { HaTextField } from "../../../components/ha-textfield";
import type { CloudStatus } from "../../../data/cloud";
import { fetchCloudStatus } from "../../../data/cloud";
import { saveCoreConfig } from "../../../data/core";
import { getNetworkUrls, type NetworkUrls } from "../../../data/network";
import type { ValueChangedEvent, HomeAssistant } from "../../../types";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import { showToast } from "../../../util/toast";
import type { HaSwitch } from "../../../components/ha-switch";
import { obfuscateUrl } from "../../../util/url";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";

@customElement("ha-config-url-form")
class ConfigUrlForm extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: string;

  @state() private _working = false;

  @state() private _urls?: NetworkUrls;

  @state() private _external_url = "";

  @state() private _internal_url = "";

  @state() private _cloudStatus?: CloudStatus | null;

  @state() private _showCustomExternalUrl = false;

  @state() private _showCustomInternalUrl = false;

  @state() private _unmaskedExternalUrl = false;

  @state() private _unmaskedInternalUrl = false;

  @state() private _cloudChecked = false;

  protected hassSubscribe() {
    return [
      this.hass.connection.subscribeEvents(() => {
        // update the data when the urls are updated in core
        this._fetchUrls();
      }, "core_config_updated"),
    ];
  }

  protected render() {
    const canEdit = ["storage", "default"].includes(
      this.hass.config.config_source
    );
    const disabled = this._working || !canEdit;

    if (this._cloudStatus === undefined || this._urls === undefined) {
      return nothing;
    }

    const internalUrl = this._showCustomInternalUrl
      ? this._internal_url
      : this._urls?.internal || "";
    const externalUrl = this._showCustomExternalUrl
      ? this._external_url
      : (this._cloudChecked ? this._urls?.cloud : this._urls?.external) || "";

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
                <ha-alert>
                  ${this.hass.localize(
                    "ui.panel.config.core.section.core.core_config.edit_requires_storage"
                  )}
                </ha-alert>
              `
            : ""}
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}

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
                  : obfuscateUrl(externalUrl)}
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
                      .label=${this.hass.localize(
                        `ui.panel.config.common.${this._unmaskedExternalUrl ? "hide" : "show"}_url`
                      )}
                      @click=${this._toggleUnmaskedExternalUrl}
                      .path=${this._unmaskedExternalUrl ? mdiEyeOff : mdiEye}
                    ></ha-icon-button>
                  `
                : nothing}
            </div>
            <ha-button
              size="small"
              appearance="plain"
              .url=${externalUrl}
              @click=${this._copyURL}
            >
              <ha-svg-icon slot="start" .path=${mdiContentCopy}></ha-svg-icon>
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
                        <ha-button
                          size="small"
                          appearance="plain"
                          href="/config/cloud"
                          slot="action"
                        >
                          ${this.hass.localize(
                            "ui.panel.config.url.enable_remote"
                          )}
                        </ha-button>
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
              .checked=${!this._showCustomInternalUrl}
              @change=${this._toggleInternalAutomatic}
            ></ha-switch>
          </ha-settings-row>

          <div class="url-container">
            <div class="textfield-container">
              <ha-textfield
                name="internal_url"
                type="url"
                placeholder=${this.hass.localize(
                  "ui.panel.config.url.internal_url_placeholder"
                )}
                .value=${this._unmaskedInternalUrl ||
                (this._showCustomInternalUrl && canEdit)
                  ? internalUrl
                  : obfuscateUrl(internalUrl)}
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
                      .label=${this.hass.localize(
                        `ui.panel.config.common.${this._unmaskedInternalUrl ? "hide" : "show"}_url`
                      )}
                      @click=${this._toggleUnmaskedInternalUrl}
                      .path=${this._unmaskedInternalUrl ? mdiEyeOff : mdiEye}
                    ></ha-icon-button>
                  `
                : nothing}
            </div>
            <ha-button
              size="small"
              appearance="plain"
              .url=${internalUrl}
              @click=${this._copyURL}
            >
              <ha-svg-icon slot="start" .path=${mdiContentCopy}></ha-svg-icon>
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
          <ha-button @click=${this._save} .disabled=${disabled}>
            ${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.save_button"
            )}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  protected override firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    if (isComponentLoaded(this.hass, "cloud")) {
      fetchCloudStatus(this.hass).then((cloudStatus) => {
        this._cloudStatus = cloudStatus;
        this._showCustomExternalUrl = !(
          this._cloudStatus.logged_in && !this.hass.config.external_url
        );
      });
    } else {
      this._cloudStatus = null;
    }
    this._fetchUrls();
  }

  private _toggleCloud(ev: Event) {
    this._cloudChecked = (ev.currentTarget as HaSwitch).checked;
    this._showCustomExternalUrl = !this._cloudChecked;
  }

  private _toggleInternalAutomatic(ev: Event) {
    this._showCustomInternalUrl = !(ev.currentTarget as HaSwitch).checked;
  }

  private _toggleUnmaskedInternalUrl() {
    this._unmaskedInternalUrl = !this._unmaskedInternalUrl;
  }

  private _toggleUnmaskedExternalUrl() {
    this._unmaskedExternalUrl = !this._unmaskedExternalUrl;
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
    this[`_${target.name}`] = target.value || "";
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

  private async _fetchUrls() {
    this._urls = await getNetworkUrls(this.hass);
    this._cloudChecked =
      this._urls?.cloud === this._urls?.external &&
      !this.hass.config.external_url;
    this._showCustomInternalUrl = !!this.hass.config.internal_url;
    this._showCustomExternalUrl = !(
      this._cloudStatus?.logged_in && !this.hass.config.external_url
    );
    this._internal_url = this._urls?.internal ?? "";
    this._external_url = this._urls?.external ?? "";
  }

  static styles = css`
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

    ha-alert {
      display: block;
      margin: 16px 0;
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
      gap: var(--ha-space-2);
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

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-url-form": ConfigUrlForm;
  }
}
