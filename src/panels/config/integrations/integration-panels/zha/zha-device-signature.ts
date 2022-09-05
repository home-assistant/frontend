import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-code-editor";
import { ZHADevice } from "../../../../../data/zha";
import { HomeAssistant } from "../../../../../types";

@customElement("zha-device-zigbee-info")
class ZHADeviceZigbeeInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device: ZHADevice | undefined;

  @state() private _signature: any;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.hass && this.device) {
      this._signature = JSON.stringify(
        {
          ...this.device.signature,
          manufacturer: this.device.manufacturer,
          model: this.device.model,
          class: this.device.quirk_class,
        },
        null,
        2
      );
    }
  }

  protected render(): TemplateResult {
    if (!this._signature) {
      return html``;
    }

    return html`
      <ha-code-editor mode="yaml" readOnly .value=${this._signature} dir="ltr">
      </ha-code-editor>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-device-zigbee-info": ZHADeviceZigbeeInfo;
  }
}
