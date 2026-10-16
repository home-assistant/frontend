import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../../components/ha-expansion-panel";
import type { DeviceRegistryEntry } from "../../../../../../data/device/device_registry";
import type { LoRaWANDevice } from "../../../../../../data/lorawan";
import { subscribeLoRaWANDevices } from "../../../../../../data/lorawan";
import { SubscribeMixin } from "../../../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../../../types";
import "../../../../integrations/integration-panels/lorawan/lorawan-device-details";

@customElement("ha-device-info-lorawan")
export class HaDeviceInfoLoRaWAN extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public device!: DeviceRegistryEntry;
  @state() private _devices: LoRaWANDevice[] = [];

  protected hassSubscribe() {
    return [
      subscribeLoRaWANDevices(this.hass.connection, ({ devices }) => {
        this._devices = devices;
      }),
    ];
  }

  protected render() {
    const device = this._devices.find(
      (candidate) => candidate.device_id === this.device.id
    );
    return device
      ? html`<ha-expansion-panel
          .header=${this.hass.localize("ui.panel.config.lorawan.device_info")}
          ><lorawan-device-details .device=${device}></lorawan-device-details
        ></ha-expansion-panel>`
      : nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-info-lorawan": HaDeviceInfoLoRaWAN;
  }
}
