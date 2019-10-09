import "../../../layouts/hass-subpage";
import "./ha-devices-data-table";

import {
  LitElement,
  html,
  TemplateResult,
  property,
  customElement,
  CSSResult,
  css,
} from "lit-element";
import { HomeAssistant } from "../../../types";
// tslint:disable-next-line
import {
  DataTableColumnContainer,
  RowClickedEvent,
  DataTableRowData,
} from "../../../components/data-table/ha-data-table";
// tslint:disable-next-line
import { DeviceRegistryEntry } from "../../../data/device_registry";
import { EntityRegistryEntry } from "../../../data/entity_registry";
import { ConfigEntry } from "../../../data/config_entries";
import { AreaRegistryEntry } from "../../../data/area_registry";

@customElement("ha-config-devices-dashboard")
export class HaConfigDeviceDashboard extends LitElement {
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
          name:
            device.name_by_user ||
            device.name ||
            this._fallbackDeviceName(device.id, deviceEntityLookup) ||
            "No name",
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
            device: {
              title: "Device",
              sortable: true,
              filterKey: "name",
              filterable: true,
              direction: "asc",
              template: (device: DeviceRowData) => {
                const battery = device.battery_entity
                  ? this.hass.states[device.battery_entity]
                  : undefined;
                // Have to work on a nice layout for mobile
                return html`
                  ${device.name_by_user || device.name}<br />
                  ${device.area} | ${device.integration}<br />
                  ${battery
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
            device_name: {
              title: "Device",
              sortable: true,
              filterable: true,
              direction: "asc",
            },
            manufacturer: {
              title: "Manufacturer",
              sortable: true,
              filterable: true,
            },
            model: {
              title: "Model",
              sortable: true,
              filterable: true,
            },
            area: {
              title: "Area",
              sortable: true,
              filterable: true,
            },
            integration: {
              title: "Integration",
              sortable: true,
              filterable: true,
            },
            battery: {
              title: "Battery",
              sortable: true,
              type: "numeric",
              template: (batteryEntity: string) => {
                const battery = batteryEntity
                  ? this.hass.states[batteryEntity]
                  : undefined;
                return battery
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
      <hass-subpage
        header=${this.hass.localize("ui.panel.config.devices.caption")}
      >
        <ha-data-table
          .columns=${this._columns(this.narrow)}
          .data=${this._devices(
            this.devices,
            this.entries,
            this.entities,
            this.areas,
            this.domain,
            this.hass.localize
          ).map((device: DeviceRowData) => {
            // We don't need a lot of this data for mobile view, but kept it for filtering...
            const data: DataTableRowData = {
              device_name: device.name,
              id: device.id,
              manufacturer: device.manufacturer,
              model: device.model,
              area: device.area,
              integration: device.integration,
            };
            if (this.narrow) {
              data.device = device;
              return data;
            }
            data.battery = device.battery_entity;
            return data;
          })}
          @row-click=${this._handleRowClicked}
        ></ha-data-table>
      </hass-subpage>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .content {
        padding: 4px;
      }
      ha-devices-data-table {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-devices-dashboard": HaConfigDeviceDashboard;
  }
}
