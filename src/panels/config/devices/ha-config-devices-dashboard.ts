import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import type { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item";
import { mdiCancel, mdiFilterVariant, mdiPlus } from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import {
  PROTOCOL_INTEGRATIONS,
  protocolIntegrationPicked,
} from "../../../common/integrations/protocolIntegrationPicked";
import { navigate } from "../../../common/navigate";
import { LocalizeFunc } from "../../../common/translations/localize";
import { computeRTL } from "../../../common/util/compute_rtl";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/entity/ha-battery-icon";
import "../../../components/ha-button-menu";
import "../../../components/ha-check-list-item";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import { AreaRegistryEntry } from "../../../data/area_registry";
import { ConfigEntry, sortConfigEntries } from "../../../data/config_entries";
import {
  DeviceEntityLookup,
  DeviceRegistryEntry,
  computeDeviceName,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  findBatteryChargingEntity,
  findBatteryEntity,
} from "../../../data/entity_registry";
import { IntegrationManifest, domainToName } from "../../../data/integration";
import "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { configSections } from "../ha-panel-config";
import "../integrations/ha-integration-overflow-menu";
import { showAddIntegrationDialog } from "../integrations/show-add-integration-dialog";

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

  @property() public manifests!: IntegrationManifest[];

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
          case "domain": {
            filterTexts.push(
              `${this.hass.localize(
                "ui.panel.config.integrations.integration"
              )} "${domainToName(localize, value)}"`
            );
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
      manifests: IntegrationManifest[],
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

      const manifestLookup: { [domain: string]: IntegrationManifest } = {};
      for (const manifest of manifests) {
        manifestLookup[manifest.domain] = manifest;
      }

      let filterConfigEntry: ConfigEntry | undefined;

      const filteredDomains = new Set<string>();

      filters.forEach((value, key) => {
        if (key === "config_entry") {
          outputDevices = outputDevices.filter((device) =>
            device.config_entries.includes(value)
          );
          startLength = outputDevices.length;
          filterConfigEntry = entries.find((entry) => entry.entry_id === value);
          if (filterConfigEntry) {
            filteredDomains.add(filterConfigEntry.domain);
          }
        }
        if (key === "domain") {
          const entryIds = entries
            .filter((entry) => entry.domain === value)
            .map((entry) => entry.entry_id);
          outputDevices = outputDevices.filter((device) =>
            device.config_entries.some((entryId) => entryIds.includes(entryId))
          );
          startLength = outputDevices.length;
          filteredDomains.add(value);
        }
      });

      if (!showDisabled) {
        outputDevices = outputDevices.filter((device) => !device.disabled_by);
      }

      const formattedOutputDevices = outputDevices.map((device) => {
        const deviceEntries = sortConfigEntries(
          device.config_entries
            .filter((entId) => entId in entryLookup)
            .map((entId) => entryLookup[entId]),
          manifestLookup
        );
        return {
          ...device,
          name: computeDeviceName(
            device,
            this.hass,
            deviceEntityLookup[device.id]
          ),
          model:
            device.model ||
            `<${localize("ui.panel.config.devices.data_table.unknown")}>`,
          manufacturer:
            device.manufacturer ||
            `<${localize("ui.panel.config.devices.data_table.unknown")}>`,
          area:
            device.area_id && areaLookup[device.area_id]
              ? areaLookup[device.area_id].name
              : "—",
          integration: deviceEntries.length
            ? deviceEntries
                .map(
                  (entry) =>
                    localize(`component.${entry.domain}.title`) || entry.domain
                )
                .join(", ")
            : this.hass.localize(
                "ui.panel.config.devices.data_table.no_integration"
              ),
          domains: deviceEntries.map((entry) => entry.domain),
          battery_entity: [
            this._batteryEntity(device.id, deviceEntityLookup),
            this._batteryChargingEntity(device.id, deviceEntityLookup),
          ],
          battery_level:
            this.hass.states[
              this._batteryEntity(device.id, deviceEntityLookup) || ""
            ]?.state,
        };
      });

      this._numHiddenDevices = startLength - formattedOutputDevices.length;
      return {
        devicesOutput: formattedOutputDevices,
        filteredConfigEntry: filterConfigEntry,
        filteredDomains,
      };
    }
  );

  private _columns = memoizeOne((narrow: boolean, showDisabled: boolean) => {
    type DeviceItem = ReturnType<
      typeof this._devicesAndFilterDomains
    >["devicesOutput"][number];

    const columns: DataTableColumnContainer<DeviceItem> = {
      icon: {
        title: "",
        type: "icon",
        template: (device) =>
          device.domains.length
            ? html`<img
                alt=""
                crossorigin="anonymous"
                referrerpolicy="no-referrer"
                src=${brandsUrl({
                  domain: device.domains[0],
                  type: "icon",
                  darkOptimized: this.hass.themes?.darkMode,
                })}
              />`
            : "",
      },
    };

    if (narrow) {
      columns.name = {
        title: this.hass.localize("ui.panel.config.devices.data_table.device"),
        main: true,
        sortable: true,
        filterable: true,
        direction: "asc",
        grows: true,
        template: (device) => html`
          ${device.name}
          <div class="secondary">${device.area} | ${device.integration}</div>
        `,
      };
    } else {
      columns.name = {
        title: this.hass.localize("ui.panel.config.devices.data_table.device"),
        main: true,
        sortable: true,
        filterable: true,
        grows: true,
        direction: "asc",
      };
    }

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
      template: (device) => {
        const batteryEntityPair = device.battery_entity;
        const battery =
          batteryEntityPair && batteryEntityPair[0]
            ? this.hass.states[batteryEntityPair[0]]
            : undefined;
        const batteryDomain = battery ? computeStateDomain(battery) : undefined;
        const batteryCharging =
          batteryEntityPair && batteryEntityPair[1]
            ? this.hass.states[batteryEntityPair[1]]
            : undefined;

        return battery &&
          (batteryDomain === "binary_sensor" || !isNaN(battery.state as any))
          ? html`
              ${batteryDomain === "sensor"
                ? this.hass.formatEntityState(battery)
                : nothing}
              <ha-battery-icon
                .hass=${this.hass}
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
        template: (device) =>
          device.disabled_by
            ? html`<div
                tabindex="0"
                style="display:inline-block; position: relative;"
              >
                <ha-svg-icon .path=${mdiCancel}></ha-svg-icon>
                <simple-tooltip animation-delay="0" position="left">
                  ${this.hass.localize("ui.panel.config.devices.disabled")}
                </simple-tooltip>
              </div>`
            : "—",
      };
    }
    return columns;
  });

  public willUpdate(changedProps) {
    if (changedProps.has("_searchParms")) {
      if (
        this._searchParms.get("config_entry") ||
        this._searchParms.get("domain")
      ) {
        // If we are requested to show the devices for a given config entry / domain,
        // also show the disabled ones by default.
        this._showDisabled = true;
      }
    }
  }

  protected render(): TemplateResult {
    const { devicesOutput } = this._devicesAndFilterDomains(
      this.devices,
      this.entries,
      this.entities,
      this.areas,
      this.manifests,
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
        hasFab
      >
        <ha-integration-overflow-menu
          .hass=${this.hass}
          slot="toolbar-icon"
        ></ha-integration-overflow-menu>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize("ui.panel.config.devices.add_device")}
          extended
          @click=${this._addDevice}
          ?rtl=${computeRTL(this.hass)}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
        <ha-button-menu slot="filter-menu" multi>
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

  private _addDevice() {
    const { filteredConfigEntry, filteredDomains } =
      this._devicesAndFilterDomains(
        this.devices,
        this.entries,
        this.entities,
        this.areas,
        this.manifests,
        this._searchParms,
        this._showDisabled,
        this.hass.localize
      );
    if (
      filteredDomains.size === 1 &&
      (PROTOCOL_INTEGRATIONS as ReadonlyArray<string>).includes(
        [...filteredDomains][0]
      )
    ) {
      protocolIntegrationPicked(this, this.hass, [...filteredDomains][0], {
        config_entry: filteredConfigEntry?.entry_id,
      });
      return;
    }
    showAddIntegrationDialog(this, {
      domain: this._searchParms.get("domain") || undefined,
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
