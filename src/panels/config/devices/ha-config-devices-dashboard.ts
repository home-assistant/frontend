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
// import { computeRTL } from "../../../common/util/compute_rtl";

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
} from "../../../components/ha-data-table";
// tslint:disable-next-line
import { DeviceRegistryEntry } from "../../../data/device_registry";
import { EntityRegistryEntry } from "../../../data/entity_registry";
import { ConfigEntry } from "../../../data/config_entries";
import { AreaRegistryEntry } from "../../../data/area_registry";
import { navigate } from "../../../common/navigate";
import { HassEntity } from "home-assistant-js-websocket";

@customElement("ha-config-devices-dashboard")
export class HaConfigDeviceDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public devices!: DeviceRegistryEntry[];
  @property() public entries!: ConfigEntry[];
  @property() public entities!: EntityRegistryEntry[];
  @property() public areas!: AreaRegistryEntry[];
  @property() public domain!: string;

  private _devices = memoizeOne(
    (
      devices: DeviceRegistryEntry[],
      entries: ConfigEntry[],
      domain: string
    ) => {
      if (!domain) {
        return devices;
      }
      return devices.filter(
        (device) =>
          entries.find((entry) =>
            device.config_entries.includes(entry.entry_id)
          )!.domain === domain
      );
    }
  );

  private _columns: DataTabelColumnContainer = {
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
      filterable: true,
      type: "numeric",
      template: (battery: HassEntity) =>
        battery
          ? html`
              ${battery.state}%
              <ha-state-icon
                .hass=${this.hass!}
                .stateObj=${battery}
              ></ha-state-icon>
            `
          : html`
              n/a
            `,
    },
  };

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        header=${this.hass.localize("ui.panel.config.devices.caption")}
      >
        <ha-data-table
          .columns=${this._columns}
          .data=${this._devices(this.devices, this.entries, this.domain).map(
            (device) => {
              return {
                device_name: device.name_by_user || device.name,
                id: device.id,
                manufacturer: device.manufacturer,
                model: device.model,
                area:
                  !this.areas || !device || !device.area_id
                    ? "No area"
                    : this.areas.find(
                        (area) => area.area_id === device.area_id
                      )!.name,
                integration:
                  !this.entries || !device || !device.config_entries
                    ? "No integration"
                    : this.entries.find((entry) =>
                        device.config_entries.includes(entry.entry_id)
                      )!.domain,
                battery: this._batteryEntity(device),
              };
            }
          )}
          @row-click=${this._handleRowClicked}
        ></ha-data-table>
      </hass-subpage>
    `;
  }

  private _batteryEntity(device): HassEntity | undefined {
    const batteryEntity = this.entities.find(
      (entity) =>
        entity.device_id === device.id &&
        this.hass.states[entity.entity_id] &&
        this.hass.states[entity.entity_id].attributes.device_class === "battery"
    );

    return batteryEntity
      ? this.hass.states[batteryEntity.entity_id]
      : undefined;
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
