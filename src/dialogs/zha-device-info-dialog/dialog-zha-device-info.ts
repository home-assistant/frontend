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
import "../../panels/config/zha/zha-device-card";

import { PolymerChangedEvent } from "../../polymer-types";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { ZHADeviceInfoDialogParams } from "./show-dialog-zha-device-info";
import { ZHADevice, fetchZHADevice } from "../../data/zha";

@customElement("dialog-zha-device-info")
class DialogZHADeviceInfo extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _params?: ZHADeviceInfoDialogParams;
  @property() private _error?: string;
  @property() private _device?: ZHADevice;

  public async showDialog(params: ZHADeviceInfoDialogParams): Promise<void> {
    this._params = params;
    this._device = await fetchZHADevice(this.hass, params.ieee);
    await this.updateComplete;
    this._dialog.open();
  }

  protected render(): TemplateResult | void {
    if (!this._params || !this._device) {
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
              <zha-device-card
                class="card"
                .hass=${this.hass}
                .device=${this._device}
                @zha-device-removed=${this._onDeviceRemoved}
                .showEntityDetail=${false}
                .showActions="${this._device.device_type !== "Coordinator"}"
              ></zha-device-card>
            `}
      </ha-paper-dialog>
    `;
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!ev.detail.value) {
      this._params = undefined;
      this._error = undefined;
      this._device = undefined;
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
    "dialog-zha-device-info": DialogZHADeviceInfo;
  }
}
