import "../../../components/data-table/ha-data-table";
import "../../../components/entity/ha-state-icon";

import memoizeOne from "memoize-one";

import {
  LitElement,
  html,
  TemplateResult,
  property,
  customElement,
} from "lit-element";
import { HomeAssistant } from "../../../types";
// tslint:disable-next-line
import {
  DataTableColumnContainer,
  RowClickedEvent,
  DataTableRowData,
} from "../../../components/data-table/ha-data-table";
// tslint:disable-next-line
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
import { navigate } from "../../../common/navigate";
import { LocalizeFunc } from "../../../common/translations/localize";

export interface DeviceRowData extends DeviceRegistryEntry {
  device?: DeviceRowData;
  area?: string;
  integration?: string;
  battery_entity?: string;
}

@customElement("ha-devices-data-table")
export class HaDevicesDataTable extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow = false;
  @property() public devices!: DeviceRegistryEntry[];
  @property() public entries!: ConfigEntry[];
  @property() public entities!: EntityRegistryEntry[];
  @property() public areas!: AreaRegistryEntry[];
  @property() public domain!: string;

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
                const battery = device.battery_entity
                  ? this.hass.states[device.battery_entity]
                  : undefined;
                // Have to work on a nice layout for mobile
                return html`
                  ${name}<br />
                  ${device.area} | ${device.integration}<br />
                  ${battery && !isNaN(battery.state as any)
                    ? html`
                        ${battery.state}%
                        <ha-state-icon
                          .hass=${this.hass!}
                          .stateObj=${battery}
                        ></ha-state-icon>
                      `
                    : ""}
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
              direction: "asc",
              grows: true,
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
      <ha-data-table
        .columns=${this._columns(this.narrow)}
        .data=${this._devices(
          this.devices,
          this.entries,
          this.entities,
          this.areas,
          this.domain,
          this.hass.localize
        )}
        .noDataText=${this.hass.localize(
          "ui.panel.config.devices.data_table.no_devices"
        )}
        @row-click=${this._handleRowClicked}
        auto-height
      ></ha-data-table>
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

  private _handleRowClicked(ev: CustomEvent) {
    const deviceId = (ev.detail as RowClickedEvent).id;
    navigate(this, `/config/devices/device/${deviceId}`);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-devices-data-table": HaDevicesDataTable;
  }
}
