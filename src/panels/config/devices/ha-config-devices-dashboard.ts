import "../../../layouts/hass-subpage";
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
import { HomeAssistant } from "../../../types";
import { DeviceRegistryEntry } from "../../../data/device_registry";
import { EntityRegistryEntry } from "../../../data/entity_registry";
import { ConfigEntry } from "../../../data/config_entries";
import { AreaRegistryEntry } from "../../../data/area_registry";

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

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .showBackButton=${!this.isWide}
        .header=${this.hass.localize("ui.panel.config.devices.caption")}
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
      </hass-subpage>
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
