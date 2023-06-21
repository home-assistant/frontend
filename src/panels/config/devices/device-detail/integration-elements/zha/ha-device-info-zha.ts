import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../../components/ha-expansion-panel";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { fetchZHADevice, ZHADevice } from "../../../../../../data/zha";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";
import { formatAsPaddedHex } from "../../../../integrations/integration-panels/zha/functions";

@customElement("ha-device-info-zha")
export class HaDeviceActionsZha extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  @state() private _zhaDevice?: ZHADevice;

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
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

  protected render() {
    if (!this._zhaDevice) {
      return nothing;
    }
    return html`
      <ha-expansion-panel header="Zigbee info">
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
      </ha-expansion-panel>
    `;
  }

  static get styles(): CSSResultGroup {
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
        ha-expansion-panel {
          --expansion-panel-summary-padding: 0;
          --expansion-panel-content-padding: 0;
          padding-top: 4px;
        }
      `,
    ];
  }
}
