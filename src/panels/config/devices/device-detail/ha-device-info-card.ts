import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { computeDeviceNameDisplay } from "../../../../common/entity/compute_device_name";
import { titleCase } from "../../../../common/string/title-case";
import "../../../../components/ha-card";
import type { DeviceRegistryEntry } from "../../../../data/device_registry";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { createSearchParam } from "../../../../common/url/search-params";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";

@customElement("ha-device-info-card")
export class HaDeviceCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @property({ type: Boolean }) public narrow = false;

  protected render(): TemplateResult {
    return html`
      <ha-card
        outlined
        .header=${this.hass.localize("ui.panel.config.devices.device_info", {
          type: this.hass.localize(
            `ui.panel.config.devices.type.${
              this.device.entry_type || "device"
            }_heading`
          ),
        })}
      >
        <div class="card-content">
          ${this.device.model
            ? html`<div class="model">
                ${this.device.model}
                ${this.device.model_id ? html`(${this.device.model_id})` : ""}
              </div>`
            : this.device.model_id
              ? html`<div class="model">${this.device.model_id}</div>`
              : ""}
          ${this.device.manufacturer
            ? html`
                <div class="manuf">
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.manuf",
                    { manufacturer: this.device.manufacturer }
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
                      >${this._computeDeviceNameDislay(
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
                    { version: this.device.sw_version }
                  )}
                </div>
              `
            : ""}
          ${this.device.hw_version
            ? html`
                <div class="extra-info">
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.hardware",
                    { version: this.device.hw_version }
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
                ${type === "bluetooth" &&
                isComponentLoaded(this.hass, "bluetooth")
                  ? html`${titleCase(type)}:
                      <a
                        href="/config/bluetooth/advertisement-monitor?${createSearchParam(
                          { address: value }
                        )}"
                        >${value.toUpperCase()}</a
                      >`
                  : type === "mac" && isComponentLoaded(this.hass, "dhcp")
                    ? html`MAC:
                        <a
                          href="/config/dhcp?${createSearchParam({
                            mac_address: value,
                          })}"
                          >${value.toUpperCase()}</a
                        >`
                    : html`${type === "mac" ? "MAC" : titleCase(type)}:
                      ${value.toUpperCase()}`}
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
      (conn) => conn[0] === "mac" || conn[0] === "bluetooth" || conn[0] === "zigbee"
    );
  }

  private _computeDeviceNameDislay(deviceId) {
    const device = this.hass.devices[deviceId];
    return device
      ? computeDeviceNameDisplay(device, this.hass)
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
