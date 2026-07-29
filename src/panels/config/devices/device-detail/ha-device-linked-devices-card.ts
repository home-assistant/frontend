import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeDeviceNameDisplay } from "../../../../common/entity/compute_device_name";
import { caseInsensitiveStringCompare } from "../../../../common/string/compare";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-list-item";
import type { ConfigEntry } from "../../../../data/config_entries";
import type { DeviceRegistryEntry } from "../../../../data/device/device_registry";
import { fetchLinkedDevices } from "../../../../data/device/device_registry";
import { domainToName } from "../../../../data/integration";
import type { HomeAssistant } from "../../../../types";
import { brandsUrl } from "../../../../util/brands-url";

@customElement("ha-device-linked-devices-card")
export class HaDeviceLinkedDevicesCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public deviceId!: string;

  @property({ attribute: false }) public entries!: ConfigEntry[];

  @state() private _linkedDeviceIds: string[] = [];

  private _entryLookup = memoizeOne(
    (entries: ConfigEntry[]): Record<string, ConfigEntry> => {
      const lookup: Record<string, ConfigEntry> = {};
      for (const entry of entries) {
        lookup[entry.entry_id] = entry;
      }
      return lookup;
    }
  );

  private _linkedDevices = memoizeOne(
    (
      linkedDeviceIds: string[],
      devices: Record<string, DeviceRegistryEntry>
    ): DeviceRegistryEntry[] =>
      linkedDeviceIds
        .map((id) => devices[id])
        .filter((device): device is DeviceRegistryEntry => Boolean(device))
        .sort((d1, d2) =>
          caseInsensitiveStringCompare(
            computeDeviceNameDisplay(d1, this.hass.localize, this.hass.states),
            computeDeviceNameDisplay(d2, this.hass.localize, this.hass.states),
            this.hass.locale.language
          )
        )
  );

  protected willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    if (changedProps.has("deviceId")) {
      this._fetchLinkedDevices();
    }
  }

  protected render() {
    const linkedDevices = this._linkedDevices(
      this._linkedDeviceIds,
      this.hass.devices
    );

    if (linkedDevices.length === 0) {
      return nothing;
    }

    const entryLookup = this._entryLookup(this.entries ?? []);

    return html`
      <ha-card>
        <h1 class="card-header">
          ${this.hass.localize("ui.panel.config.devices.linked_devices.heading")}
        </h1>
        <div class="card-content">
          ${this.hass.localize(
            "ui.panel.config.devices.linked_devices.description"
          )}
        </div>
        ${linkedDevices.map((linkedDevice) => {
          const domain = this._deviceDomain(linkedDevice, entryLookup);
          const integrationName = domain
            ? domainToName(this.hass.localize, domain)
            : undefined;
          return html`
            <a href=${`/config/devices/device/${linkedDevice.id}`}>
              <ha-list-item
                graphic=${domain ? "icon" : nothing}
                hasMeta
                .twoline=${!!integrationName}
              >
                ${
                  domain
                    ? html`<img
                        slot="graphic"
                        loading="lazy"
                        alt=""
                        src=${brandsUrl(
                          {
                            domain,
                            type: "icon",
                            darkOptimized: this.hass.themes?.darkMode,
                          },
                          this.hass.auth.data.hassUrl
                        )}
                        crossorigin="anonymous"
                        referrerpolicy="no-referrer"
                      />`
                    : nothing
                }
                ${computeDeviceNameDisplay(
                  linkedDevice,
                  this.hass.localize,
                  this.hass.states
                )}
                ${
                  integrationName
                    ? html`<span slot="secondary">${integrationName}</span>`
                    : nothing
                }
                <ha-icon-next slot="meta"></ha-icon-next>
              </ha-list-item>
            </a>
          `;
        })}
      </ha-card>
    `;
  }

  private _deviceDomain(
    device: DeviceRegistryEntry,
    entryLookup: Record<string, ConfigEntry>
  ): string | undefined {
    const entryId =
      device.primary_config_entry ?? device.config_entries[0] ?? undefined;
    const entry = entryId ? entryLookup[entryId] : undefined;
    return entry?.domain;
  }

  private async _fetchLinkedDevices() {
    const deviceId = this.deviceId;
    if (!deviceId) {
      this._linkedDeviceIds = [];
      return;
    }
    let linkedDeviceIds: string[];
    try {
      linkedDeviceIds = await fetchLinkedDevices(this.hass, deviceId);
    } catch (_err) {
      linkedDeviceIds = [];
    }
    if (this.deviceId !== deviceId) {
      // Device changed while fetching, ignore stale result.
      return;
    }
    this._linkedDeviceIds = linkedDeviceIds;
  }

  static styles = css`
    :host {
      display: block;
    }

    ha-card {
      overflow: hidden;
    }

    .card-header {
      padding-bottom: 0;
    }

    .card-content {
      color: var(--secondary-text-color);
      padding-bottom: var(--ha-space-2);
    }

    a {
      text-decoration: none;
      color: var(--primary-text-color);
    }

    ha-list-item img {
      width: 24px;
      height: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-linked-devices-card": HaDeviceLinkedDevicesCard;
  }
}
