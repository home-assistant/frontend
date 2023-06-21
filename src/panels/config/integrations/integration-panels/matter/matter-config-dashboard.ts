import "@material/mwc-button";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-card";
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
import { HomeAssistant } from "../../../../../types";

@customElement("matter-config-dashboard")
export class MatterConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

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
              <a href="/config/thread" slot="toolbar-icon">
                <mwc-button>Visit Thread Panel</mwc-button>
              </a>
            `
          : ""}
        <div class="content">
          <ha-card header="Matter">
            <ha-alert alert-type="warning"
              >Matter is still in the early phase of development, it is not
              meant to be used in production. This panel is for development
              only.</ha-alert
            >
            <div class="card-content">
              ${this._error
                ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
                : ""}
              You can add Matter devices by commissing them if they are not
              setup yet, or share them from another controller and enter the
              share code.
            </div>
            <div class="card-actions">
              ${canCommissionMatterExternal(this.hass)
                ? html`<mwc-button @click=${this._startMobileCommissioning}
                    >Commission device with mobile app</mwc-button
                  >`
                : ""}
              <mwc-button @click=${this._commission}
                >Commission device</mwc-button
              >
              <mwc-button @click=${this._acceptSharedDevice}
                >Add shared device</mwc-button
              >
              <mwc-button @click=${this._setWifi}
                >Set WiFi Credentials</mwc-button
              >
              <mwc-button @click=${this._setThread}
                >Set Thread Credentials</mwc-button
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
      title: "Network name",
      inputLabel: "Network name",
      inputType: "string",
      confirmText: "Continue",
    });
    if (!networkName) {
      return;
    }
    const psk = await showPromptDialog(this, {
      title: "Passcode",
      inputLabel: "Code",
      inputType: "password",
      confirmText: "Set Wifi",
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
      title: "Commission device",
      inputLabel: "Code",
      inputType: "string",
      confirmText: "Commission",
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
      title: "Add shared device",
      inputLabel: "Pin",
      inputType: "number",
      confirmText: "Accept device",
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
      title: "Set Thread operation",
      inputLabel: "Dataset",
      inputType: "string",
      confirmText: "Set Thread",
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
