import {
  LitElement,
  html,
  css,
  CSSResult,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "../../components/dialog/ha-paper-dialog";
// Not duplicate, is for typing
// tslint:disable-next-line
import { HaPaperDialog } from "../../components/dialog/ha-paper-dialog";
import "../../panels/config/mqtt/mqtt-device-debug-info-card";

import { PolymerChangedEvent } from "../../polymer-types";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { MQTTDeviceDebugInfoDialogParams } from "./show-dialog-mqtt-device-debug-info";
import { MQTTDeviceDebugInfo, fetchMQTTDebugInfo } from "../../data/mqtt";

@customElement("dialog-mqtt-device-debug-info")
class DialogMQTTDeviceDebugInfo extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _params?: MQTTDeviceDebugInfoDialogParams;
  @property() private _debugInfo?: MQTTDeviceDebugInfo;
  @property() private _error?: string;

  public async showDialog(
    params: MQTTDeviceDebugInfoDialogParams
  ): Promise<void> {
    this._params = params;
    this._debugInfo = await fetchMQTTDebugInfo(this.hass, params.deviceId);
    await this.updateComplete;
    // this._dialog.open();
  }

  protected render(): TemplateResult {
    if (!this._params || !this._debugInfo) {
      return html``;
    }

    return html`
      <ha-paper-dialog
        with-backdrop
        opened
        @opened-changed=${this._openedChanged}
      >
        ${this._error
          ? html`
              <div class="error">${this._error}</div>
            `
          : html`
              <mqtt-device-debug-info-card
                class="card"
                .hass=${this.hass}
                .debugInfo=${this._debugInfo}
                .device=${{}}
                @zha-device-removed=${this._onDeviceRemoved}
                .showEntityDetail=${false}
                .showActions="${true}"
              ></mqtt-device-debug-info-card>
            `}
      </ha-paper-dialog>
    `;
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!ev.detail.value) {
      this._params = undefined;
      this._error = undefined;
      this._debugInfo = undefined;
    }
  }

  private _onDeviceRemoved(): void {
    this._closeDialog();
  }

  private get _dialog(): HaPaperDialog {
    return this.shadowRoot!.querySelector("ha-paper-dialog")!;
  }

  private _closeDialog() {
    this._dialog.close();
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-paper-dialog > * {
          margin: 0;
          display: block;
          padding: 0;
        }
        .card {
          box-sizing: border-box;
          display: flex;
          flex: 1 0 300px;
          min-width: 0;
          max-width: 600px;
          word-wrap: break-word;
        }
        .error {
          color: var(--google-red-500);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-mqtt-device-debug-info": DialogMQTTDeviceDebugInfo;
  }
}
