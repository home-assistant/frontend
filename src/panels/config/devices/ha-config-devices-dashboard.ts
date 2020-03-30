import "../../../layouts/hass-tabs-subpage-data-table";

import {
  LitElement,
  html,
  TemplateResult,
  property,
  customElement,
} from "lit-element";
import { HomeAssistant, Route } from "../../../types";
import {
  DeviceRegistryEntry,
  computeDeviceName,
  DeviceEntityLookup,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  findBatteryEntity,
} from "../../../data/entity_registry";
import { ConfigEntry } from "../../../data/config_entries";
import { AreaRegistryEntry } from "../../../data/area_registry";
import { configSections } from "../ha-panel-config";
import memoizeOne from "memoize-one";
import { LocalizeFunc } from "../../../common/translations/localize";
import { DeviceRowData } from "./ha-devices-data-table";
import {
  DataTableColumnContainer,
  DataTableRowData,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import { navigate } from "../../../common/navigate";
import { HASSDomEvent } from "../../../common/dom/fire_event";

@customElement("ha-config-devices-dashboard")
export class HaConfigDeviceDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow = false;
  @property() public isWide = false;
  @property() public devices!: DeviceRegistryEntry[];
  @property() public entries!: ConfigEntry[];
  @property() public entities!: EntityRegistryEntry[];
  @property() public areas!: AreaRegistryEntry[];
  @property() public domain!: string;
  @property() public route!: Route;

  private _devices = memoizeOne(
    (
      devices: DeviceRegistryEntry[],
      entries: ConfigEntry[],
      entities: EntityRegistryEntry[],
      areas: AreaRegistryEntry[],
      domain: string,
      localize: LocalizeFunc
    ) => {
      // Some older installations might have devices pointing at invalid entryIDs
      // So we guard for that.

      let outputDevices: DeviceRowData[] = devices;

      const deviceLookup: { [deviceId: string]: DeviceRegistryEntry } = {};
      for (const device of devices) {
        deviceLookup[device.id] = device;
      }

      const deviceEntityLookup: DeviceEntityLookup = {};
      for (const entity of entities) {
        if (!entity.device_id) {
          continue;
        }
        if (!(entity.device_id in deviceEntityLookup)) {
          deviceEntityLookup[entity.device_id] = [];
        }
        deviceEntityLookup[entity.device_id].push(entity);
      }

      const entryLookup: { [entryId: string]: ConfigEntry } = {};
      for (const entry of entries) {
        entryLookup[entry.entry_id] = entry;
      }

      const areaLookup: { [areaId: string]: AreaRegistryEntry } = {};
      for (const area of areas) {
        areaLookup[area.area_id] = area;
      }

      if (domain) {
        outputDevices = outputDevices.filter((device) =>
          device.config_entries.find(
            (entryId) =>
              entryId in entryLookup && entryLookup[entryId].domain === domain
          )
        );
      }

      outputDevices = outputDevices.map((device) => {
        return {
          ...device,
          name: computeDeviceName(
            device,
            this.hass,
            deviceEntityLookup[device.id]
          ),
          model: device.model || "<unknown>",
          manufacturer: device.manufacturer || "<unknown>",
          area: device.area_id ? areaLookup[device.area_id].name : "No area",
          integration: device.config_entries.length
            ? device.config_entries
                .filter((entId) => entId in entryLookup)
                .map(
                  (entId) =>
                    localize(
                      `component.${entryLookup[entId].domain}.config.title`
                    ) || entryLookup[entId].domain
                )
                .join(", ")
            : "No integration",
          battery_entity: this._batteryEntity(device.id, deviceEntityLookup),
        };
      });

      return outputDevices;
    }
  );

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer =>
      narrow
        ? {
            name: {
              title: "Device",
              sortable: true,
              filterable: true,
              direction: "asc",
              grows: true,
              template: (name, device: DataTableRowData) => {
                return html`
                  ${name}
                  <div class="secondary">
                    ${device.area} | ${device.integration}
                  </div>
                `;
              },
            },
            battery_entity: {
              title: this.hass.localize(
                "ui.panel.config.devices.data_table.battery"
              ),
              sortable: true,
              type: "numeric",
              width: "90px",
              template: (batteryEntity: string) => {
                const battery = batteryEntity
                  ? this.hass.states[batteryEntity]
                  : undefined;
                return battery
                  ? html`
                      ${isNaN(battery.state as any) ? "-" : battery.state}%
                      <ha-state-icon
                        .hass=${this.hass!}
                        .stateObj=${battery}
                      ></ha-state-icon>
                    `
                  : html`
                      -
                    `;
              },
            },
          }
        : {
            name: {
              title: this.hass.localize(
                "ui.panel.config.devices.data_table.device"
              ),
              sortable: true,
              filterable: true,
              grows: true,
              direction: "asc",
            },
            manufacturer: {
              title: this.hass.localize(
                "ui.panel.config.devices.data_table.manufacturer"
              ),
              sortable: true,
              filterable: true,
              width: "15%",
            },
            model: {
              title: this.hass.localize(
                "ui.panel.config.devices.data_table.model"
              ),
              sortable: true,
              filterable: true,
              width: "15%",
            },
            area: {
              title: this.hass.localize(
                "ui.panel.config.devices.data_table.area"
              ),
              sortable: true,
              filterable: true,
              width: "15%",
            },
            integration: {
              title: this.hass.localize(
                "ui.panel.config.devices.data_table.integration"
              ),
              sortable: true,
              filterable: true,
              width: "15%",
            },
            battery_entity: {
              title: this.hass.localize(
                "ui.panel.config.devices.data_table.battery"
              ),
              sortable: true,
              type: "numeric",
              width: "15%",
              maxWidth: "90px",
              template: (batteryEntity: string) => {
                const battery = batteryEntity
                  ? this.hass.states[batteryEntity]
                  : undefined;
                return battery && !isNaN(battery.state as any)
                  ? html`
                      ${battery.state}%
                      <ha-state-icon
                        .hass=${this.hass!}
                        .stateObj=${battery}
                      ></ha-state-icon>
                    `
                  : html`
                      -
                    `;
              },
            },
          }
  );

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .tabs=${configSections.integrations}
        .route=${this.route}
        .columns=${this._columns(this.narrow)}
        .data=${this._devices(
          this.devices,
          this.entries,
          this.entities,
          this.areas,
          this.domain,
          this.hass.localize
        )}
        @row-click=${this._handleRowClicked}
      >
      </hass-tabs-subpage-data-table>
    `;
  }

  private _batteryEntity(
    deviceId: string,
    deviceEntityLookup: DeviceEntityLookup
  ): string | undefined {
    const batteryEntity = findBatteryEntity(
      this.hass,
      deviceEntityLookup[deviceId] || []
    );
    return batteryEntity ? batteryEntity.entity_id : undefined;
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const deviceId = ev.detail.id;
    navigate(this, `/config/devices/device/${deviceId}`);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-devices-dashboard": HaConfigDeviceDashboard;
  }
}
