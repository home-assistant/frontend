import {
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../../../components/ha-code-editor";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZHADeviceZigbeeInfoDialogParams } from "./show-dialog-zha-device-zigbee-info";

@customElement("dialog-zha-device-zigbee-info")
class DialogZHADeviceZigbeeInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _signature: any;

  public async showDialog(
    params: ZHADeviceZigbeeInfoDialogParams
  ): Promise<void> {
    this._signature = JSON.stringify(
      {
        ...params.device.signature,
        manufacturer: params.device.manufacturer,
        model: params.device.model,
        class: params.device.quirk_class,
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
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(`ui.dialogs.zha_device_info.device_signature`)
        )}
      >
        <ha-code-editor mode="yaml" readonly .value=${this._signature}>
        </ha-code-editor>
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
