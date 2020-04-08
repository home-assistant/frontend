import {
  LitElement,
  html,
  CSSResult,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import "../../components/ha-code-editor";
import "../../components/ha-dialog";

import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { ZHADeviceZigbeeInfoDialogParams } from "./show-dialog-zha-device-zigbee-info";

@customElement("dialog-zha-device-zigbee-info")
class DialogZHADeviceZigbeeInfo extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _signature: any;

  public async showDialog(
    params: ZHADeviceZigbeeInfoDialogParams
  ): Promise<void> {
    this._signature = JSON.stringify(
      {
        ...params.device.signature,
        manufacturer: params.device.manufacturer,
        model: params.device.model,
      },
      null,
      2
    );
  }

  protected render(): TemplateResult {
    if (!this._signature) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        hideActions
        @closing="${this._close}"
        .heading=${this.hass.localize(
          `ui.dialogs.zha_device_info.device_signature`
        )}
      >
        <ha-code-editor mode="yaml" .value=${this._signature}> </ha-code-editor>
      </ha-dialog>
    `;
  }

  private _close(): void {
    this._signature = undefined;
  }

  static get styles(): CSSResult {
    return haStyleDialog;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zha-device-zigbee-info": DialogZHADeviceZigbeeInfo;
  }
}
