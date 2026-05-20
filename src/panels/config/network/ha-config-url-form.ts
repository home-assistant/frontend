import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { isIPAddress } from "../../../common/string/is_ip_address";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-md-list-item";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
import type { HaInput } from "../../../components/input/ha-input";
import "../../../components/input/ha-input-copy";
import type { HaInputCopy } from "../../../components/input/ha-input-copy";
import type { CloudStatus } from "../../../data/cloud";
import { fetchCloudStatus } from "../../../data/cloud";
import { saveCoreConfig } from "../../../data/core";
import { getNetworkUrls, type NetworkUrls } from "../../../data/network";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";
import { obfuscateUrl } from "../../../util/url";

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

  @state() private _cloudChecked = false;

  @query('[data-name="external_url"]')
  private _externalUrlField?: HaInputCopy;

  @query('[data-name="internal_url"]')
  private _internalUrlField?: HaInputCopy;

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
            : nothing}
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing}

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
                <ha-md-list-item>
                  <span slot="headline"
                    >${this.hass.localize(
                      "ui.panel.config.url.external_use_ha_cloud"
                    )}</span
                  >
                  <ha-switch
                    slot="end"
                    .disabled=${disabled}
                    .checked=${this._cloudChecked}
                    @change=${this._toggleCloud}
                  ></ha-switch>
                </ha-md-list-item>
              `
            : nothing}
          <div class="url-container">
            <ha-input-copy
              auto-validate
              .validationMessage=${this.hass.localize(
                "ui.panel.config.url.invalid_url"
              )}
              data-name="external_url"
              type="url"
              .maskedToggle=${!(this._showCustomExternalUrl && canEdit)}
              placeholder="https://example.duckdns.org:8123"
              .value=${externalUrl}
              .maskedValue=${this._showCustomExternalUrl && canEdit
                ? undefined
                : obfuscateUrl(externalUrl)}
              @change=${this._handleChange}
              .readonly=${!this._showCustomExternalUrl}
              .disabled=${disabled}
            >
            </ha-input-copy>
          </div>
          ${hasCloud || !isComponentLoaded(this.hass.config, "cloud")
            ? nothing
            : html`
                <ha-alert alert-type="info">
                  ${this.hass.localize(
                    "ui.panel.config.url.external_get_ha_cloud"
                  )}
                  <ha-button
                    size="small"
                    href="/config/cloud/register"
                    slot="action"
                  >
                    <span class="no-wrap"
                      >${this.hass.localize(
                        "ui.panel.config.cloud.register.start_trial"
                      )}</span
                    >
                  </ha-button>
                </ha-alert>
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
            : nothing}

          <h4>
            ${this.hass.localize("ui.panel.config.url.internal_url_label")}
          </h4>
          <ha-md-list-item>
            <span slot="headline"
              >${this.hass.localize(
                "ui.panel.config.url.internal_url_automatic"
              )}</span
            >
            <span slot="supporting-text"
              >${this.hass.localize(
                "ui.panel.config.url.internal_url_automatic_description"
              )}</span
            >
            <ha-switch
              slot="end"
              .disabled=${disabled}
              .checked=${!this._showCustomInternalUrl}
              @change=${this._toggleInternalAutomatic}
            ></ha-switch>
          </ha-md-list-item>

          <div class="url-container">
            <ha-input-copy
              auto-validate
              .validationMessage=${this.hass.localize(
                "ui.panel.config.url.invalid_url"
              )}
              data-name="internal_url"
              .maskedToggle=${!(this._showCustomInternalUrl && canEdit)}
              type="url"
              placeholder=${this.hass.localize(
                "ui.panel.config.url.internal_url_placeholder"
              )}
              .value=${internalUrl}
              .maskedValue=${this._showCustomInternalUrl && canEdit
                ? undefined
                : obfuscateUrl(internalUrl)}
              @change=${this._handleChange}
              .readonly=${!this._showCustomInternalUrl}
              .disabled=${disabled}
            >
            </ha-input-copy>
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
              : nothing
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

  protected override firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);

    if (isComponentLoaded(this.hass.config, "cloud")) {
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

  private _handleChange(ev: InputEvent) {
    const target = ev.currentTarget as HaInputCopy;
    const input = ev.composedPath()[0] as HaInput;
    this[`_${target.dataset.name}`] = input.value || "";
  }

  private async _save() {
    if (
      this._externalUrlField?.reportValidity() === false ||
      this._internalUrlField?.reportValidity() === false
    ) {
      return;
    }
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
      margin: 16px calc(var(--ha-space-4) * -1);
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

    ha-input-copy {
      flex: 1;
    }

    ha-md-list-item {
      --md-list-item-top-space: 0;
      --md-list-item-bottom-space: 0;
      --md-list-item-leading-space: 0;
      --md-list-item-trailing-space: 0;
      --md-list-item-two-line-container-height: 48px;
    }

    .no-wrap {
      white-space: nowrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-url-form": ConfigUrlForm;
  }
}
