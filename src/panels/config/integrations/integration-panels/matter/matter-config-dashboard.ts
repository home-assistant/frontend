import { mdiAlertCircle, mdiCheckCircle, mdiPlus } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-expansion-panel";
import "../../../../../components/ha-fab";
import "../../../../../components/ha-svg-icon";
import type { ConfigEntry } from "../../../../../data/config_entries";
import { getConfigEntries } from "../../../../../data/config_entries";
import type { HomeAssistant } from "../../../../../types";
import {
  acceptSharedMatterDevice,
  canCommissionMatterExternal,
  commissionMatterDevice,
  matterSetThread,
  matterSetWifi,
  redirectOnNewMatterDevice,
  startExternalCommissioning,
} from "../../../../../data/matter";
import { showPromptDialog } from "../../../../../dialogs/generic/show-dialog-box";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";

@customElement("matter-config-dashboard")
export class MatterConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _configEntry?: ConfigEntry;

  @state() private _error?: string;

  private _unsub?: UnsubscribeFunc;

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopRedirect();
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this._fetchConfigEntry();
    }
  }

  private _matterDeviceCount = memoizeOne(
    (devices: HomeAssistant["devices"]): number =>
      Object.values(devices).filter((device) =>
        device.identifiers.some((identifier) => identifier[0] === "matter")
      ).length
  );

  protected render(): TemplateResult | typeof nothing {
    if (!this._configEntry) {
      return nothing;
    }
    const isOnline = this._configEntry.state === "loaded";
    return html`
      <hass-subpage
        .narrow=${this.narrow}
        .hass=${this.hass}
        header="Matter"
        has-fab
      >
        ${isComponentLoaded(this.hass, "thread")
          ? html`
              <ha-button
                appearance="plain"
                size="small"
                href="/config/thread"
                slot="toolbar-icon"
              >
                ${this.hass.localize(
                  "ui.panel.config.matter.panel.thread_panel"
                )}</ha-button
              >
            `
          : nothing}
        <div class="container">
          <ha-card class="network-status">
            <div class="card-content">
              <div class="heading">
                <div class="icon">
                  <ha-svg-icon
                    .path=${isOnline ? mdiCheckCircle : mdiAlertCircle}
                    class=${isOnline ? "online" : "offline"}
                  ></ha-svg-icon>
                </div>
                <div class="details">
                  Matter
                  ${this.hass.localize(
                    "ui.panel.config.matter.panel.status_title"
                  )}:
                  ${this.hass.localize(
                    `ui.panel.config.matter.panel.status_${isOnline ? "online" : "offline"}`
                  )}<br />
                  <small>
                    ${this.hass.localize(
                      "ui.panel.config.matter.panel.devices",
                      { count: this._matterDeviceCount(this.hass.devices) }
                    )}
                  </small>
                </div>
              </div>
            </div>
            <div class="card-actions">
              <ha-button
                href=${`/config/devices/dashboard?historyBack=1&config_entry=${this._configEntry?.entry_id}`}
                appearance="plain"
                size="small"
              >
                ${this.hass.localize("ui.panel.config.devices.caption")}
              </ha-button>
              <ha-button
                appearance="plain"
                size="small"
                href=${`/config/entities/dashboard?historyBack=1&config_entry=${this._configEntry?.entry_id}`}
              >
                ${this.hass.localize("ui.panel.config.entities.caption")}
              </ha-button>
            </div>
          </ha-card>
          <ha-expansion-panel
            outlined
            .header=${this.hass.localize(
              "ui.panel.config.matter.panel.developer_tools_title"
            )}
            .secondary=${this.hass.localize(
              "ui.panel.config.matter.panel.developer_tools_description"
            )}
          >
            ${this._error
              ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
              : nothing}
            <div class="dev-tools-content">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.matter.panel.developer_tools_info"
                )}
              </p>
              <div class="dev-tools-actions">
                ${canCommissionMatterExternal(this.hass)
                  ? html`<ha-button
                      appearance="plain"
                      @click=${this._startMobileCommissioning}
                      >${this.hass.localize(
                        "ui.panel.config.matter.panel.mobile_app_commisioning"
                      )}</ha-button
                    >`
                  : nothing}
                <ha-button appearance="plain" @click=${this._commission}
                  >${this.hass.localize(
                    "ui.panel.config.matter.panel.commission_device"
                  )}</ha-button
                >
                <ha-button appearance="plain" @click=${this._acceptSharedDevice}
                  >${this.hass.localize(
                    "ui.panel.config.matter.panel.add_shared_device"
                  )}</ha-button
                >
                <ha-button appearance="plain" @click=${this._setWifi}
                  >${this.hass.localize(
                    "ui.panel.config.matter.panel.set_wifi_credentials"
                  )}</ha-button
                >
                <ha-button appearance="plain" @click=${this._setThread}
                  >${this.hass.localize(
                    "ui.panel.config.matter.panel.set_thread_credentials"
                  )}</ha-button
                >
              </div>
            </div>
          </ha-expansion-panel>
        </div>

        <a href="/config/matter/add" slot="fab">
          <ha-fab
            .label=${this.hass.localize(
              "ui.panel.config.matter.panel.add_device"
            )}
            extended
          >
            <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
          </ha-fab>
        </a>
      </hass-subpage>
    `;
  }

  private _redirectOnNewMatterDevice() {
    if (this._unsub) {
      return;
    }
    this._unsub = redirectOnNewMatterDevice(this.hass, () => {
      this._unsub = undefined;
    });
  }

  private _stopRedirect() {
    this._unsub?.();
    this._unsub = undefined;
  }

  private _startMobileCommissioning() {
    this._redirectOnNewMatterDevice();
    startExternalCommissioning(this.hass);
  }

  private async _setWifi(): Promise<void> {
    this._error = undefined;
    const networkName = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.matter.panel.prompts.network_name.title"
      ),
      inputLabel: this.hass.localize(
        "ui.panel.config.matter.panel.prompts.network_name.input_label"
      ),
      inputType: "string",
      confirmText: this.hass.localize(
        "ui.panel.config.matter.panel.prompts.network_name.confirm"
      ),
    });
    if (!networkName) {
      return;
    }
    const psk = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.matter.panel.prompts.passcode.title"
      ),
      inputLabel: this.hass.localize(
        "ui.panel.config.matter.panel.prompts.passcode.input_label"
      ),
      inputType: "password",
      confirmText: this.hass.localize(
        "ui.panel.config.matter.panel.prompts.passcode.confirm"
      ),
    });
    if (!psk) {
      return;
    }
    try {
      await matterSetWifi(this.hass, networkName, psk);
    } catch (err: any) {
      this._error = err.message;
    }
  }

  private async _commission(): Promise<void> {
    const code = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.matter.panel.prompts.commission_device.title"
      ),
      inputLabel: this.hass.localize(
        "ui.panel.config.matter.panel.prompts.commission_device.input_label"
      ),
      inputType: "string",
      confirmText: this.hass.localize(
        "ui.panel.config.matter.panel.prompts.commission_device.confirm"
      ),
    });
    if (!code) {
      return;
    }
    this._error = undefined;
    this._redirectOnNewMatterDevice();
    try {
      await commissionMatterDevice(this.hass, code);
    } catch (err: any) {
      this._error = err.message;
      this._stopRedirect();
    }
  }

  private async _acceptSharedDevice(): Promise<void> {
    const code = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.matter.panel.prompts.add_shared_device.title"
      ),
      inputLabel: this.hass.localize(
        "ui.panel.config.matter.panel.prompts.add_shared_device.input_label"
      ),
      inputType: "number",
      confirmText: this.hass.localize(
        "ui.panel.config.matter.panel.prompts.add_shared_device.confirm"
      ),
    });
    if (!code) {
      return;
    }
    this._error = undefined;
    this._redirectOnNewMatterDevice();
    try {
      await acceptSharedMatterDevice(this.hass, Number(code));
    } catch (err: any) {
      this._error = err.message;
      this._stopRedirect();
    }
  }

  private async _setThread(): Promise<void> {
    const code = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.matter.panel.prompts.set_thread.title"
      ),
      inputLabel: this.hass.localize(
        "ui.panel.config.matter.panel.prompts.set_thread.input_label"
      ),
      inputType: "string",
      confirmText: this.hass.localize(
        "ui.panel.config.matter.panel.prompts.set_thread.confirm"
      ),
    });
    if (!code) {
      return;
    }
    this._error = undefined;
    try {
      await matterSetThread(this.hass, code);
    } catch (err: any) {
      this._error = err.message;
    }
  }

  private async _fetchConfigEntry(): Promise<void> {
    const configEntries = await getConfigEntries(this.hass, {
      domain: "matter",
    });
    this._configEntry = configEntries.find(
      (entry) => entry.disabled_by === null && entry.source !== "ignore"
    );
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          margin: auto;
          margin-top: var(--ha-space-4);
          max-width: 500px;
        }

        ha-card .card-actions {
          display: flex;
          justify-content: flex-end;
        }

        .network-status div.heading {
          display: flex;
          align-items: center;
        }

        .network-status div.heading .icon {
          margin-inline-end: var(--ha-space-4);
        }

        .network-status div.heading ha-svg-icon {
          --mdc-icon-size: 48px;
        }

        .network-status div.heading .details {
          font-size: var(--ha-font-size-xl);
        }

        .network-status small {
          font-size: var(--ha-font-size-m);
        }

        .network-status .online {
          color: var(--state-on-color, var(--success-color));
        }

        .network-status .offline {
          color: var(--error-color, var(--error-color));
        }

        .container {
          padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
        }

        ha-expansion-panel {
          margin: auto;
          margin-top: var(--ha-space-4);
          max-width: 500px;
          background: var(--card-background-color);
          border-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
          --expansion-panel-summary-padding: var(--ha-space-2) var(--ha-space-4);
          --expansion-panel-content-padding: 0 var(--ha-space-4);
        }

        .dev-tools-content {
          padding: var(--ha-space-3) 0;
        }

        .dev-tools-content p {
          margin: 0 0 var(--ha-space-4);
          color: var(--primary-text-color);
        }

        .dev-tools-actions {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--ha-space-2);
        }

        a[slot="toolbar-icon"] {
          text-decoration: none;
        }

        a[slot="fab"] {
          text-decoration: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-config-dashboard": MatterConfigDashboard;
  }
}
