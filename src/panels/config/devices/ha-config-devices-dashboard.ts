import { consume } from "@lit-labs/context";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import { mdiPlus } from "@mdi/js";
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
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/entity/ha-battery-icon";
import "../../../components/ha-button-menu";
import "../../../components/ha-check-list-item";
import "../../../components/ha-fab";
import "../../../components/ha-filter-devices";
import "../../../components/ha-filter-floor-areas";
import "../../../components/ha-filter-integrations";
import "../../../components/ha-filter-states";
import "../../../components/ha-icon-button";
import "../../../components/ha-alert";
import { ConfigEntry, sortConfigEntries } from "../../../data/config_entries";
import { fullEntitiesContext } from "../../../data/context";
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
import { IntegrationManifest } from "../../../data/integration";
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

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public isWide = false;

  @property({ attribute: false }) public entries!: ConfigEntry[];

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  entities!: EntityRegistryEntry[];

  @property({ attribute: false }) public manifests!: IntegrationManifest[];

  @property({ attribute: false }) public route!: Route;

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _filter: string = history.state?.filter || "";

  @state() private _filters: Record<
    string,
    { value: string[] | undefined; items: Set<string> | undefined }
  > = {};

  @state() private _expandedFilter?: string;

  private _ignoreLocationChange = false;

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener("location-changed", this._locationChanged);
    window.addEventListener("popstate", this._popState);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("location-changed", this._locationChanged);
    window.removeEventListener("popstate", this._popState);
  }

  private _locationChanged = () => {
    if (this._ignoreLocationChange) {
      this._ignoreLocationChange = false;
      return;
    }
    if (window.location.search.substring(1) !== this._searchParms.toString()) {
      this._searchParms = new URLSearchParams(window.location.search);
      this._setFiltersFromUrl();
    }
  };

  private _popState = () => {
    if (window.location.search.substring(1) !== this._searchParms.toString()) {
      this._searchParms = new URLSearchParams(window.location.search);
      this._setFiltersFromUrl();
    }
  };

  private _states = memoizeOne((localize: LocalizeFunc) => [
    {
      value: "disabled",
      label: localize("ui.panel.config.devices.data_table.disabled_by"),
    },
  ]);

  firstUpdated() {
    this._filters = {
      "ha-filter-states": {
        value: [],
        items: undefined,
      },
    };
    this._setFiltersFromUrl();
  }

  private _setFiltersFromUrl() {
    if (this._searchParms.has("domain")) {
      this._filters = {
        ...this._filters,
        "ha-filter-states": {
          value: [
            ...(this._filters["ha-filter-states"]?.value || []),
            "disabled",
          ],
          items: undefined,
        },
        "ha-filter-integrations": {
          value: [this._searchParms.get("domain")!],
          items: undefined,
        },
      };
    }
    if (this._searchParms.has("config_entry")) {
      this._filters = {
        ...this._filters,
        "ha-filter-states": {
          value: [
            ...(this._filters["ha-filter-states"]?.value || []),
            "disabled",
          ],
          items: undefined,
        },
        config_entry: {
          value: [this._searchParms.get("config_entry")!],
          items: undefined,
        },
      };
    }
  }

  private _clearFilter() {
    this._filters = {};
  }

  private _devicesAndFilterDomains = memoizeOne(
    (
      devices: HomeAssistant["devices"],
      entries: ConfigEntry[],
      entities: EntityRegistryEntry[],
      areas: HomeAssistant["areas"],
      manifests: IntegrationManifest[],
      filters: Record<
        string,
        { value: string[] | undefined; items: Set<string> | undefined }
      >,
      localize: LocalizeFunc
    ) => {
      // Some older installations might have devices pointing at invalid entryIDs
      // So we guard for that.
      let outputDevices: DeviceRowData[] = Object.values(devices);

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

      const manifestLookup: { [domain: string]: IntegrationManifest } = {};
      for (const manifest of manifests) {
        manifestLookup[manifest.domain] = manifest;
      }

      let filteredConfigEntry: ConfigEntry | undefined;

      const filteredDomains = new Set<string>();

      Object.entries(filters).forEach(([key, flter]) => {
        if (key === "config_entry" && flter.value?.length) {
          outputDevices = outputDevices.filter((device) =>
            device.config_entries.some((entryId) =>
              flter.value?.includes(entryId)
            )
          );

          const configEntries = entries.filter(
            (entry) => entry.entry_id && flter.value?.includes(entry.entry_id)
          );

          configEntries.forEach((configEntry) => {
            filteredDomains.add(configEntry.domain);
          });
          if (configEntries.length === 1) {
            filteredConfigEntry = configEntries[0];
          }
        } else if (key === "ha-filter-integrations" && flter.value?.length) {
          const entryIds = entries
            .filter((entry) => flter.value!.includes(entry.domain))
            .map((entry) => entry.entry_id);
          outputDevices = outputDevices.filter((device) =>
            device.config_entries.some((entryId) => entryIds.includes(entryId))
          );
          flter.value!.forEach((domain) => filteredDomains.add(domain));
        } else if (flter.items) {
          outputDevices = outputDevices.filter((device) =>
            flter.items!.has(device.id)
          );
        }
      });

      const stateFilters = filters["ha-filter-states"]?.value;

      const showDisabled =
        stateFilters?.length && stateFilters.includes("disabled");

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
            device.area_id && areas[device.area_id]
              ? areas[device.area_id].name
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

      return {
        devicesOutput: formattedOutputDevices,
        filteredConfigEntry,
        filteredDomains,
      };
    }
  );

  private _columns = memoizeOne((localize: LocalizeFunc, narrow: boolean) => {
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
        title: localize("ui.panel.config.devices.data_table.device"),
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
        title: localize("ui.panel.config.devices.data_table.device"),
        main: true,
        sortable: true,
        filterable: true,
        grows: true,
        direction: "asc",
      };
    }

    columns.manufacturer = {
      title: localize("ui.panel.config.devices.data_table.manufacturer"),
      sortable: true,
      hidden: narrow,
      filterable: true,
      groupable: true,
      width: "15%",
    };
    columns.model = {
      title: localize("ui.panel.config.devices.data_table.model"),
      sortable: true,
      hidden: narrow,
      filterable: true,
      width: "15%",
    };
    columns.area = {
      title: localize("ui.panel.config.devices.data_table.area"),
      sortable: true,
      hidden: narrow,
      filterable: true,
      groupable: true,
      width: "15%",
    };
    columns.integration = {
      title: localize("ui.panel.config.devices.data_table.integration"),
      sortable: true,
      hidden: narrow,
      filterable: true,
      groupable: true,
      width: "15%",
    };
    columns.battery_entity = {
      title: localize("ui.panel.config.devices.data_table.battery"),
      sortable: true,
      filterable: true,
      type: "numeric",
      width: narrow ? "105px" : "15%",
      maxWidth: "105px",
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
    columns.disabled_by = {
      title: "",
      label: localize("ui.panel.config.devices.data_table.disabled_by"),
      hidden: true,
      template: (device) =>
        device.disabled_by
          ? this.hass.localize("ui.panel.config.devices.disabled")
          : "",
    };
    return columns;
  });

  protected render(): TemplateResult {
    const { devicesOutput } = this._devicesAndFilterDomains(
      this.hass.devices,
      this.entries,
      this.entities,
      this.hass.areas,
      this.manifests,
      this._filters,
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
        .searchLabel=${this.hass.localize(
          "ui.panel.config.devices.picker.search"
        )}
        .columns=${this._columns(this.hass.localize, this.narrow)}
        .data=${devicesOutput}
        .filter=${this._filter}
        hasFilters
        .filters=${Object.values(this._filters).filter(
          (filter) => filter.value?.length
        ).length}
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
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
        ${this._filters.config_entry?.value?.length
          ? html`<ha-alert slot="filter-pane">
              Filtering by config entry
              ${this.entries?.find(
                (entry) =>
                  entry.entry_id === this._filters.config_entry!.value![0]
              )?.title || this._filters.config_entry.value[0]}
            </ha-alert>`
          : nothing}
        <ha-filter-floor-areas
          .hass=${this.hass}
          type="device"
          .value=${this._filters["ha-filter-floor-areas"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-floor-areas"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-floor-areas>
        <ha-filter-integrations
          .hass=${this.hass}
          .value=${this._filters["ha-filter-integrations"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-integrations"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-integrations>
        <ha-filter-states
          .hass=${this.hass}
          .value=${this._filters["ha-filter-states"]?.value}
          .states=${this._states(this.hass.localize)}
          .label=${this.hass.localize("ui.panel.config.devices.picker.state")}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-states"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-states>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _filterExpanded(ev) {
    if (ev.detail.expanded) {
      this._expandedFilter = ev.target.localName;
    } else if (this._expandedFilter === ev.target.localName) {
      this._expandedFilter = undefined;
    }
  }

  private _filterChanged(ev) {
    const type = ev.target.localName;
    this._filters = { ...this._filters, [type]: ev.detail };
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

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
    history.replaceState({ filter: this._filter }, "");
  }

  private _addDevice() {
    const { filteredConfigEntry, filteredDomains } =
      this._devicesAndFilterDomains(
        this.hass.devices,
        this.entries,
        this.entities,
        this.hass.areas,
        this.manifests,
        this._filters,
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
          margin-inline-start: 8px;
          margin-inline-end: initial;
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
