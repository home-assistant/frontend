import "@material/mwc-list/mwc-list-item";
import type { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item";
import { mdiCancel, mdiFilterVariant, mdiPlus } from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import memoizeOne from "memoize-one";
import { HASSDomEvent } from "../../../common/dom/fire_event";
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

  @internalProperty() private _showDisabled = false;

  @internalProperty() private _filter = "";

  @internalProperty() private _numHiddenDevices = 0;

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
            // If we are requested to show the devices for a given config entry,
            // also show the disabled ones by default.
            this._showDisabled = true;

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

      const filterDomains: string[] = [];

      filters.forEach((value, key) => {
        if (key === "config_entry") {
          outputDevices = outputDevices.filter((device) =>
            device.config_entries.includes(value)
          );
          startLength = outputDevices.length;
          const configEntry = entries.find((entry) => entry.entry_id === value);
          if (configEntry) {
            filterDomains.push(configEntry.domain);
          }
        }
      });

      if (!showDisabled) {
        outputDevices = outputDevices.filter((device) => !device.disabled_by);
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
          area: device.area_id ? areaLookup[device.area_id].name : undefined,
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

      this._numHiddenDevices = startLength - outputDevices.length;
      return { devicesOutput: outputDevices, filteredDomains: filterDomains };
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
      if (showDisabled) {
        columns.disabled_by = {
          title: "",
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
              : "",
        };
      }
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
    const { devicesOutput, filteredDomains } = this._devicesAndFilterDomains(
      this.devices,
      this.entries,
      this.entities,
      this.areas,
      this._searchParms,
      this._showDisabled,
      this.hass.localize
    );
    const includeZHAFab = filteredDomains.includes("zha");
    const activeFilters = this._activeFilters(
      this.entries,
      this._searchParms,
      this.hass.localize
    );

    const headerToolbar = html`
      <search-input
        no-label-float
        no-underline
        @value-changed=${this._handleSearchChange}
        .filter=${this._filter}
        .label=${this.hass.localize("ui.panel.config.devices.picker.search")}
      ></search-input
      >${activeFilters
        ? html`<div class="active-filters">
            ${this.narrow
              ? html` <div>
                  <ha-icon icon="hass:filter-variant"></ha-icon>
                  <paper-tooltip animation-delay="0" position="left">
                    ${this.hass.localize(
                      "ui.panel.config.filtering.filtering_by"
                    )}
                    ${activeFilters.join(", ")}
                    ${this._numHiddenDevices
                      ? "(" +
                        this.hass.localize(
                          "ui.panel.config.devices.picker.filter.hidden_devices",
                          "number",
                          this._numHiddenDevices
                        ) +
                        ")"
                      : ""}
                  </paper-tooltip>
                </div>`
              : `${this.hass.localize(
                  "ui.panel.config.filtering.filtering_by"
                )} ${activeFilters.join(", ")}
                    ${
                      this._numHiddenDevices
                        ? "(" +
                          this.hass.localize(
                            "ui.panel.config.devices.picker.filter.hidden_devices",
                            "number",
                            this._numHiddenDevices
                          ) +
                          ")"
                        : ""
                    }
                    `}
            <mwc-button @click=${this._clearFilter}
              >${this.hass.localize(
                "ui.panel.config.filtering.clear"
              )}</mwc-button
            >
          </div>`
        : ""}
      ${this._numHiddenDevices && !activeFilters
        ? html`<div class="active-filters">
            ${this.narrow
              ? html` <div>
                  <ha-icon icon="hass:filter-variant"></ha-icon>
                  <paper-tooltip animation-delay="0" position="left">
                    ${this.hass.localize(
                      "ui.panel.config.devices.picker.filter.hidden_devices",
                      "number",
                      this._numHiddenDevices
                    )}
                  </paper-tooltip>
                </div>`
              : `${this.hass.localize(
                  "ui.panel.config.devices.picker.filter.hidden_devices",
                  "number",
                  this._numHiddenDevices
                )}`}
            <mwc-button @click=${this._showAll}
              >${this.hass.localize(
                "ui.panel.config.devices.picker.filter.show_all"
              )}</mwc-button
            >
          </div>`
        : ""}
      <ha-button-menu corner="BOTTOM_START" multi>
        <mwc-icon-button
          slot="trigger"
          .label=${this.hass!.localize(
            "ui.panel.config.devices.picker.filter.filter"
          )}
          .title=${this.hass!.localize(
            "ui.panel.config.devices.picker.filter.filter"
          )}
        >
          <ha-svg-icon .path=${mdiFilterVariant}></ha-svg-icon>
        </mwc-icon-button>
        <mwc-list-item
          @request-selected="${this._showDisabledChanged}"
          graphic="control"
          .selected=${this._showDisabled}
        >
          <ha-checkbox
            slot="graphic"
            .checked=${this._showDisabled}
          ></ha-checkbox>
          ${this.hass!.localize(
            "ui.panel.config.devices.picker.filter.show_disabled"
          )}
        </mwc-list-item>
      </ha-button-menu>
    `;

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .backPath=${this._searchParms.has("historyBack")
          ? undefined
          : "/config"}
        .tabs=${configSections.integrations}
        .route=${this.route}
        .columns=${this._columns(this.narrow, this._showDisabled)}
        .data=${devicesOutput}
        .filter=${this._filter}
        @row-click=${this._handleRowClicked}
        clickable
        .hasFab=${includeZHAFab}
      >
        ${includeZHAFab
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
        <div
          class=${classMap({
            "search-toolbar": this.narrow,
            "table-header": !this.narrow,
          })}
          slot="header"
        >
          ${headerToolbar}
        </div>
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

  private _showDisabledChanged(ev: CustomEvent<RequestSelectedDetail>) {
    if (ev.detail.source !== "property") {
      return;
    }
    this._showDisabled = ev.detail.selected;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  private _clearFilter() {
    navigate(this, window.location.pathname, true);
  }

  private _showAll() {
    this._showDisabled = true;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        hass-loading-screen {
          --app-header-background-color: var(--sidebar-background-color);
          --app-header-text-color: var(--sidebar-text-color);
        }
        a {
          color: var(--primary-color);
        }
        h2 {
          margin-top: 0;
          font-family: var(--paper-font-headline_-_font-family);
          -webkit-font-smoothing: var(
            --paper-font-headline_-_-webkit-font-smoothing
          );
          font-size: var(--paper-font-headline_-_font-size);
          font-weight: var(--paper-font-headline_-_font-weight);
          letter-spacing: var(--paper-font-headline_-_letter-spacing);
          line-height: var(--paper-font-headline_-_line-height);
          opacity: var(--dark-primary-opacity);
        }
        p {
          font-family: var(--paper-font-subhead_-_font-family);
          -webkit-font-smoothing: var(
            --paper-font-subhead_-_-webkit-font-smoothing
          );
          font-weight: var(--paper-font-subhead_-_font-weight);
          line-height: var(--paper-font-subhead_-_line-height);
        }
        ha-data-table {
          width: 100%;
          --data-table-border-width: 0;
        }
        :host(:not([narrow])) ha-data-table {
          height: calc(100vh - 1px - var(--header-height));
          display: block;
        }
        ha-button-menu {
          margin-right: 8px;
        }
        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(var(--rgb-primary-text-color), 0.12);
        }
        search-input {
          margin-left: 16px;
          flex-grow: 1;
          position: relative;
          top: 2px;
        }
        .search-toolbar search-input {
          margin-left: 8px;
          top: 1px;
        }
        .search-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--secondary-text-color);
        }
        .search-toolbar ha-button-menu {
          position: static;
        }
        .selected-txt {
          font-weight: bold;
          padding-left: 16px;
        }
        .table-header .selected-txt {
          margin-top: 20px;
        }
        .search-toolbar .selected-txt {
          font-size: 16px;
        }
        .header-btns > mwc-button,
        .header-btns > ha-icon-button {
          margin: 8px;
        }
        .active-filters {
          color: var(--primary-text-color);
          position: relative;
          display: flex;
          align-items: center;
          padding: 2px 2px 2px 8px;
          margin-left: 4px;
          font-size: 14px;
        }
        .active-filters ha-icon {
          color: var(--primary-color);
        }
        .active-filters mwc-button {
          margin-left: 8px;
        }
        .active-filters::before {
          background-color: var(--primary-color);
          opacity: 0.12;
          border-radius: 4px;
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          content: "";
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-devices-dashboard": HaConfigDeviceDashboard;
  }
}
