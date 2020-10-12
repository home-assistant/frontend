import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import { LocalizeFunc } from "../../../common/translations/localize";
import {
  DataTableColumnContainer,
  DataTableRowData,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/entity/ha-battery-icon";
import { AreaRegistryEntry } from "../../../data/area_registry";
import { ConfigEntry } from "../../../data/config_entries";
import {
  computeDeviceName,
  DeviceEntityLookup,
  DeviceRegistryEntry,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  findBatteryChargingEntity,
  findBatteryEntity,
} from "../../../data/entity_registry";
import { domainToName } from "../../../data/integration";
import "../../../layouts/hass-tabs-subpage-data-table";
import { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";

interface DeviceRowData extends DeviceRegistryEntry {
  device?: DeviceRowData;
  area?: string;
  integration?: string;
  battery_entity?: [string | undefined, string | undefined];
}

@customElement("ha-config-devices-dashboard")
export class HaConfigDeviceDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow = false;

  @property() public isWide = false;

  @property() public devices!: DeviceRegistryEntry[];

  @property() public entries!: ConfigEntry[];

  @property() public entities!: EntityRegistryEntry[];

  @property() public areas!: AreaRegistryEntry[];

  @property() public route!: Route;

  @internalProperty() private _searchParms = new URLSearchParams(
    window.location.search
  );

  private _activeFilters = memoizeOne(
    (
      entries: ConfigEntry[],
      filters: URLSearchParams,
      localize: LocalizeFunc
    ): string[] | undefined => {
      const filterTexts: string[] = [];
      filters.forEach((value, key) => {
        switch (key) {
          case "config_entry": {
            const configEntry = entries.find(
              (entry) => entry.entry_id === value
            );
            if (!configEntry) {
              break;
            }
            const integrationName = domainToName(localize, configEntry.domain);
            filterTexts.push(
              `${this.hass.localize(
                "ui.panel.config.integrations.integration"
              )} "${integrationName}${
                integrationName !== configEntry.title
                  ? `: ${configEntry.title}`
                  : ""
              }"`
            );
            break;
          }
        }
      });
      return filterTexts.length ? filterTexts : undefined;
    }
  );

  private _devices = memoizeOne(
    (
      devices: DeviceRegistryEntry[],
      entries: ConfigEntry[],
      entities: EntityRegistryEntry[],
      areas: AreaRegistryEntry[],
      filters: URLSearchParams,
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

      filters.forEach((value, key) => {
        switch (key) {
          case "config_entry":
            outputDevices = outputDevices.filter((device) =>
              device.config_entries.includes(value)
            );
            break;
        }
      });

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
          area: device.area_id
            ? areaLookup[device.area_id].name
            : this.hass.localize("ui.panel.config.devices.data_table.no_area"),
          integration: device.config_entries.length
            ? device.config_entries
                .filter((entId) => entId in entryLookup)
                .map(
                  (entId) =>
                    localize(`component.${entryLookup[entId].domain}.title`) ||
                    entryLookup[entId].domain
                )
                .join(", ")
            : "No integration",
          battery_entity: [
            this._batteryEntity(device.id, deviceEntityLookup),
            this._batteryChargingEntity(device.id, deviceEntityLookup),
          ],
        };
      });

      return outputDevices;
    }
  );

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer => {
      const columns: DataTableColumnContainer = narrow
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
          };

      columns.manufacturer = {
        title: this.hass.localize(
          "ui.panel.config.devices.data_table.manufacturer"
        ),
        sortable: true,
        hidden: narrow,
        filterable: true,
        width: "15%",
      };
      columns.model = {
        title: this.hass.localize("ui.panel.config.devices.data_table.model"),
        sortable: true,
        hidden: narrow,
        filterable: true,
        width: "15%",
      };
      columns.area = {
        title: this.hass.localize("ui.panel.config.devices.data_table.area"),
        sortable: true,
        hidden: narrow,
        filterable: true,
        width: "15%",
      };
      columns.integration = {
        title: this.hass.localize(
          "ui.panel.config.devices.data_table.integration"
        ),
        sortable: true,
        hidden: narrow,
        filterable: true,
        width: "15%",
      };
      columns.battery_entity = {
        title: this.hass.localize("ui.panel.config.devices.data_table.battery"),
        sortable: true,
        type: "numeric",
        width: narrow ? "90px" : "15%",
        maxWidth: "90px",
        template: (batteryEntityPair: DeviceRowData["battery_entity"]) => {
          const battery =
            batteryEntityPair && batteryEntityPair[0]
              ? this.hass.states[batteryEntityPair[0]]
              : undefined;
          const batteryCharging =
            batteryEntityPair && batteryEntityPair[1]
              ? this.hass.states[batteryEntityPair[1]]
              : undefined;
          return battery && !isNaN(battery.state as any)
            ? html`
                ${battery.state}%
                <ha-battery-icon
                  .hass=${this.hass!}
                  .batteryStateObj=${battery}
                  .batteryChargingStateObj=${batteryCharging}
                ></ha-battery-icon>
              `
            : html` - `;
        },
      };
      return columns;
    }
  );

  public constructor() {
    super();
    window.addEventListener("location-changed", () => {
      this._searchParms = new URLSearchParams(window.location.search);
    });
    window.addEventListener("popstate", () => {
      this._searchParms = new URLSearchParams(window.location.search);
    });
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .backPath=${this._searchParms.has("historyBack")
          ? undefined
          : "/config"}
        .tabs=${configSections.integrations}
        .route=${this.route}
        .columns=${this._columns(this.narrow)}
        .data=${this._devices(
          this.devices,
          this.entries,
          this.entities,
          this.areas,
          this._searchParms,
          this.hass.localize
        )}
        .activeFilters=${this._activeFilters(
          this.entries,
          this._searchParms,
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

  private _batteryChargingEntity(
    deviceId: string,
    deviceEntityLookup: DeviceEntityLookup
  ): string | undefined {
    const batteryChargingEntity = findBatteryChargingEntity(
      this.hass,
      deviceEntityLookup[deviceId] || []
    );
    return batteryChargingEntity ? batteryChargingEntity.entity_id : undefined;
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
