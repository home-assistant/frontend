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

const MAX_VISIBLE_CHILD_DEVICES = 10;

@customElement("ha-device-child-devices-card")
export class HaDeviceChildDevicesCard extends LitElement {
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

  private _childDevices = memoizeOne(
    (
      deviceId: string,
      devices: Record<string, DeviceRegistryEntry>
    ): DeviceRegistryEntry[] =>
      Object.values(devices)
        .filter((device) => device.parent_device_id === deviceId)
        .sort((d1, d2) =>
          caseInsensitiveStringCompare(
            computeDeviceNameDisplay(d1, this.hass.localize, this.hass.states),
            computeDeviceNameDisplay(d2, this.hass.localize, this.hass.states),
            this.hass.locale.language
          )
        )
  );

  protected render() {
    const childDevices = this._childDevices(this.deviceId, this.hass.devices);

    if (childDevices.length === 0) {
      return nothing;
    }

    const entityCounts = this._entityCounts(this._entityReg);

    return html`
      <ha-card>
        <h1 class="card-header">
          ${this.hass.localize("ui.panel.config.devices.child_devices.heading")}
        </h1>
        ${(this._showAll
          ? childDevices
          : childDevices.slice(0, MAX_VISIBLE_CHILD_DEVICES)
        ).map((childDevice) => {
          const area = getDeviceArea(childDevice, this.hass.areas);
          const entityCount = entityCounts[childDevice.id] ?? 0;
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
            <a href=${`/config/devices/device/${childDevice.id}`}>
              <ha-list-item hasMeta .twoline=${!!secondary}>
                ${computeDeviceNameDisplay(
                  childDevice,
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
          !this._showAll && childDevices.length > MAX_VISIBLE_CHILD_DEVICES
            ? html`
                <button class="show-more" @click=${this._toggleShowAll}>
                  ${this.hass.localize(
                  "ui.panel.config.devices.child_devices.show_more",
                  { count: childDevices.length - MAX_VISIBLE_CHILD_DEVICES }
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
    "ha-device-child-devices-card": HaDeviceChildDevicesCard;
  }
}
