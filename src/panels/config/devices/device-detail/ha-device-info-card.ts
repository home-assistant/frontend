import {
  DeviceRegistryEntry,
  computeDeviceName,
} from "../../../../data/device_registry";
import { loadDeviceRegistryDetailDialog } from "../../../../dialogs/device-registry-detail/show-dialog-device-registry-detail";
import {
  LitElement,
  html,
  customElement,
  property,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";
import { HomeAssistant } from "../../../../types";
import { AreaRegistryEntry } from "../../../../data/area_registry";

@customElement("ha-device-info-card")
export class HaDeviceCard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public device!: DeviceRegistryEntry;
  @property() public devices!: DeviceRegistryEntry[];
  @property() public areas!: AreaRegistryEntry[];
  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-card header="Device info">
        <div class="card-content">
          ${this.device.model
            ? html`
                <div class="model">${this.device.model}</div>
              `
            : ""}
          ${this.device.manufacturer
            ? html`
                <div class="manuf">
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.manuf",
                    "manufacturer",
                    this.device.manufacturer
                  )}
                </div>
              `
            : ""}
          ${this.device.via_device_id
            ? html`
                <div class="extra-info">
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.via"
                  )}
                  <span class="hub"
                    >${this._computeDeviceName(
                      this.devices,
                      this.device.via_device_id
                    )}</span
                  >
                </div>
              `
            : ""}
          ${this.device.sw_version
            ? html`
                <div class="extra-info">
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.firmware",
                    "version",
                    this.device.sw_version
                  )}
                </div>
              `
            : ""}
          <slot></slot>
        </div>
      </ha-card>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    loadDeviceRegistryDetailDialog();
  }

  private _computeDeviceName(devices, deviceId) {
    const device = devices.find((dev) => dev.id === deviceId);
    return device
      ? computeDeviceName(device, this.hass)
      : `(${this.hass.localize(
          "ui.panel.config.integrations.config_entry.device_unavailable"
        )})`;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
      }
      ha-card {
        flex: 1 0 100%;
        padding-bottom: 10px;
        min-width: 0;
      }
      .device {
        width: 30%;
      }
      .area {
        color: var(--primary-text-color);
      }
      .extra-info {
        margin-top: 8px;
      }
      .manuf,
      .entity-id,
      .model {
        color: var(--secondary-text-color);
      }
    `;
  }
}
