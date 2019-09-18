import "@polymer/paper-tooltip/paper-tooltip";
import "@material/mwc-button";
import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";

import "../../../components/ha-card";
import "../../../components/ha-data-table";
import "../../../components/entity/ha-state-icon";
import "../../../layouts/hass-subpage";
import "../../../resources/ha-style";
import "../../../components/ha-icon-next";

import "../ha-config-section";

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
  DataTabelColumnContainer,
  RowClickedEvent,
  DataTabelRowData,
} from "../../../components/ha-data-table";
// tslint:disable-next-line
import { DeviceRegistryEntry } from "../../../data/device_registry";
import { EntityRegistryEntry } from "../../../data/entity_registry";
import { ConfigEntry } from "../../../data/config_entries";
import { AreaRegistryEntry } from "../../../data/area_registry";
import { navigate } from "../../../common/navigate";
import { LocalizeFunc } from "../../../common/translations/localize";
import computeStateName from "../../../common/entity/compute_state_name";

interface DeviceRowData extends DeviceRegistryEntry {
  device?: DeviceRowData;
  area?: string;
  integration?: string;
  battery_entity?: string;
}

interface DeviceEntityLookup {
  [deviceId: string]: EntityRegistryEntry[];
}

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
    (narrow: boolean): DataTabelColumnContainer =>
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
            const data: DataTabelRowData = {
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

  private _batteryEntity(
    deviceId: string,
    deviceEntityLookup: DeviceEntityLookup
  ): string | undefined {
    const batteryEntity = (deviceEntityLookup[deviceId] || []).find(
      (entity) =>
        this.hass.states[entity.entity_id] &&
        this.hass.states[entity.entity_id].attributes.device_class === "battery"
    );

    return batteryEntity ? batteryEntity.entity_id : undefined;
  }

  private _fallbackDeviceName(
    deviceId: string,
    deviceEntityLookup: DeviceEntityLookup
  ): string | undefined {
    for (const entity of deviceEntityLookup[deviceId] || []) {
      const stateObj = this.hass.states[entity.entity_id];
      if (stateObj) {
        return computeStateName(stateObj);
      }
    }

    return undefined;
  }

  private _handleRowClicked(ev: CustomEvent) {
    const deviceId = (ev.detail as RowClickedEvent).id;
    navigate(this, `/config/devices/device/${deviceId}`);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-devices-dashboard": HaConfigDeviceDashboard;
  }
}
