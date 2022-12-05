import "@material/mwc-button";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import {
  acceptSharedMatterDevice,
  commissionMatterDevice,
  matterSetThread,
  matterSetWifi,
} from "../../../../../data/matter";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import "../../../../../components/ha-alert";
import { showPromptDialog } from "../../../../../dialogs/generic/show-dialog-box";

@customElement("matter-config-panel")
export class MatterConfigPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _error?: string;

  private get _canCommissionMatter() {
    return this.hass.auth.external?.config.canCommissionMatter;
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage .narrow=${this.narrow} .hass=${this.hass} header="Matter">
        <div class="content">
          <ha-card header="Matter">
            <div class="card-content">
              ${this._error
                ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
                : ""}
              <ha-alert alert-type="warning"
                >Matter is still in the early phase of development, it is not
                meant to be used in production. This panel is for development
                only.</ha-alert
              >

              You can add Matter devices by commissing them if they are not
              setup yet, or share them from another controller and enter the
              share code.
            </div>
            <div class="card-actions">
              ${this._canCommissionMatter
                ? html`<mwc-button @click=${this._startMobileCommissioning}
                    >Commission device with mobile app</mwc-button
                  >`
                : ""}
              <mwc-button @click=${this._setWifi}
                >Set WiFi Credentials</mwc-button
              >
              <mwc-button @click=${this._setThread}>Set Thread</mwc-button>
              <mwc-button @click=${this._commission}
                >Commission device</mwc-button
              >
              <mwc-button @click=${this._acceptSharedDevice}
                >Add shared device</mwc-button
              >
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _startMobileCommissioning() {
    this.hass.auth.external!.fireMessage({
      type: "matter/commission",
    });
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
    try {
      await commissionMatterDevice(this.hass, code);
    } catch (err: any) {
      this._error = err.message;
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
    try {
      await acceptSharedMatterDevice(this.hass, Number(code));
    } catch (err: any) {
      this._error = err.message;
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
      .content {
        padding: 24px 0 32px;
        max-width: 600px;
        margin: 0 auto;
        direction: ltr;
      }
      ha-card:first-child {
        margin-bottom: 16px;
      }
    `,
  ];
}
