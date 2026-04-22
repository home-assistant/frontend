import {
  mdiAlertCircleOutline,
  mdiCheck,
  mdiDevices,
  mdiPlus,
  mdiShape,
  mdiTune,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";

import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import type { ConfigEntry } from "../../../../../data/config_entries";
import { getConfigEntries } from "../../../../../data/config_entries";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { brandsUrl } from "../../../../../util/brands-url";

const THREAD_ICON =
  "m 17.126982,8.0730792 c 0,-0.7297242 -0.593746,-1.32357 -1.323637,-1.32357 -0.729454,0 -1.323199,0.5938458 -1.323199,1.32357 v 1.3234242 l 1.323199,1.458e-4 c 0.729891,0 1.323637,-0.5937006 1.323637,-1.32357 z M 11.999709,0 C 5.3829818,0 0,5.3838955 0,12.001455 0,18.574352 5.3105455,23.927406 11.865164,24 V 12.012075 l -3.9275642,-2.91e-4 c -1.1669814,0 -2.1169453,0.949979 -2.1169453,2.118323 0,1.16718 0.9499639,2.116868 2.1169453,2.116868 v 2.615717 c -2.6093089,0 -4.732218,-2.12327 -4.732218,-4.732585 0,-2.61048 2.1229091,-4.7343308 4.732218,-4.7343308 l 3.9275642,5.82e-4 v -1.323279 c 0,-2.172296 1.766691,-3.9395777 3.938181,-3.9395777 2.171928,0 3.9392,1.7672817 3.9392,3.9395777 0,2.1721498 -1.767272,3.9395768 -3.9392,3.9395768 l -1.323199,-1.45e-4 V 23.744102 C 19.911127,22.597726 24,17.768833 24,12.001455 24,5.3838955 18.616727,0 11.999709,0 Z";

@customElement("matter-config-dashboard")
export class MatterConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _configEntry?: ConfigEntry;

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this._fetchConfigEntry();
    }
  }

  private _matterDeviceIds = memoizeOne(
    (
      devices: HomeAssistant["devices"],
      configEntryId?: string
    ): Set<string> => {
      if (!configEntryId) {
        return new Set();
      }
      return new Set(
        Object.values(devices)
          .filter((device) => device.config_entries.includes(configEntryId))
          .map((device) => device.id)
      );
    }
  );

  private _entityCount = memoizeOne(
    (entities: HomeAssistant["entities"], deviceIds: Set<string>): number =>
      Object.values(entities).filter(
        (entity) => entity.device_id && deviceIds.has(entity.device_id)
      ).length
  );

  protected render(): TemplateResult | typeof nothing {
    if (!this._configEntry) {
      return nothing;
    }
    const isOnline = this._configEntry.state === "loaded";
    const deviceIds = this._matterDeviceIds(
      this.hass.devices,
      this._configEntry.entry_id
    );
    const entityCount = this._entityCount(this.hass.entities, deviceIds);

    return html`
      <hass-subpage
        .narrow=${this.narrow}
        .hass=${this.hass}
        header="Matter"
        back-path="/config"
        has-fab
      >
        <div class="container">
          ${this._renderNetworkStatus(isOnline, deviceIds.size)}
          ${this._renderMyNetworkCard(deviceIds.size, entityCount)}
          ${this._renderNavigationCard()}
        </div>

        <ha-button slot="fab" href="/config/matter/add" size="large">
          <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.matter.panel.add_device")}
        </ha-button>
      </hass-subpage>
    `;
  }

  private _renderNetworkStatus(isOnline: boolean, deviceCount: number) {
    return html`
      <ha-card class="content network-status">
        <div class="card-content">
          <div class="heading">
            <div class="icon ${isOnline ? "success" : "error"}">
              <ha-svg-icon
                .path=${isOnline ? mdiCheck : mdiAlertCircleOutline}
              ></ha-svg-icon>
            </div>
            <div class="details">
              ${this.hass.localize(
                `ui.panel.config.matter.panel.status_${isOnline ? "online" : "offline"}`
              )}<br />
              <small>
                ${this.hass.localize("ui.panel.config.matter.panel.devices", {
                  count: deviceCount,
                })}
              </small>
            </div>
            <img
              class="logo"
              alt="Matter"
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
              src=${brandsUrl(
                {
                  domain: "matter",
                  type: "icon",
                  darkOptimized: this.hass.themes?.darkMode,
                },
                this.hass.auth.data.hassUrl
              )}
            />
          </div>
        </div>
      </ha-card>
    `;
  }

  private _renderMyNetworkCard(deviceCount: number, entityCount: number) {
    return html`
      <ha-card class="nav-card">
        <div class="card-header">
          ${this.hass.localize("ui.panel.config.matter.panel.my_network_title")}
        </div>
        <div class="card-content">
          <ha-md-list>
            <ha-md-list-item
              type="link"
              href=${`/config/devices/dashboard?historyBack=1&config_entry=${this._configEntry?.entry_id}`}
            >
              <ha-svg-icon slot="start" .path=${mdiDevices}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.matter.panel.device_count",
                  { count: deviceCount }
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            <ha-md-list-item
              type="link"
              href=${`/config/entities/dashboard?historyBack=1&config_entry=${this._configEntry?.entry_id}`}
            >
              <ha-svg-icon slot="start" .path=${mdiShape}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.matter.panel.entity_count",
                  { count: entityCount }
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
          </ha-md-list>
        </div>
      </ha-card>
    `;
  }

  private _renderNavigationCard() {
    return html`
      <ha-card class="nav-card">
        <div class="card-content">
          <ha-md-list>
            <ha-md-list-item type="link" href="/config/matter/options">
              <ha-svg-icon slot="start" .path=${mdiTune}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.matter.panel.options_title"
                )}
              </div>
              <div slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.matter.panel.options_description"
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            ${isComponentLoaded(this.hass.config, "thread")
              ? html`<ha-md-list-item type="link" href="/config/thread">
                  <ha-svg-icon slot="start" .path=${THREAD_ICON}></ha-svg-icon>
                  <div slot="headline">
                    ${this.hass.localize(
                      "ui.panel.config.matter.panel.thread_panel"
                    )}
                  </div>
                  <div slot="supporting-text">
                    ${this.hass.localize(
                      "ui.panel.config.matter.panel.thread_panel_description"
                    )}
                  </div>
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-list-item>`
              : nothing}
          </ha-md-list>
        </div>
      </ha-card>
    `;
  }

  private async _fetchConfigEntry(): Promise<void> {
    const configEntries = await getConfigEntries(this.hass, {
      domain: "matter",
    });
    this._configEntry = configEntries.find(
      (entry) => entry.disabled_by === null && entry.source !== "ignore"
    );
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          margin: 0 auto var(--ha-space-4);
          max-width: 600px;
        }

        .nav-card {
          overflow: hidden;
        }

        .nav-card .card-content {
          padding: 0;
        }

        .nav-card .card-header {
          padding-bottom: var(--ha-space-2);
        }

        .content {
          margin-top: var(--ha-space-6);
        }

        ha-md-list {
          background: none;
          padding: 0;
        }

        ha-md-list-item {
          --md-item-overflow: visible;
        }

        .network-status div.heading {
          display: flex;
          align-items: center;
          column-gap: var(--ha-space-4);
        }

        .network-status div.heading .logo {
          height: 40px;
          width: 40px;
          margin-inline-start: auto;
          object-fit: contain;
        }

        .network-status div.heading .icon {
          position: relative;
          border-radius: var(--ha-border-radius-2xl);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          --icon-color: var(--primary-color);
        }

        .network-status div.heading .icon.success {
          --icon-color: var(--success-color);
        }

        .network-status div.heading .icon.error {
          --icon-color: var(--error-color);
        }

        .network-status div.heading .icon::before {
          display: block;
          content: "";
          position: absolute;
          inset: 0;
          background-color: var(--icon-color);
          opacity: 0.2;
        }

        .network-status div.heading .icon ha-svg-icon {
          color: var(--icon-color);
          width: 24px;
          height: 24px;
        }

        .network-status div.heading .details {
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          color: var(--primary-text-color);
        }

        .network-status small {
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          letter-spacing: 0.25px;
          color: var(--secondary-text-color);
        }

        .container {
          padding: var(--ha-space-2) var(--ha-space-4)
            calc(var(--ha-space-16) + var(--safe-area-inset-bottom, 0px));
        }

        a[slot="fab"] {
          text-decoration: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-config-dashboard": MatterConfigDashboard;
  }
}
