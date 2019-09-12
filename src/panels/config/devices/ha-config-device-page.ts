import "../../../layouts/hass-subpage";
import "../../../layouts/hass-error-screen";

import "./ha-device-card";
import { property, LitElement, html, customElement } from "lit-element";
import { HomeAssistant } from "../../../types";
import { ConfigEntry } from "../../../data/config_entries";
import { EntityRegistryEntry } from "../../../data/entity_registry";
import {
  DeviceRegistryEntry,
  updateDeviceRegistryEntry,
} from "../../../data/device_registry";
import { AreaRegistryEntry } from "../../../data/area_registry";
import {
  loadDeviceRegistryDetailDialog,
  showDeviceRegistryDetailDialog,
} from "../../../dialogs/device-registry-detail/show-dialog-device-registry-detail";

@customElement("ha-config-device-page")
export class HaConfigDevicePage extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public devices!: DeviceRegistryEntry[];
  @property() public entries!: ConfigEntry[];
  @property() public entities!: EntityRegistryEntry[];
  @property() public areas!: AreaRegistryEntry[];
  @property() public deviceId!: string;

  private get _device(): DeviceRegistryEntry | undefined {
    return this.devices
      ? this.devices.find((device) => device.id === this.deviceId)
      : undefined;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    loadDeviceRegistryDetailDialog();
  }

  protected render() {
    const device = this._device;

    if (!device) {
      return html`
        <hass-error-screen error="Device not found."></hass-error-screen>
      `;
    }

    return html`
      <hass-subpage .header=${device.name_by_user || device.name}>
        <paper-icon-button
          slot="toolbar-icon"
          icon="hass:settings"
          @click=${this._showSettings}
        ></paper-icon-button>
        <ha-device-card
          .hass=${this.hass}
          .areas=${this.areas}
          .devices=${this.devices}
          .device=${device}
          .entities=${this.entities}
        ></ha-device-card>
      </hass-subpage>
    `;
  }

  private _showSettings() {
    showDeviceRegistryDetailDialog(this, {
      device: this._device!,
      updateEntry: async (updates) => {
        await updateDeviceRegistryEntry(this.hass, this._device!.id, updates);
      },
    });
  }
}
