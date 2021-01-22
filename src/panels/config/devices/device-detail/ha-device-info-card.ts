import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { AreaRegistryEntry } from "../../../../data/area_registry";
import {
  computeDeviceName,
  DeviceRegistryEntry,
} from "../../../../data/device_registry";
import { HomeAssistant } from "../../../../types";
import { loadDeviceRegistryDetailDialog } from "../device-registry-detail/show-dialog-device-registry-detail";

@customElement("ha-device-info-card")
export class HaDeviceCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  @property() public devices!: DeviceRegistryEntry[];

  @property() public areas!: AreaRegistryEntry[];

  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-card
        .header=${this.hass.localize("ui.panel.config.devices.device_info")}
      >
        <div class="card-content">
          ${this.device.model
            ? html` <div class="model">${this.device.model}</div> `
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
        <slot name="actions"></slot>
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
