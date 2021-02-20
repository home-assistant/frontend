import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { fetchZHADevice, ZHADevice } from "../../../../../../data/zha";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";
import { formatAsPaddedHex } from "../../../../integrations/integration-panels/zha/functions";

@customElement("ha-device-info-zha")
export class HaDeviceActionsZha extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  @internalProperty() private _zhaDevice?: ZHADevice;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("device")) {
      const zigbeeConnection = this.device.connections.find(
        (conn) => conn[0] === "zigbee"
      );
      if (!zigbeeConnection) {
        return;
      }
      fetchZHADevice(this.hass, zigbeeConnection[1]).then((device) => {
        this._zhaDevice = device;
      });
    }
  }

  protected render(): TemplateResult {
    if (!this._zhaDevice) {
      return html``;
    }
    return html`
      <h4>Zigbee info</h4>
      <div>IEEE: ${this._zhaDevice.ieee}</div>
      <div>Nwk: ${formatAsPaddedHex(this._zhaDevice.nwk)}</div>
      <div>Device Type: ${this._zhaDevice.device_type}</div>
      <div>
        LQI:
        ${this._zhaDevice.lqi ||
        this.hass!.localize("ui.dialogs.zha_device_info.unknown")}
      </div>
      <div>
        RSSI:
        ${this._zhaDevice.rssi ||
        this.hass!.localize("ui.dialogs.zha_device_info.unknown")}
      </div>
      <div>
        ${this.hass!.localize("ui.dialogs.zha_device_info.last_seen")}:
        ${this._zhaDevice.last_seen ||
        this.hass!.localize("ui.dialogs.zha_device_info.unknown")}
      </div>
      <div>
        ${this.hass!.localize("ui.dialogs.zha_device_info.power_source")}:
        ${this._zhaDevice.power_source ||
        this.hass!.localize("ui.dialogs.zha_device_info.unknown")}
      </div>
      ${this._zhaDevice.quirk_applied
        ? html`
            <div>
              ${this.hass!.localize("ui.dialogs.zha_device_info.quirk")}:
              ${this._zhaDevice.quirk_class}
            </div>
          `
        : ""}
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
