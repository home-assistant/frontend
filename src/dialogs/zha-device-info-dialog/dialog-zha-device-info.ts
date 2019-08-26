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
import "../../panels/config/zha/zha-device-card";

import { PolymerChangedEvent } from "../../polymer-types";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { ZHADeviceInfoDialogParams } from "./show-dialog-zha-device-info";
import { ZHADevice, fetchZHADevice } from "../../data/zha";
import { ZHADeviceRemovedEvent } from "../../panels/config/zha/types";

@customElement("dialog-zha-device-info")
class DialogZHADeviceInfo extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _params?: ZHADeviceInfoDialogParams;
  @property() private _error?: string;
  @property() private _device!: ZHADevice;

  public async showDialog(params: ZHADeviceInfoDialogParams): Promise<void> {
    this._params = params;
    this._device = await fetchZHADevice(this.hass, params.ieee);
    await this.updateComplete;
  }

  protected render(): TemplateResult | void {
    if (!this._params || !this._device) {
      return html``;
    }

    return html`
      <ha-paper-dialog
        with-backdrop
        opened
        @opened-changed="${this._openedChanged}"
      >
        <h2>
          ${this._device.user_given_name
            ? this._device.user_given_name
            : this._device.name}
        </h2>
        <paper-dialog-scrollable>
          <zha-device-card
            class="card"
            .hass="${this.hass}"
            .device="${this._device}"
            .narrow="${false}"
            .showHelp="${false}"
            .showActions="${true}"
            @zha-device-removed="${this._onDeviceRemoved}"
            .isJoinPage="${false}"
          ></zha-device-card>
          ${this._error
            ? html`
                <div class="error">${this._error}</div>
              `
            : ""}
        </paper-dialog-scrollable>
      </ha-paper-dialog>
    `;
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!(ev.detail as any).value) {
      this._params = undefined;
      this._error = undefined;
    }
  }

  private _onDeviceRemoved(event: ZHADeviceRemovedEvent): void {}

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-paper-dialog {
          min-width: 400px;
        }
        .card {
          box-sizing: border-box;
          display: flex;
          flex: 1 0 300px;
          min-width: 0;
          max-width: 600px;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
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
