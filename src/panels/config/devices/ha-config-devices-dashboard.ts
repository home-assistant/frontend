import type { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item";
import { mdiCancel, mdiFilterVariant, mdiPlus } from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { navigate } from "../../../common/navigate";
import { LocalizeFunc } from "../../../common/translations/localize";
import { computeRTL } from "../../../common/util/compute_rtl";
import {
  DataTableColumnContainer,
  DataTableRowData,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/entity/ha-battery-icon";
import "../../../components/ha-button-menu";
import "../../../components/ha-check-list-item";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
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
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import "../integrations/ha-integration-overflow-menu";
import { showZWaveJSAddNodeDialog } from "../integrations/integration-panels/zwave_js/show-dialog-zwave_js-add-node";

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

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _showDisabled = false;

  @state() private _filter: string = history.state?.filter || "";

  @state() private _numHiddenDevices = 0;

  private _ignoreLocationChange = false;

  public constructor() {
    super();
    window.addEventListener("location-changed", () => {
      if (this._ignoreLocationChange) {
        this._ignoreLocationChange = false;
        return;
      }
      if (
        window.location.search.substring(1) !== this._searchParms.toString()
      ) {
        this._searchParms = new URLSearchParams(window.location.search);
      }
    });
    window.addEventListener("popstate", () => {
      if (
        window.location.search.substring(1) !== this._searchParms.toString()
      ) {
        this._searchParms = new URLSearchParams(window.location.search);
      }
    });
  }

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

  private _devicesAndFilterDomains = memoizeOne(
    (
      devices: DeviceRegistryEntry[],
      entries: ConfigEntry[],
      entities: EntityRegistryEntry[],
      areas: AreaRegistryEntry[],
      filters: URLSearchParams,
      showDisabled: boolean,
      localize: LocalizeFunc
    ) => {
      // Some older installations might have devices pointing at invalid entryIDs
      // So we guard for that.
      let outputDevices: DeviceRowData[] = devices;

      const deviceLookup: { [deviceId: string]: DeviceRegistryEntry } = {};
      for (const device of devices) {
        deviceLookup[device.id] = device;
      }

      // If nothing gets filtered, this is our correct count of devices
      let startLength = outputDevices.length;

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

      let filterConfigEntry: ConfigEntry | undefined;

      filters.forEach((value, key) => {
        if (key === "config_entry") {
          outputDevices = outputDevices.filter((device) =>
            device.config_entries.includes(value)
          );
          startLength = outputDevices.length;
          filterConfigEntry = entries.find((entry) => entry.entry_id === value);
        }
      });

      if (!showDisabled) {
        outputDevices = outputDevices.filter((device) => !device.disabled_by);
      }

      outputDevices = outputDevices.map((device) => ({
        ...device,
        name: computeDeviceName(
          device,
          this.hass,
          deviceEntityLookup[device.id]
        ),
        model: device.model || "<unknown>",
        manufacturer: device.manufacturer || "<unknown>",
        area:
          device.area_id && areaLookup[device.area_id]
            ? areaLookup[device.area_id].name
            : "—",
        integration: device.config_entries.length
          ? device.config_entries
              .filter((entId) => entId in entryLookup)
              .map(
                (entId) =>
                  localize(`component.${entryLookup[entId].domain}.title`) ||
                  entryLookup[entId].domain
              )
              .join(", ")
          : this.hass.localize(
              "ui.panel.config.devices.data_table.no_integration"
            ),
        battery_entity: [
          this._batteryEntity(device.id, deviceEntityLookup),
          this._batteryChargingEntity(device.id, deviceEntityLookup),
        ],
        battery_level:
          this.hass.states[
            this._batteryEntity(device.id, deviceEntityLookup) || ""
          ]?.state,
      }));

      this._numHiddenDevices = startLength - outputDevices.length;
      return {
        devicesOutput: outputDevices,
        filteredConfigEntry: filterConfigEntry,
      };
    }
  );

  private _columns = memoizeOne(
    (narrow: boolean, showDisabled: boolean): DataTableColumnContainer => {
      const columns: DataTableColumnContainer = narrow
        ? {
            name: {
              title: this.hass.localize(
                "ui.panel.config.devices.data_table.device"
              ),
              sortable: true,
              filterable: true,
              direction: "asc",
              grows: true,
              template: (name, device: DataTableRowData) => html`
                ${name}
                <div class="secondary">
                  ${device.area} | ${device.integration}
                </div>
              `,
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
        filterable: true,
        type: "numeric",
        width: narrow ? "95px" : "15%",
        maxWidth: "95px",
        valueColumn: "battery_level",
        template: (batteryEntityPair: DeviceRowData["battery_entity"]) => {
          const battery =
            batteryEntityPair && batteryEntityPair[0]
              ? this.hass.states[batteryEntityPair[0]]
              : undefined;
          const batteryCharging =
            batteryEntityPair && batteryEntityPair[1]
              ? this.hass.states[batteryEntityPair[1]]
              : undefined;
          const batteryIsBinary =
            battery && computeStateDomain(battery) === "binary_sensor";
          return battery && (batteryIsBinary || !isNaN(battery.state as any))
            ? html`
                ${batteryIsBinary ? "" : battery.state + " %"}
                <ha-battery-icon
                  .hass=${this.hass!}
                  .batteryStateObj=${battery}
                  .batteryChargingStateObj=${batteryCharging}
                ></ha-battery-icon>
              `
            : html`—`;
        },
      };
      if (showDisabled) {
        columns.disabled_by = {
          title: "",
          label: this.hass.localize(
            "ui.panel.config.devices.data_table.disabled_by"
          ),
          type: "icon",
          template: (disabled_by) =>
            disabled_by
              ? html`<div
                  tabindex="0"
                  style="display:inline-block; position: relative;"
                >
                  <ha-svg-icon .path=${mdiCancel}></ha-svg-icon>
                  <paper-tooltip animation-delay="0" position="left">
                    ${this.hass.localize("ui.panel.config.devices.disabled")}
                  </paper-tooltip>
                </div>`
              : "—",
        };
      }
      return columns;
    }
  );

  public willUpdate(changedProps) {
    if (changedProps.has("_searchParms")) {
      if (this._searchParms.get("config_entry")) {
        // If we are requested to show the devices for a given config entry,
        // also show the disabled ones by default.
        this._showDisabled = true;
      }
    }
  }

  protected render(): TemplateResult {
    const { devicesOutput, filteredConfigEntry } =
      this._devicesAndFilterDomains(
        this.devices,
        this.entries,
        this.entities,
        this.areas,
        this._searchParms,
        this._showDisabled,
        this.hass.localize
      );
    const activeFilters = this._activeFilters(
      this.entries,
      this._searchParms,
      this.hass.localize
    );

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .backPath=${this._searchParms.has("historyBack")
          ? undefined
          : "/config"}
        .tabs=${configSections.devices}
        .route=${this.route}
        .activeFilters=${activeFilters}
        .numHidden=${this._numHiddenDevices}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.devices.picker.search"
        )}
        .hiddenLabel=${this.hass.localize(
          "ui.panel.config.devices.picker.filter.hidden_devices",
          "number",
          this._numHiddenDevices
        )}
        .columns=${this._columns(this.narrow, this._showDisabled)}
        .data=${devicesOutput}
        .filter=${this._filter}
        @clear-filter=${this._clearFilter}
        @search-changed=${this._handleSearchChange}
        @row-click=${this._handleRowClicked}
        clickable
        .hasFab=${filteredConfigEntry &&
        (filteredConfigEntry.domain === "zha" ||
          filteredConfigEntry.domain === "zwave_js")}
      >
        <ha-integration-overflow-menu
          .hass=${this.hass}
          slot="toolbar-icon"
        ></ha-integration-overflow-menu>
        ${!filteredConfigEntry
          ? ""
          : filteredConfigEntry.domain === "zwave_js"
          ? html`
              <ha-fab
                slot="fab"
                .label=${this.hass.localize("ui.panel.config.zha.add_device")}
                extended
                ?rtl=${computeRTL(this.hass)}
                @click=${this._showZJSAddDeviceDialog}
              >
                <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
              </ha-fab>
            `
          : filteredConfigEntry.domain === "zha"
          ? html`<a href="/config/zha/add" slot="fab">
              <ha-fab
                .label=${this.hass.localize("ui.panel.config.zha.add_device")}
                extended
                ?rtl=${computeRTL(this.hass)}
              >
                <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
              </ha-fab>
            </a>`
          : html``}
        <ha-button-menu slot="filter-menu" corner="BOTTOM_START" multi>
          <ha-icon-button
            slot="trigger"
            .label=${this.hass!.localize(
              "ui.panel.config.devices.picker.filter.filter"
            )}
            .path=${mdiFilterVariant}
          ></ha-icon-button>
          ${this.narrow && activeFilters?.length
            ? html`<mwc-list-item @click=${this._clearFilter}
                >${this.hass.localize("ui.components.data-table.filtering_by")}
                ${activeFilters.join(", ")}
                <span class="clear">Clear</span></mwc-list-item
              >`
            : ""}
          <ha-check-list-item
            left
            @request-selected=${this._showDisabledChanged}
            .selected=${this._showDisabled}
          >
            ${this.hass!.localize(
              "ui.panel.config.devices.picker.filter.show_disabled"
            )}
          </ha-check-list-item>
        </ha-button-menu>
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
    this._ignoreLocationChange = true;
    navigate(`/config/devices/device/${deviceId}`);
  }

  private _showDisabledChanged(ev: CustomEvent<RequestSelectedDetail>) {
    if (ev.detail.source !== "property") {
      return;
    }
    this._showDisabled = ev.detail.selected;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
    history.replaceState({ filter: this._filter }, "");
  }

  private _clearFilter() {
    if (
      this._activeFilters(this.entries, this._searchParms, this.hass.localize)
    ) {
      navigate(window.location.pathname, { replace: true });
    }
    this._showDisabled = true;
  }

  private _showZJSAddDeviceDialog() {
    const { filteredConfigEntry } = this._devicesAndFilterDomains(
      this.devices,
      this.entries,
      this.entities,
      this.areas,
      this._searchParms,
      this._showDisabled,
      this.hass.localize
    );

    showZWaveJSAddNodeDialog(this, {
      entry_id: filteredConfigEntry!.entry_id,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-button-menu {
          margin-left: 8px;
        }
        .clear {
          color: var(--primary-color);
          padding-left: 8px;
          padding-inline-start: 8px;
          text-transform: uppercase;
          direction: var(--direction);
        }
      `,
      haStyle,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-devices-dashboard": HaConfigDeviceDashboard;
  }
}
