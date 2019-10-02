import {
  property,
  LitElement,
  html,
  customElement,
  css,
  CSSResult,
} from "lit-element";

import memoizeOne from "memoize-one";

import "../../../layouts/hass-subpage";
import "../../../layouts/hass-error-screen";
import "../ha-config-section";

import "./device-detail/ha-device-triggers-card";
import "./device-detail/ha-device-conditions-card";
import "./device-detail/ha-device-actions-card";
import "./device-detail/ha-device-entities-card";
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
  @property() public narrow!: boolean;

  private _device = memoizeOne(
    (
      deviceId: string,
      devices: DeviceRegistryEntry[]
    ): DeviceRegistryEntry | undefined =>
      devices ? devices.find((device) => device.id === deviceId) : undefined
  );

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    loadDeviceRegistryDetailDialog();
  }

  protected render() {
    const device = this._device(this.deviceId, this.devices);

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
        <ha-config-section .isWide=${!this.narrow}>
          <span slot="header">Device info</span>
          <span slot="introduction">
            Here are all the details of your device.
          </span>
          <ha-device-card
            .hass=${this.hass}
            .areas=${this.areas}
            .devices=${this.devices}
            .device=${device}
            .entities=${this.entities}
            hide-settings
            hide-entities
          ></ha-device-card>

          <div class="header">Entities</div>
          <ha-device-entities-card
            .hass=${this.hass}
            .deviceId=${this.deviceId}
            .entities=${this.entities}
          >
          </ha-device-entities-card>

          <div class="header">Automations</div>
          <ha-device-triggers-card
            .hass=${this.hass}
            .deviceId=${this.deviceId}
          ></ha-device-triggers-card>
          <ha-device-conditions-card
            .hass=${this.hass}
            .deviceId=${this.deviceId}
          ></ha-device-conditions-card>
          <ha-device-actions-card
            .hass=${this.hass}
            .deviceId=${this.deviceId}
          ></ha-device-actions-card>
        </ha-config-section>
      </hass-subpage>
    `;
  }

  private _showSettings() {
    showDeviceRegistryDetailDialog(this, {
      device: this._device(this.deviceId, this.devices)!,
      updateEntry: async (updates) => {
        await updateDeviceRegistryEntry(this.hass, this.deviceId, updates);
      },
    });
  }

  static get styles(): CSSResult {
    return css`
      .header {
        font-family: var(--paper-font-display1_-_font-family);
        -webkit-font-smoothing: var(
          --paper-font-display1_-_-webkit-font-smoothing
        );
        font-size: var(--paper-font-display1_-_font-size);
        font-weight: var(--paper-font-display1_-_font-weight);
        letter-spacing: var(--paper-font-display1_-_letter-spacing);
        line-height: var(--paper-font-display1_-_line-height);
        opacity: var(--dark-primary-opacity);
      }

      ha-config-section *:last-child {
        padding-bottom: 24px;
      }
    `;
  }
}
