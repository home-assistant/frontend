import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeDeviceNameDisplay } from "../../../../common/entity/compute_device_name";
import { getDeviceArea } from "../../../../common/entity/context/get_device_context";
import { caseInsensitiveStringCompare } from "../../../../common/string/compare";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-list-item";
import { fullEntitiesContext } from "../../../../data/context";
import type { DeviceRegistryEntry } from "../../../../data/device/device_registry";
import type { EntityRegistryEntry } from "../../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../../types";

const MAX_VISIBLE_VIA_DEVICES = 10;

@customElement("ha-device-via-devices-card")
export class HaDeviceViaDevicesCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public deviceId!: string;

  @state() public _showAll = false;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg: EntityRegistryEntry[] = [];

  private _entityCounts = memoizeOne(
    (entities: EntityRegistryEntry[]): Record<string, number> => {
      const counts: Record<string, number> = {};
      for (const entity of entities) {
        if (entity.device_id) {
          counts[entity.device_id] = (counts[entity.device_id] ?? 0) + 1;
        }
      }
      return counts;
    }
  );

  private _viaDevices = memoizeOne(
    (
      deviceId: string,
      devices: Record<string, DeviceRegistryEntry>
    ): DeviceRegistryEntry[] =>
      Object.values(devices)
        .filter((device) => device.via_device_id === deviceId)
        .sort((d1, d2) =>
          caseInsensitiveStringCompare(
            computeDeviceNameDisplay(d1, this.hass.localize, this.hass.states),
            computeDeviceNameDisplay(d2, this.hass.localize, this.hass.states),
            this.hass.locale.language
          )
        )
  );

  protected render() {
    const viaDevices = this._viaDevices(this.deviceId, this.hass.devices);

    if (viaDevices.length === 0) {
      return nothing;
    }

    const entityCounts = this._entityCounts(this._entityReg);

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
        ).map((viaDevice) => {
          const area = getDeviceArea(
            viaDevice,
            this.hass.areas,
            this.hass.devices
          );
          const entityCount = entityCounts[viaDevice.id] ?? 0;
          const secondary = [
            area?.name,
            entityCount
              ? this.hass.localize(
                  "ui.panel.config.common.quick_links.entities",
                  { count: entityCount }
                )
              : undefined,
          ]
            .filter(Boolean)
            .join(" • ");
          return html`
            <a href=${`/config/devices/device/${viaDevice.id}`}>
              <ha-list-item hasMeta .twoline=${!!secondary}>
                ${computeDeviceNameDisplay(
                  viaDevice,
                  this.hass.localize,
                  this.hass.states
                )}
                ${
                  secondary
                    ? html`<span slot="secondary">${secondary}</span>`
                    : nothing
                }
                <ha-icon-next slot="meta"></ha-icon-next>
              </ha-list-item>
            </a>
          `;
        })}
        ${
          !this._showAll && viaDevices.length > MAX_VISIBLE_VIA_DEVICES
            ? html`
                <button class="show-more" @click=${this._toggleShowAll}>
                  ${this.hass.localize(
                    "ui.panel.config.devices.connected_devices.show_more",
                    { count: viaDevices.length - MAX_VISIBLE_VIA_DEVICES }
                  )}
                </button>
              `
            : ""
        }
      </ha-card>
    `;
  }

  private _toggleShowAll() {
    this._showAll = !this._showAll;
  }

  static styles = css`
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

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-via-devices-card": HaDeviceViaDevicesCard;
  }
}
