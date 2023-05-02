import { mdiHelpCircle, mdiPlus } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import {
  AreaRegistryEntry,
  createAreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../../data/area_registry";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant, Route } from "../../../types";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import {
  loadAreaRegistryDetailDialog,
  showAreaRegistryDetailDialog,
} from "./show-dialog-area-registry-detail";

@customElement("ha-config-areas-dashboard")
export class HaConfigAreasDashboard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide?: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @state() private _areas!: AreaRegistryEntry[];

  @state() private _devices!: DeviceRegistryEntry[];

  @state() private _entities!: EntityRegistryEntry[];

  private _processAreas = memoizeOne(
    (
      areas: AreaRegistryEntry[],
      devices: DeviceRegistryEntry[],
      entities: EntityRegistryEntry[]
    ) =>
      areas.map((area) => {
        let noDevicesInArea = 0;
        let noServicesInArea = 0;
        let noEntitiesInArea = 0;

        for (const device of devices) {
          if (device.area_id === area.area_id) {
            if (device.entry_type === "service") {
              noServicesInArea++;
            } else {
              noDevicesInArea++;
            }
          }
        }

        for (const entity of entities) {
          if (entity.area_id === area.area_id) {
            noEntitiesInArea++;
          }
        }

        return {
          ...area,
          devices: noDevicesInArea,
          services: noServicesInArea,
          entities: noEntitiesInArea,
        };
      })
  );

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeAreaRegistry(this.hass.connection, (areas) => {
        this._areas = areas;
      }),
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this._devices = entries;
      }),
      subscribeEntityRegistry(this.hass.connection, (entries) => {
        this._entities = entries;
      }),
    ];
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .isWide=${this.isWide}
        back-path="/config"
        .tabs=${configSections.areas}
        .route=${this.route}
      >
        <ha-icon-button
          slot="toolbar-icon"
          .label=${this.hass.localize("ui.common.help")}
          .path=${mdiHelpCircle}
          @click=${this._showHelp}
        ></ha-icon-button>
        <div class="container">
          ${!this._areas || !this._devices || !this._entities
            ? ""
            : this._processAreas(
                this._areas,
                this._devices,
                this._entities
              ).map(
                (area) =>
                  html`<a href=${`/config/areas/area/${area.area_id}`}
                    ><ha-card outlined>
                      <div
                        style=${styleMap({
                          backgroundImage: area.picture
                            ? `url(${area.picture})`
                            : undefined,
                        })}
                        class="picture ${!area.picture ? "placeholder" : ""}"
                      ></div>
                      <h1 class="card-header">${area.name}</h1>
                      <div class="card-content">
                        <div>
                          ${area.devices
                            ? html`
                                ${this.hass.localize(
                                  "ui.panel.config.integrations.config_entry.devices",
                                  "count",
                                  area.devices
                                )}${area.services ? "," : ""}
                              `
                            : ""}
                          ${area.services
                            ? html`
                                ${this.hass.localize(
                                  "ui.panel.config.integrations.config_entry.services",
                                  "count",
                                  area.services
                                )}
                              `
                            : ""}
                          ${(area.devices || area.services) && area.entities
                            ? this.hass.localize("ui.common.and")
                            : ""}
                          ${area.entities
                            ? html`
                                ${this.hass.localize(
                                  "ui.panel.config.integrations.config_entry.entities",
                                  "count",
                                  area.entities
                                )}
                              `
                            : ""}
                        </div>
                      </div>
                    </ha-card></a
                  >`
              )}
        </div>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.areas.picker.create_area"
          )}
          extended
          @click=${this._createArea}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    loadAreaRegistryDetailDialog();
  }

  private _createArea() {
    this._openDialog();
  }

  private _showHelp() {
    showAlertDialog(this, {
      title: this.hass.localize("ui.panel.config.areas.caption"),
      text: html`
        ${this.hass.localize("ui.panel.config.areas.picker.introduction")}
        <p>
          ${this.hass.localize("ui.panel.config.areas.picker.introduction2")}
        </p>
        <a href="/config/integrations/dashboard">
          ${this.hass.localize(
            "ui.panel.config.areas.picker.integrations_page"
          )}
        </a>
      `,
    });
  }

  private _openDialog(entry?: AreaRegistryEntry) {
    showAreaRegistryDetailDialog(this, {
      entry,
      createEntry: async (values) =>
        createAreaRegistryEntry(this.hass!, values),
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      .container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        grid-gap: 16px 16px;
        padding: 8px 16px 16px;
        margin: 0 auto 64px auto;
        max-width: 2000px;
      }
      .container > * {
        max-width: 500px;
      }
      ha-card {
        overflow: hidden;
      }
      a {
        text-decoration: none;
      }
      h1 {
        padding-bottom: 0;
      }
      .picture {
        height: 150px;
        width: 100%;
        background-size: cover;
        background-position: center;
        position: relative;
      }
      .picture.placeholder::before {
        position: absolute;
        content: "";
        width: 100%;
        height: 100%;
        background-color: var(--sidebar-selected-icon-color);
        opacity: 0.12;
      }
      .card-content {
        min-height: 16px;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-areas-dashboard": HaConfigAreasDashboard;
  }
}
