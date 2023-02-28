import "@material/mwc-list/mwc-list-item";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { caseInsensitiveStringCompare } from "../../../../common/string/compare";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-next";
import {
  computeDeviceName,
  DeviceRegistryEntry,
} from "../../../../data/device_registry";
import type { HomeAssistant } from "../../../../types";

const MAX_VISIBLE_VIA_DEVICES = 10;

@customElement("ha-device-via-devices-card")
export class HaDeviceViaDevicesCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public deviceId!: string;

  @state() public _showAll = false;

  private _viaDevices = memoizeOne(
    (
      deviceId: string,
      devices: Record<string, DeviceRegistryEntry>
    ): DeviceRegistryEntry[] =>
      Object.values(devices)
        .filter((device) => device.via_device_id === deviceId)
        .sort((d1, d2) =>
          caseInsensitiveStringCompare(
            computeDeviceName(d1, this.hass),
            computeDeviceName(d2, this.hass),
            this.hass.locale.language
          )
        )
  );

  protected render() {
    const viaDevices = this._viaDevices(this.deviceId, this.hass.devices);

    if (viaDevices.length === 0) {
      return nothing;
    }

    return html`
      <ha-card>
        <h1 class="card-header">
          ${this.hass.localize(
            "ui.panel.config.devices.connected_devices.heading"
          )}
        </h1>
        ${(this._showAll
          ? viaDevices
          : viaDevices.slice(0, MAX_VISIBLE_VIA_DEVICES)
        ).map(
          (viaDevice) => html`
            <a href=${`/config/devices/device/${viaDevice.id}`}>
              <mwc-list-item hasMeta>
                ${computeDeviceName(viaDevice, this.hass)}
                <ha-icon-next slot="meta"></ha-icon-next>
              </mwc-list-item>
            </a>
          `
        )}
        ${!this._showAll && viaDevices.length > MAX_VISIBLE_VIA_DEVICES
          ? html`
              <button class="show-more" @click=${this._toggleShowAll}>
                ${this.hass.localize(
                  "ui.panel.config.devices.connected_devices.show_more",
                  "count",
                  viaDevices.length - MAX_VISIBLE_VIA_DEVICES
                )}
              </button>
            `
          : ""}
      </ha-card>
    `;
  }

  private _toggleShowAll() {
    this._showAll = !this._showAll;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }

      .card-header {
        padding-bottom: 0;
      }

      a {
        text-decoration: none;
        color: var(--primary-text-color);
      }

      button.show-more {
        color: var(--primary-color);
        text-align: left;
        cursor: pointer;
        background: none;
        border-width: initial;
        border-style: none;
        border-color: initial;
        border-image: initial;
        padding: 16px;
        font: inherit;
      }
      button.show-more:focus {
        outline: none;
        text-decoration: underline;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-via-devices-card": HaDeviceViaDevicesCard;
  }
}
