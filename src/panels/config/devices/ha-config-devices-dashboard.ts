import "../../../layouts/hass-tabs-subpage";
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
import { HomeAssistant, Route } from "../../../types";
import { DeviceRegistryEntry } from "../../../data/device_registry";
import { EntityRegistryEntry } from "../../../data/entity_registry";
import { ConfigEntry } from "../../../data/config_entries";
import { AreaRegistryEntry } from "../../../data/area_registry";
import { configSections } from "../ha-panel-config";

@customElement("ha-config-devices-dashboard")
export class HaConfigDeviceDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow = false;
  @property() public isWide = false;
  @property() public devices!: DeviceRegistryEntry[];
  @property() public entries!: ConfigEntry[];
  @property() public entities!: EntityRegistryEntry[];
  @property() public areas!: AreaRegistryEntry[];
  @property() public domain!: string;
  @property() public route!: Route;

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .tabs=${configSections[0]}
        .route=${this.route}
      >
        <div class="content">
          <ha-devices-data-table
            .hass=${this.hass}
            .narrow=${this.narrow}
            .devices=${this.devices}
            .entries=${this.entries}
            .entities=${this.entities}
            .areas=${this.areas}
            .domain=${this.domain}
          ></ha-devices-data-table>
        </div>
      </hass-tabs-subpage>
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
