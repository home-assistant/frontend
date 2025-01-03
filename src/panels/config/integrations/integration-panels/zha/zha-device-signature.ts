import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-code-editor";
import type { ZHADevice } from "../../../../../data/zha";
import type { HomeAssistant } from "../../../../../types";

@customElement("zha-device-zigbee-info")
class ZHADeviceZigbeeInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device?: ZHADevice;

  @state() private _signature: any;

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("device") && this.hass && this.device) {
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
    super.updated(changedProperties);
  }

  protected render() {
    if (!this._signature) {
      return nothing;
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
