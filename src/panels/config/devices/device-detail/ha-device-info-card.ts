import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-card";
import { AreaRegistryEntry } from "../../../../data/area_registry";
import {
  computeDeviceName,
  DeviceRegistryEntry,
} from "../../../../data/device_registry";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { loadDeviceRegistryDetailDialog } from "../device-registry-detail/show-dialog-device-registry-detail";
import { titleCase } from "../../../../common/string/title-case";

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
        outlined
        .header=${this.hass.localize(
          "ui.panel.config.devices.device_info",
          "type",
          this.hass.localize(
            `ui.panel.config.devices.type.${
              this.device.entry_type || "device"
            }_heading`
          )
        )}
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
                    ><a
                      href="/config/devices/device/${this.device.via_device_id}"
                      >${this._computeDeviceName(
                        this.devices,
                        this.device.via_device_id
                      )}</a
                    ></span
                  >
                </div>
              `
            : ""}
          ${this.device.sw_version
            ? html`
                <div class="extra-info">
                  ${this.hass.localize(
                    `ui.panel.config.integrations.config_entry.${
                      this.device.entry_type === "service" &&
                      !this.device.hw_version
                        ? "version"
                        : "firmware"
                    }`,
                    "version",
                    this.device.sw_version
                  )}
                </div>
              `
            : ""}
          ${this.device.hw_version
            ? html`
                <div class="extra-info">
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.hardware",
                    "version",
                    this.device.hw_version
                  )}
                </div>
              `
            : ""}
          ${this.device.serial_number
            ? html`
                <div class="extra-info">
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.serial_number",
                    { serial_number: this.device.serial_number }
                  )}
                </div>
              `
            : ""}
          ${this._getAddresses().map(
            ([type, value]) => html`
              <div class="extra-info">
                ${type === "mac" ? "MAC" : titleCase(type)}:
                ${value.toUpperCase()}
              </div>
            `
          )}
          <slot></slot>
        </div>
        <slot name="actions"></slot>
      </ha-card>
    `;
  }

  protected _getAddresses() {
    return this.device.connections.filter(
      (conn) => conn[0] === "mac" || conn[0] === "bluetooth"
    );
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    loadDeviceRegistryDetailDialog();
  }

  private _computeDeviceName(devices, deviceId) {
    const device = devices.find((dev) => dev.id === deviceId);
    return device
      ? computeDeviceName(device, this.hass)
      : `<${this.hass.localize(
          "ui.panel.config.integrations.config_entry.unknown_via_device"
        )}>`;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
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
          word-wrap: break-word;
        }
        .manuf,
        .model {
          color: var(--secondary-text-color);
          word-wrap: break-word;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-info-card": HaDeviceCard;
  }
}
