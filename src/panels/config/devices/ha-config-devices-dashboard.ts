import { consume } from "@lit/context";
import {
  mdiChevronRight,
  mdiDotsVertical,
  mdiMenuDown,
  mdiPlus,
  mdiTextureBox,
  mdiCancel,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";

import { ResizeController } from "@lit-labs/observers/resize-controller";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import { formatShortDateTime } from "../../../common/datetime/format_date_time";
import { storage } from "../../../common/decorators/storage";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../../../common/entity/compute_device_name";
import { computeFloorName } from "../../../common/entity/compute_floor_name";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import {
  PROTOCOL_INTEGRATIONS,
  protocolIntegrationPicked,
} from "../../../common/integrations/protocolIntegrationPicked";
import { navigate } from "../../../common/navigate";
import type { LocalizeFunc } from "../../../common/translations/localize";
import {
  hasRejectedItems,
  rejectedItems,
} from "../../../common/util/promise-all-settled-results";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SelectionChangedEvent,
  SortingChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/data-table/ha-data-table-labels";
import "../../../components/entity/ha-battery-icon";
import "../../../components/ha-alert";
import "../../../components/ha-button-menu";
import "../../../components/ha-check-list-item";
import "../../../components/ha-fab";
import "../../../components/ha-filter-devices";
import "../../../components/ha-filter-floor-areas";
import "../../../components/ha-filter-integrations";
import "../../../components/ha-filter-labels";
import "../../../components/ha-filter-states";
import "../../../components/ha-icon-button";
import "../../../components/ha-md-divider";
import "../../../components/ha-md-menu-item";
import "../../../components/ha-sub-menu";
import { createAreaRegistryEntry } from "../../../data/area_registry";
import type { ConfigEntry, SubEntry } from "../../../data/config_entries";
import { getSubEntries, sortConfigEntries } from "../../../data/config_entries";
import { fullEntitiesContext } from "../../../data/context";
import type { DataTableFilters } from "../../../data/data_table_filters";
import {
  deserializeFilters,
  serializeFilters,
} from "../../../data/data_table_filters";
import type {
  DeviceEntityLookup,
  DeviceRegistryEntry,
} from "../../../data/device_registry";
import { updateDeviceRegistryEntry } from "../../../data/device_registry";
import type { EntityRegistryEntry } from "../../../data/entity_registry";
import {
  findBatteryChargingEntity,
  findBatteryEntity,
} from "../../../data/entity_registry";
import type { IntegrationManifest } from "../../../data/integration";
import type { LabelRegistryEntry } from "../../../data/label_registry";
import {
  createLabelRegistryEntry,
  subscribeLabelRegistry,
} from "../../../data/label_registry";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { showAreaRegistryDetailDialog } from "../areas/show-dialog-area-registry-detail";
import { configSections } from "../ha-panel-config";
import "../integrations/ha-integration-overflow-menu";
import { showAddIntegrationDialog } from "../integrations/show-add-integration-dialog";
import { showLabelDetailDialog } from "../labels/show-dialog-label-detail";

interface DeviceRowData extends DeviceRegistryEntry {
  device?: DeviceRowData;
  area?: string;
  integration?: string;
  battery_entity?: [string | undefined, string | undefined];
  label_entries: EntityRegistryEntry[];
}

@customElement("ha-config-devices-dashboard")
export class HaConfigDeviceDashboard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public entries!: ConfigEntry[];

  @state() private _subEntries?: SubEntry[];

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  entities!: EntityRegistryEntry[];

  @property({ attribute: false }) public manifests!: IntegrationManifest[];

  @property({ attribute: false }) public route!: Route;

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _selected: string[] = [];

  @state()
  @storage({
    storage: "sessionStorage",
    key: "devices-table-search",
    state: true,
    subscribe: false,
  })
  private _filter: string = history.state?.filter || "";

  @state()
  @storage({
    storage: "sessionStorage",
    key: "devices-table-filters-full",
    state: true,
    subscribe: false,
    serializer: serializeFilters,
    deserializer: deserializeFilters,
  })
  private _filters: DataTableFilters = {};

  @state() private _expandedFilter?: string;

  @state()
  _labels!: LabelRegistryEntry[];

  @storage({ key: "devices-table-sort", state: false, subscribe: false })
  private _activeSorting?: SortingChangedEvent;

  @storage({ key: "devices-table-grouping", state: false, subscribe: false })
  private _activeGrouping?: string;

  @storage({ key: "devices-table-collapsed", state: false, subscribe: false })
  private _activeCollapsed?: string;

  @storage({
    key: "devices-table-column-order",
    state: false,
    subscribe: false,
  })
  private _activeColumnOrder?: string[];

  @storage({
    key: "devices-table-hidden-columns",
    state: false,
    subscribe: false,
  })
  private _activeHiddenColumns?: string[];

  private _sizeController = new ResizeController(this, {
    callback: (entries) => entries[0]?.contentRect.width,
  });

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

  willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      this._setFiltersFromUrl();
    }
  }

  private _setFiltersFromUrl() {
    const domain = this._searchParms.get("domain");
    const configEntry = this._searchParms.get("config_entry");
    const subEntry = this._searchParms.get("sub_entry");
    const label = this._searchParms.has("label");

    if (!domain && !configEntry && !label) {
      return;
    }

    this._filter = history.state?.filter || "";

    this._filters = {
      "ha-filter-states": {
        value: [
          ...((this._filters["ha-filter-states"]?.value as string[]) || []),
          "disabled",
        ],
        items: undefined,
      },
      "ha-filter-integrations": {
        value: domain ? [domain] : [],
        items: undefined,
      },
      config_entry: {
        value: configEntry ? [configEntry] : [],
        items: undefined,
      },
      sub_entry: {
        value: subEntry ? [subEntry] : [],
        items: undefined,
      },
    };
    this._filterLabel();
  }

  private _filterLabel() {
    const label = this._searchParms.get("label");
    if (!label) {
      return;
    }
    this._filters = {
      ...this._filters,
      "ha-filter-labels": {
        value: [label],
        items: undefined,
      },
    };
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
      filters: DataTableFilters,
      localize: LocalizeFunc,
      labelReg?: LabelRegistryEntry[]
    ) => {
      // Some older installations might have devices pointing at invalid entryIDs
      // So we guard for that.
      let outputDevices: DeviceRowData[] = Object.values(devices).map(
        (device) => ({
          ...device,
          label_entries: [],
        })
      );

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

      const entryLookup: Record<string, ConfigEntry> = {};
      for (const entry of entries) {
        entryLookup[entry.entry_id] = entry;
      }

      const manifestLookup: Record<string, IntegrationManifest> = {};
      for (const manifest of manifests) {
        manifestLookup[manifest.domain] = manifest;
      }

      let filteredConfigEntry: ConfigEntry | undefined;

      const filteredDomains = new Set<string>();

      Object.entries(filters).forEach(([key, filter]) => {
        if (
          key === "config_entry" &&
          Array.isArray(filter.value) &&
          filter.value.length
        ) {
          outputDevices = outputDevices.filter((device) =>
            device.config_entries.some((entryId) =>
              (filter.value as string[]).includes(entryId)
            )
          );

          const configEntries = entries.filter(
            (entry) =>
              entry.entry_id &&
              (filter.value as string[]).includes(entry.entry_id)
          );

          configEntries.forEach((configEntry) => {
            filteredDomains.add(configEntry.domain);
          });
          if (configEntries.length === 1) {
            filteredConfigEntry = configEntries[0];
          }
        } else if (
          key === "sub_entry" &&
          Array.isArray(filter.value) &&
          filter.value.length
        ) {
          if (
            !(
              Array.isArray(this._filters.config_entry?.value) &&
              this._filters.config_entry.value.length === 1
            )
          ) {
            return;
          }
          const configEntryId = this._filters.config_entry.value[0];
          outputDevices = outputDevices.filter(
            (device) =>
              device.config_entries_subentries[configEntryId] &&
              (filter.value as string[]).some((subEntryId) =>
                device.config_entries_subentries[configEntryId].includes(
                  subEntryId
                )
              )
          );
          if (!this._subEntries) {
            this._loadSubEntries(configEntryId);
          }
        } else if (
          key === "ha-filter-integrations" &&
          Array.isArray(filter.value) &&
          filter.value.length
        ) {
          const entryIds = entries
            .filter((entry) =>
              (filter.value as string[]).includes(entry.domain)
            )
            .map((entry) => entry.entry_id);
          outputDevices = outputDevices.filter((device) =>
            device.config_entries.some((entryId) => entryIds.includes(entryId))
          );
          (filter.value as string[]).forEach((domain) =>
            filteredDomains.add(domain)
          );
        } else if (
          key === "ha-filter-labels" &&
          Array.isArray(filter.value) &&
          filter.value.length
        ) {
          outputDevices = outputDevices.filter((device) =>
            device.labels.some((lbl) =>
              (filter.value as string[]).includes(lbl)
            )
          );
        } else if (filter.items) {
          outputDevices = outputDevices.filter((device) =>
            filter.items!.has(device.id)
          );
        }
      });

      const stateFilters = filters["ha-filter-states"]?.value as
        | string[]
        | undefined;

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
          device.primary_config_entry
        );

        const labels = labelReg && device?.labels;
        const labelsEntries = (labels || []).map(
          (lbl) => labelReg!.find((label) => label.label_id === lbl)!
        );

        let floorName = "—";
        if (device.area_id && areas[device.area_id]?.floor_id) {
          const floorId = areas[device.area_id].floor_id;
          if (floorId && this.hass.floors && this.hass.floors[floorId]) {
            floorName = computeFloorName(this.hass.floors[floorId]);
          }
        }

        return {
          ...device,
          name: computeDeviceNameDisplay(
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
          floor: floorName,
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
          label_entries: labelsEntries,
        };
      });

      return {
        devicesOutput: formattedOutputDevices,
        filteredConfigEntry,
        filteredDomains,
      };
    }
  );

  private _columns = memoizeOne((localize: LocalizeFunc) => {
    type DeviceItem = ReturnType<
      typeof this._devicesAndFilterDomains
    >["devicesOutput"][number];

    return {
      icon: {
        title: "",
        label: localize("ui.panel.config.devices.data_table.icon"),
        type: "icon",
        moveable: false,
        showNarrow: true,
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
      name: {
        title: localize("ui.panel.config.devices.data_table.device"),
        main: true,
        sortable: true,
        filterable: true,
        direction: "asc",
        grows: true,
        flex: 2,
        minWidth: "150px",
        extraTemplate: (device) => html`
          ${device.label_entries.length
            ? html`
                <ha-data-table-labels
                  .labels=${device.label_entries}
                ></ha-data-table-labels>
              `
            : nothing}
        `,
      },
      area: {
        title: localize("ui.panel.config.devices.data_table.area"),
        sortable: true,
        filterable: true,
        groupable: true,
        minWidth: "120px",
      },
      floor: {
        title: localize("ui.panel.config.devices.data_table.floor"),
        sortable: true,
        filterable: true,
        groupable: true,
        minWidth: "120px",
        defaultHidden: true,
      },
      integration: {
        title: localize("ui.panel.config.devices.data_table.integration"),
        sortable: true,
        filterable: true,
        groupable: true,
        minWidth: "120px",
      },
      manufacturer: {
        title: localize("ui.panel.config.devices.data_table.manufacturer"),
        sortable: true,
        filterable: true,
        groupable: true,
        minWidth: "120px",
      },
      model: {
        title: localize("ui.panel.config.devices.data_table.model"),
        sortable: true,
        filterable: true,
        minWidth: "120px",
      },
      battery_entity: {
        title: localize("ui.panel.config.devices.data_table.battery"),
        showNarrow: true,
        sortable: true,
        type: "numeric",
        maxWidth: "101px",
        minWidth: "101px",
        valueColumn: "battery_level",
        template: (device) => {
          const batteryEntityPair = device.battery_entity;
          const battery =
            batteryEntityPair && batteryEntityPair[0]
              ? this.hass.states[batteryEntityPair[0]]
              : undefined;
          const batteryDomain = battery
            ? computeStateDomain(battery)
            : undefined;
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
            : "—";
        },
      },
      created_at: {
        title: localize("ui.panel.config.generic.headers.created_at"),
        defaultHidden: true,
        sortable: true,
        minWidth: "128px",
        template: (entry) =>
          entry.created_at
            ? formatShortDateTime(
                new Date(entry.created_at * 1000),
                this.hass.locale,
                this.hass.config
              )
            : "—",
      },
      modified_at: {
        title: localize("ui.panel.config.generic.headers.modified_at"),
        defaultHidden: true,
        sortable: true,
        minWidth: "128px",
        template: (entry) =>
          entry.modified_at
            ? formatShortDateTime(
                new Date(entry.modified_at * 1000),
                this.hass.locale,
                this.hass.config
              )
            : "—",
      },
      disabled_by: {
        title: localize("ui.panel.config.devices.picker.state"),
        type: "icon",
        defaultHidden: true,
        sortable: true,
        filterable: true,
        minWidth: "80px",
        maxWidth: "80px",
        template: (device) =>
          device.disabled_by
            ? html`
                <div
                  tabindex="0"
                  style="display:inline-block; position: relative;"
                >
                  <ha-tooltip
                    placement="left"
                    .content=${this.hass.localize(
                      "ui.panel.config.entities.picker.status.disabled"
                    )}
                  >
                    <ha-svg-icon .path=${mdiCancel}></ha-svg-icon>
                  </ha-tooltip>
                </div>
              `
            : "—",
      },
      labels: {
        title: "",
        hidden: true,
        filterable: true,
        template: (device) =>
          device.label_entries.map((lbl) => lbl.name).join(" "),
      },
    } as DataTableColumnContainer<DeviceItem>;
  });

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeLabelRegistry(this.hass.connection, (labels) => {
        this._labels = labels;
      }),
    ];
  }

  protected render(): TemplateResult {
    const { devicesOutput } = this._devicesAndFilterDomains(
      this.hass.devices,
      this.entries,
      this.entities,
      this.hass.areas,
      this.manifests,
      this._filters,
      this.hass.localize,
      this._labels
    );

    const areasInOverflow =
      (this._sizeController.value && this._sizeController.value < 700) ||
      (!this._sizeController.value && this.hass.dockedSidebar === "docked");

    const areaItems = html`${Object.values(this.hass.areas).map(
        (area) =>
          html`<ha-md-menu-item
            .value=${area.area_id}
            .clickAction=${this._handleBulkArea}
          >
            ${area.icon
              ? html`<ha-icon slot="start" .icon=${area.icon}></ha-icon>`
              : html`<ha-svg-icon
                  slot="start"
                  .path=${mdiTextureBox}
                ></ha-svg-icon>`}
            <div slot="headline">${area.name}</div>
          </ha-md-menu-item>`
      )}
      <ha-md-menu-item .value=${null} .clickAction=${this._handleBulkArea}>
        <div slot="headline">
          ${this.hass.localize(
            "ui.panel.config.devices.picker.bulk_actions.no_area"
          )}
        </div>
      </ha-md-menu-item>
      <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>
      <ha-md-menu-item .clickAction=${this._bulkCreateArea}>
        <div slot="headline">
          ${this.hass.localize(
            "ui.panel.config.devices.picker.bulk_actions.add_area"
          )}
        </div>
      </ha-md-menu-item>`;

    const labelItems = html`${this._labels?.map((label) => {
        const color = label.color ? computeCssColor(label.color) : undefined;
        const selected = this._selected.every((deviceId) =>
          this.hass.devices[deviceId]?.labels.includes(label.label_id)
        );
        const partial =
          !selected &&
          this._selected.some((deviceId) =>
            this.hass.devices[deviceId]?.labels.includes(label.label_id)
          );
        return html`<ha-md-menu-item
          .value=${label.label_id}
          .action=${selected ? "remove" : "add"}
          @click=${this._handleBulkLabel}
          keep-open
        >
          <ha-checkbox
            slot="start"
            .checked=${selected}
            .indeterminate=${partial}
            reducedTouchTarget
          ></ha-checkbox>
          <ha-label style=${color ? `--color: ${color}` : ""}>
            ${label.icon
              ? html`<ha-icon slot="icon" .icon=${label.icon}></ha-icon>`
              : nothing}
            ${label.name}
          </ha-label>
        </ha-md-menu-item>`;
      })}
      <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>
      <ha-md-menu-item .clickAction=${this._bulkCreateLabel}>
        <div slot="headline">
          ${this.hass.localize("ui.panel.config.labels.add_label")}
        </div></ha-md-menu-item
      >`;

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
          "ui.panel.config.devices.picker.search",
          { number: devicesOutput.length }
        )}
        .columns=${this._columns(this.hass.localize)}
        .data=${devicesOutput}
        selectable
        .selected=${this._selected.length}
        @selection-changed=${this._handleSelectionChanged}
        .filter=${this._filter}
        has-filters
        .filters=${Object.values(this._filters).filter((filter) =>
          Array.isArray(filter.value)
            ? filter.value.length
            : filter.value &&
              Object.values(filter.value).some((val) =>
                Array.isArray(val) ? val.length : val
              )
        ).length}
        .initialGroupColumn=${this._activeGrouping}
        .initialCollapsedGroups=${this._activeCollapsed}
        .initialSorting=${this._activeSorting}
        .columnOrder=${this._activeColumnOrder}
        .hiddenColumns=${this._activeHiddenColumns}
        @columns-changed=${this._handleColumnsChanged}
        @clear-filter=${this._clearFilter}
        @search-changed=${this._handleSearchChange}
        @sorting-changed=${this._handleSortingChanged}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        @row-click=${this._handleRowClicked}
        clickable
        has-fab
        class=${this.narrow ? "narrow" : ""}
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
        ${Array.isArray(this._filters.config_entry?.value) &&
        this._filters.config_entry?.value.length
          ? html`<ha-alert slot="filter-pane">
              ${this.hass.localize(
                "ui.panel.config.devices.filtering_by_config_entry"
              )}
              ${this.entries?.find(
                (entry) =>
                  entry.entry_id === this._filters.config_entry!.value![0]
              )?.title || this._filters.config_entry.value[0]}${this._filters
                .config_entry.value.length === 1 &&
              Array.isArray(this._filters.sub_entry?.value) &&
              this._filters.sub_entry.value.length
                ? html` (${this._subEntries?.find(
                    (entry) =>
                      entry.subentry_id === this._filters.sub_entry!.value![0]
                  )?.title || this._filters.sub_entry!.value![0]})`
                : nothing}
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
        <ha-filter-labels
          .hass=${this.hass}
          .value=${this._filters["ha-filter-labels"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-labels"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-labels>

        ${!this.narrow
          ? html`<ha-md-button-menu slot="selection-bar">
                <ha-assist-chip
                  slot="trigger"
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.picker.bulk_actions.add_label"
                  )}
                >
                  <ha-svg-icon
                    slot="trailing-icon"
                    .path=${mdiMenuDown}
                  ></ha-svg-icon>
                </ha-assist-chip>
                ${labelItems}
              </ha-md-button-menu>

              ${areasInOverflow
                ? nothing
                : html`<ha-md-button-menu slot="selection-bar">
                    <ha-assist-chip
                      slot="trigger"
                      .label=${this.hass.localize(
                        "ui.panel.config.devices.picker.bulk_actions.move_area"
                      )}
                    >
                      <ha-svg-icon
                        slot="trailing-icon"
                        .path=${mdiMenuDown}
                      ></ha-svg-icon>
                    </ha-assist-chip>
                    ${areaItems}
                  </ha-md-button-menu>`}`
          : nothing}
        ${this.narrow || areasInOverflow
          ? html`<ha-md-button-menu has-overflow slot="selection-bar">
              ${this.narrow
                ? html`<ha-assist-chip
                    .label=${this.hass.localize(
                      "ui.panel.config.automation.picker.bulk_action"
                    )}
                    slot="trigger"
                  >
                    <ha-svg-icon
                      slot="trailing-icon"
                      .path=${mdiMenuDown}
                    ></ha-svg-icon>
                  </ha-assist-chip>`
                : html`<ha-icon-button
                    .path=${mdiDotsVertical}
                    .label=${this.hass.localize(
                      "ui.panel.config.automation.picker.bulk_action"
                    )}
                    slot="trigger"
                  ></ha-icon-button>`}
              ${this.narrow
                ? html` <ha-sub-menu>
                    <ha-md-menu-item slot="item">
                      <div slot="headline">
                        ${this.hass.localize(
                          "ui.panel.config.automation.picker.bulk_actions.add_label"
                        )}
                      </div>
                      <ha-svg-icon
                        slot="end"
                        .path=${mdiChevronRight}
                      ></ha-svg-icon>
                    </ha-md-menu-item>
                    <ha-md-menu slot="menu">${labelItems}</ha-md-menu>
                  </ha-sub-menu>`
                : nothing}
              <ha-sub-menu>
                <ha-md-menu-item slot="item">
                  <div slot="headline">
                    ${this.hass.localize(
                      "ui.panel.config.devices.picker.bulk_actions.move_area"
                    )}
                  </div>
                  <ha-svg-icon
                    slot="end"
                    .path=${mdiChevronRight}
                  ></ha-svg-icon>
                </ha-md-menu-item>
                <ha-md-menu slot="menu">${areaItems}</ha-md-menu>
              </ha-sub-menu>
            </ha-md-button-menu>`
          : nothing}
      </hass-tabs-subpage-data-table>
    `;
  }

  private async _loadSubEntries(entryId: string) {
    this._subEntries = await getSubEntries(this.hass, entryId);
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
        this.hass.localize,
        this._labels
      );

    if (
      filteredDomains.size === 1 &&
      (PROTOCOL_INTEGRATIONS as readonly string[]).includes(
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

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selected = ev.detail.value;
  }

  private _handleBulkArea = (item) => {
    const area = item.value;
    this._bulkAddArea(area);
  };

  private async _bulkAddArea(area: string) {
    const promises: Promise<DeviceRegistryEntry>[] = [];
    this._selected.forEach((deviceId) => {
      promises.push(
        updateDeviceRegistryEntry(this.hass, deviceId, {
          area_id: area,
        })
      );
    });
    const result = await Promise.allSettled(promises);
    if (hasRejectedItems(result)) {
      const rejected = rejectedItems(result);
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.common.multiselect.failed", {
          number: rejected.length,
        }),
        text: html`<pre>
${rejected
            .map((r) => r.reason.message || r.reason.code || r.reason)
            .join("\r\n")}</pre
        >`,
      });
    }
  }

  private _bulkCreateArea = () => {
    showAreaRegistryDetailDialog(this, {
      createEntry: async (values) => {
        const area = await createAreaRegistryEntry(this.hass, values);
        this._bulkAddArea(area.area_id);
        return area;
      },
    });
  };

  private async _handleBulkLabel(ev) {
    const label = ev.currentTarget.value;
    const action = ev.currentTarget.action;
    this._bulkLabel(label, action);
  }

  private async _bulkLabel(label: string, action: "add" | "remove") {
    const promises: Promise<DeviceRegistryEntry>[] = [];
    this._selected.forEach((deviceId) => {
      promises.push(
        updateDeviceRegistryEntry(this.hass, deviceId, {
          labels:
            action === "add"
              ? this.hass.devices[deviceId].labels.concat(label)
              : this.hass.devices[deviceId].labels.filter(
                  (lbl) => lbl !== label
                ),
        })
      );
    });
    const result = await Promise.allSettled(promises);
    if (hasRejectedItems(result)) {
      const rejected = rejectedItems(result);
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.common.multiselect.failed", {
          number: rejected.length,
        }),
        text: html`<pre>
${rejected
            .map((r) => r.reason.message || r.reason.code || r.reason)
            .join("\r\n")}</pre
        >`,
      });
    }
  }

  private _bulkCreateLabel = () => {
    showLabelDetailDialog(this, {
      createEntry: async (values) => {
        const label = await createLabelRegistryEntry(this.hass, values);
        this._bulkLabel(label.label_id, "add");
      },
    });
  };

  private _handleSortingChanged(ev: CustomEvent) {
    this._activeSorting = ev.detail;
  }

  private _handleGroupingChanged(ev: CustomEvent) {
    this._activeGrouping = ev.detail.value;
  }

  private _handleCollapseChanged(ev: CustomEvent) {
    this._activeCollapsed = ev.detail.value;
  }

  private _handleColumnsChanged(ev: CustomEvent) {
    this._activeColumnOrder = ev.detail.columnOrder;
    this._activeHiddenColumns = ev.detail.hiddenColumns;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          display: block;
        }
        hass-tabs-subpage-data-table {
          --data-table-row-height: 60px;
        }
        hass-tabs-subpage-data-table.narrow {
          --data-table-row-height: 72px;
        }
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
        ha-assist-chip {
          --ha-assist-chip-container-shape: 10px;
        }
        ha-md-button-menu ha-assist-chip {
          --md-assist-chip-trailing-space: 8px;
        }
        ha-label {
          --ha-label-background-color: var(--color, var(--grey-color));
          --ha-label-background-opacity: 0.5;
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
