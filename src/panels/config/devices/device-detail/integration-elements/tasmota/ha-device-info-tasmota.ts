import {
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
  css,
  PropertyValues,
} from "lit-element";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";
import {
  TasmotaDevice,
  fetchTasmotaDevice,
} from "../../../../../../data/tasmota";

@customElement("ha-device-info-tasmota")
export class HaDeviceActionsTasmota extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  @internalProperty() private _tasmotaDevice?: TasmotaDevice;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("device")) {
      fetchTasmotaDevice(this.hass, this.device.id).then((device) => {
        this._tasmotaDevice = device;
      });
    }
  }

  protected render(): TemplateResult {
    if (!this._tasmotaDevice) {
      return html``;
    }
    return html`
      <h4>Tasmota info</h4>
      <div>IP: ${this._tasmotaDevice.ip}</div>
      <div>MAC: ${this._tasmotaDevice.mac}</div>
      <div>
        RSSI:
        ${this._tasmotaDevice.rssi ||
        this.hass!.localize("ui.dialogs.tasmota_device_info.unknown")}
      </div>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        h4 {
          margin-bottom: 4px;
        }
        div {
          word-break: break-all;
          margin-top: 2px;
        }
      `,
    ];
  }
}
