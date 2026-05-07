import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
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
import type { HomeAssistant, Route } from "../../../../../types";

@customElement("matter-options-page")
class MatterOptionsPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @state() private _error?: string;

  private _unsub?: UnsubscribeFunc;

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopRedirect();
  }

  protected render() {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.matter.panel.options_title"
        )}
        back-path="/config/matter/dashboard"
      >
        <div class="container">
          <ha-card>
            ${this._error
              ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
              : nothing}
            <ha-md-list>
              ${canCommissionMatterExternal(this.hass)
                ? html`<ha-md-list-item>
                    <span slot="headline">
                      ${this.hass.localize(
                        "ui.panel.config.matter.panel.mobile_app_commisioning"
                      )}
                    </span>
                    <span slot="supporting-text">
                      ${this.hass.localize(
                        "ui.panel.config.matter.panel.mobile_app_commisioning_description"
                      )}
                    </span>
                    <ha-button
                      appearance="plain"
                      slot="end"
                      size="small"
                      @click=${this._startMobileCommissioning}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.matter.panel.mobile_app_commisioning_action"
                      )}
                    </ha-button>
                  </ha-md-list-item>`
                : nothing}
              <ha-md-list-item>
                <span slot="headline">
                  ${this.hass.localize(
                    "ui.panel.config.matter.panel.commission_device"
                  )}
                </span>
                <span slot="supporting-text">
                  ${this.hass.localize(
                    "ui.panel.config.matter.panel.commission_device_description"
                  )}
                </span>
                <ha-button
                  appearance="plain"
                  slot="end"
                  size="small"
                  @click=${this._commission}
                >
                  ${this.hass.localize(
                    "ui.panel.config.matter.panel.commission_device_action"
                  )}
                </ha-button>
              </ha-md-list-item>
              <ha-md-list-item>
                <span slot="headline">
                  ${this.hass.localize(
                    "ui.panel.config.matter.panel.add_shared_device"
                  )}
                </span>
                <span slot="supporting-text">
                  ${this.hass.localize(
                    "ui.panel.config.matter.panel.add_shared_device_description"
                  )}
                </span>
                <ha-button
                  appearance="plain"
                  slot="end"
                  size="small"
                  @click=${this._acceptSharedDevice}
                >
                  ${this.hass.localize(
                    "ui.panel.config.matter.panel.add_shared_device_action"
                  )}
                </ha-button>
              </ha-md-list-item>
              <ha-md-list-item>
                <span slot="headline">
                  ${this.hass.localize(
                    "ui.panel.config.matter.panel.set_wifi_credentials"
                  )}
                </span>
                <span slot="supporting-text">
                  ${this.hass.localize(
                    "ui.panel.config.matter.panel.set_wifi_credentials_description"
                  )}
                </span>
                <ha-button
                  appearance="plain"
                  slot="end"
                  size="small"
                  @click=${this._setWifi}
                >
                  ${this.hass.localize(
                    "ui.panel.config.matter.panel.set_wifi_credentials_action"
                  )}
                </ha-button>
              </ha-md-list-item>
              <ha-md-list-item>
                <span slot="headline">
                  ${this.hass.localize(
                    "ui.panel.config.matter.panel.set_thread_credentials"
                  )}
                </span>
                <span slot="supporting-text">
                  ${this.hass.localize(
                    "ui.panel.config.matter.panel.set_thread_credentials_description"
                  )}
                </span>
                <ha-button
                  appearance="plain"
                  slot="end"
                  size="small"
                  @click=${this._setThread}
                >
                  ${this.hass.localize(
                    "ui.panel.config.matter.panel.set_thread_credentials_action"
                  )}
                </ha-button>
              </ha-md-list-item>
            </ha-md-list>
          </ha-card>
        </div>
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

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
        }

        ha-card {
          max-width: 600px;
          margin: auto;
        }

        ha-md-list {
          background: none;
          padding: 0;
        }

        ha-md-list-item {
          --md-item-overflow: visible;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-options-page": MatterOptionsPage;
  }
}
