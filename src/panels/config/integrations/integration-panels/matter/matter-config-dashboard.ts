import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-card";
import "../../../../../components/ha-button";
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
import type { HomeAssistant } from "../../../../../types";

@customElement("matter-config-dashboard")
export class MatterConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _error?: string;

  private _unsub?: UnsubscribeFunc;

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopRedirect();
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage .narrow=${this.narrow} .hass=${this.hass} header="Matter">
        ${isComponentLoaded(this.hass, "otbr")
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
          : ""}
        <div class="content">
          <ha-card header="Matter">
            <ha-alert alert-type="warning"
              >${this.hass.localize(
                "ui.panel.config.matter.panel.experimental_note"
              )}</ha-alert
            >
            <div class="card-content">
              ${this._error
                ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
                : ""}
              ${this.hass.localize("ui.panel.config.matter.panel.add_devices")}
            </div>
            <div class="card-actions">
              ${canCommissionMatterExternal(this.hass)
                ? html`<ha-button
                    appearance="plain"
                    @click=${this._startMobileCommissioning}
                    >${this.hass.localize(
                      "ui.panel.config.matter.panel.mobile_app_commisioning"
                    )}</ha-button
                  >`
                : ""}
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

  static styles = [
    haStyle,
    css`
      ha-alert[alert-type="warning"] {
        position: relative;
        top: -16px;
      }
      .content {
        padding: 24px 0 32px;
        max-width: 600px;
        margin: 0 auto;
        direction: ltr;
      }
      ha-card:first-child {
        margin-bottom: 16px;
      }
      a[slot="toolbar-icon"] {
        text-decoration: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-config-dashboard": MatterConfigDashboard;
  }
}
