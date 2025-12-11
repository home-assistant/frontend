import { consume } from "@lit/context";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";

import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { storage } from "../../../common/decorators/storage";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../../../common/entity/compute_device_name";
import { navigate } from "../../../common/navigate";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SortingChangedEvent,
} from "../../../components/data-table/ha-data-table";

import "../../../components/ha-area-picker";
import type { ConfigEntry } from "../../../data/config_entries";
import { sortConfigEntries } from "../../../data/config_entries";
import { fullEntitiesContext } from "../../../data/context";
import type { DeviceEntityLookup } from "../../../data/device/device_registry";
import { updateDeviceRegistryEntry } from "../../../data/device/device_registry";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import type { IntegrationManifest } from "../../../data/integration";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";

const TABS: PageNavigation[] = [
  {
    path: "/config/devices/unassigned",
    translationKey: "ui.panel.config.devices.unassigned.caption",
  },
];

@customElement("ha-config-devices-unassigned")
export class HaConfigDevicesUnassigned extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public entries!: ConfigEntry[];

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  entities!: EntityRegistryEntry[];

  @property({ attribute: false }) public manifests!: IntegrationManifest[];

  @property({ attribute: false }) public route!: Route;

  @state()
  @storage({
    storage: "sessionStorage",
    key: "devices-unassigned-table-search",
    state: true,
    subscribe: false,
  })
  private _filter = "";

  @storage({
    key: "devices-unassigned-table-sort",
    state: false,
    subscribe: false,
  })
  private _activeSorting?: SortingChangedEvent;

  @storage({
    key: "devices-unassigned-table-grouping",
    state: false,
    subscribe: false,
  })
  private _activeGrouping?: string;

  @storage({
    key: "devices-unassigned-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed?: string;

  @storage({
    key: "devices-unassigned-table-column-order",
    state: false,
    subscribe: false,
  })
  private _activeColumnOrder?: string[];

  @storage({
    key: "devices-unassigned-table-hidden-columns",
    state: false,
    subscribe: false,
  })
  private _activeHiddenColumns?: string[];

  private _unassignedDevices = memoizeOne(
    (
      devices: HomeAssistant["devices"],
      entries: ConfigEntry[],
      entities: EntityRegistryEntry[],
      localize: LocalizeFunc
    ) => {
      const deviceEntityLookup: DeviceEntityLookup<EntityRegistryEntry> = {};
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

      // Filter to only unassigned and enabled devices
      const unassignedDevices = Object.values(devices).filter(
        (device) => device.area_id === null && device.disabled_by === null
      );

      return unassignedDevices.map((device) => {
        const deviceEntries = sortConfigEntries(
          device.config_entries
            .filter((entId) => entId in entryLookup)
            .map((entId) => entryLookup[entId]),
          device.primary_config_entry
        );

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
        };
      });
    }
  );

  private _columns = memoizeOne((localize: LocalizeFunc, narrow: boolean) => {
    type DeviceItem = ReturnType<typeof this._unassignedDevices>[number];

    const columns: DataTableColumnContainer<DeviceItem> = {
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
        flex: 2,
        minWidth: "150px",
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
        defaultHidden: narrow,
      },
      model: {
        title: localize("ui.panel.config.devices.data_table.model"),
        sortable: true,
        filterable: true,
        minWidth: "120px",
        defaultHidden: narrow,
      },
      assign: {
        title: "",
        label: localize("ui.panel.config.devices.unassigned.assign"),
        type: "overflow-menu",
        moveable: false,
        showNarrow: true,
        minWidth: "150px",
        template: (device) => html`
          <ha-area-picker
            .hass=${this.hass}
            data-device-id=${device.id}
            .placeholder=${localize(
              "ui.panel.config.devices.unassigned.assign"
            )}
            no-add
            button-style
            @value-changed=${this._assignArea}
          ></ha-area-picker>
        `,
      },
    };

    return columns;
  });

  protected render(): TemplateResult {
    if (!this.hass || !this.entries || !this.entities) {
      return nothing as unknown as TemplateResult;
    }

    const devicesOutput = this._unassignedDevices(
      this.hass.devices,
      this.entries,
      this.entities,
      this.hass.localize
    );

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config/devices/dashboard"
        .tabs=${TABS}
        .route=${this.route}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.devices.unassigned.search",
          { number: devicesOutput.length }
        )}
        .columns=${this._columns(this.hass.localize, this.narrow)}
        .data=${devicesOutput}
        .filter=${this._filter}
        .initialGroupColumn=${this._activeGrouping}
        .initialCollapsedGroups=${this._activeCollapsed}
        .initialSorting=${this._activeSorting}
        .columnOrder=${this._activeColumnOrder}
        .hiddenColumns=${this._activeHiddenColumns}
        @columns-changed=${this._handleColumnsChanged}
        @search-changed=${this._handleSearchChange}
        @sorting-changed=${this._handleSortingChanged}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        @row-click=${this._handleRowClicked}
        clickable
        class=${this.narrow ? "narrow" : ""}
        .noDataText=${this.hass.localize(
          "ui.panel.config.devices.unassigned.no_devices"
        )}
      >
      </hass-tabs-subpage-data-table>
    `;
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const deviceId = ev.detail.id;
    navigate(`/config/devices/device/${deviceId}`);
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  private _assignArea = async (ev: CustomEvent) => {
    const areaPicker = ev.currentTarget as any;
    const deviceId = areaPicker.dataset.deviceId;
    const areaId = ev.detail.value;

    if (!areaId || !deviceId) {
      return;
    }

    // Reset the picker
    areaPicker.value = undefined;

    try {
      await updateDeviceRegistryEntry(this.hass, deviceId, {
        area_id: areaId,
      });
    } catch (err: any) {
      showAlertDialog(this, {
        text: err.message || "Unknown error",
      });
    }
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
      `,
      haStyle,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-devices-unassigned": HaConfigDevicesUnassigned;
  }
}
