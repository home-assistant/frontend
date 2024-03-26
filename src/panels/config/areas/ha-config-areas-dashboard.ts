import { mdiHelpCircle, mdiPencil, mdiPlus } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  CSSResultGroup,
  LitElement,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { formatListWithAnds } from "../../../common/string/format-list";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import {
  AreaRegistryEntry,
  createAreaRegistryEntry,
} from "../../../data/area_registry";
import {
  FloorRegistryEntry,
  createFloorRegistryEntry,
  getFloorAreaLookup,
  subscribeFloorRegistry,
  updateFloorRegistryEntry,
} from "../../../data/floor_registry";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage";
import { HomeAssistant, Route } from "../../../types";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import {
  loadAreaRegistryDetailDialog,
  showAreaRegistryDetailDialog,
} from "./show-dialog-area-registry-detail";
import { showFloorRegistryDetailDialog } from "./show-dialog-floor-registry-detail";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";

@customElement("ha-config-areas-dashboard")
export class HaConfigAreasDashboard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _floors?: FloorRegistryEntry[];

  private _processAreas = memoizeOne(
    (
      areas: HomeAssistant["areas"],
      devices: HomeAssistant["devices"],
      entities: HomeAssistant["entities"],
      floors: FloorRegistryEntry[]
    ) => {
      const processArea = (area: AreaRegistryEntry) => {
        let noDevicesInArea = 0;
        let noServicesInArea = 0;
        let noEntitiesInArea = 0;

        for (const device of Object.values(devices)) {
          if (device.area_id === area.area_id) {
            if (device.entry_type === "service") {
              noServicesInArea++;
            } else {
              noDevicesInArea++;
            }
          }
        }

        for (const entity of Object.values(entities)) {
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
      };

      const floorAreaLookup = getFloorAreaLookup(Object.values(areas));
      const unassisgnedAreas = Object.values(areas).filter(
        (area) => !area.floor_id || !floorAreaLookup[area.floor_id]
      );
      return {
        floors: floors.map((floor) => ({
          ...floor,
          areas: (floorAreaLookup[floor.floor_id] || []).map(processArea),
        })),
        unassisgnedAreas: unassisgnedAreas.map(processArea),
      };
    }
  );

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeFloorRegistry(this.hass.connection, (floors) => {
        this._floors = floors;
      }),
    ];
  }

  protected render(): TemplateResult {
    const areasAndFloors =
      !this.hass.areas ||
      !this.hass.devices ||
      !this.hass.entities ||
      !this._floors
        ? undefined
        : this._processAreas(
            this.hass.areas,
            this.hass.devices,
            this.hass.entities,
            this._floors
          );

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
          ${areasAndFloors?.floors.map(
            (floor) =>
              html`<div class="floor">
                <div class="header">
                  <h2>
                    ${floor.icon
                      ? html`<ha-icon .icon=${floor.icon}></ha-icon>`
                      : nothing}
                    ${floor.name}
                  </h2>
                  <ha-icon-button
                    .path=${mdiPencil}
                    @click=${this._editFloor}
                    .floor=${floor}
                  ></ha-icon-button>
                </div>
                <div class="areas">
                  ${floor.areas.map((area) => this._renderArea(area))}
                </div>
              </div>`
          )}
          ${areasAndFloors?.unassisgnedAreas.length
            ? html`<div class="unassigned">
                <div class="header">
                  <h2>
                    ${this.hass.localize(
                      "ui.panel.config.areas.picker.unassigned_areas"
                    )}
                  </h2>
                </div>
                <div class="areas">
                  ${areasAndFloors?.unassisgnedAreas.map((area) =>
                    this._renderArea(area)
                  )}
                </div>
              </div>`
            : nothing}
        </div>
        <ha-fab
          slot="fab"
          class="floor"
          .label=${this.hass.localize(
            "ui.panel.config.areas.picker.create_floor"
          )}
          extended
          @click=${this._createFloor}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
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

  private _renderArea(area) {
    return html`<a href=${`/config/areas/area/${area.area_id}`}>
      <ha-card outlined>
        <div
          style=${styleMap({
            backgroundImage: area.picture ? `url(${area.picture})` : undefined,
          })}
          class="picture ${!area.picture ? "placeholder" : ""}"
        >
          ${!area.picture && area.icon
            ? html`<ha-icon .icon=${area.icon}></ha-icon>`
            : ""}
        </div>
        <h1 class="card-header">${area.name}</h1>
        <div class="card-content">
          <div>
            ${formatListWithAnds(
              this.hass.locale,
              [
                area.devices &&
                  this.hass.localize(
                    "ui.panel.config.integrations.config_entry.devices",
                    { count: area.devices }
                  ),
                area.services &&
                  this.hass.localize(
                    "ui.panel.config.integrations.config_entry.services",
                    { count: area.services }
                  ),
                area.entities &&
                  this.hass.localize(
                    "ui.panel.config.integrations.config_entry.entities",
                    { count: area.entities }
                  ),
              ].filter((v): v is string => Boolean(v))
            )}
          </div>
        </div>
      </ha-card>
    </a>`;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    loadAreaRegistryDetailDialog();
  }

  private _createFloor() {
    this._openFloorDialog();
  }

  private _editFloor(ev) {
    const floor = ev.currentTarget.floor;
    this._openFloorDialog(floor);
  }

  private _createArea() {
    this._openAreaDialog();
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

  private _openAreaDialog(entry?: AreaRegistryEntry) {
    showAreaRegistryDetailDialog(this, {
      entry,
      createEntry: async (values) =>
        createAreaRegistryEntry(this.hass!, values),
    });
  }

  private _openFloorDialog(entry?: FloorRegistryEntry) {
    showFloorRegistryDetailDialog(this, {
      entry,
      createEntry: async (values) =>
        createFloorRegistryEntry(this.hass!, values),
      updateEntry: async (values) =>
        updateFloorRegistryEntry(this.hass!, entry!.floor_id, values),
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      .container {
        padding: 8px 16px 16px;
        margin: 0 auto 64px auto;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--secondary-text-color);
        padding-inline-start: 8px;
      }
      .header h2 {
        font-size: 14px;
        font-weight: 500;
        margin-top: 28px;
      }
      .header ha-icon {
        margin-inline-end: 8px;
      }
      .areas {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        grid-gap: 16px 16px;
        max-width: 2000px;
        margin-bottom: 16px;
      }
      .areas > * {
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
      .placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        --mdc-icon-size: 48px;
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
      .floor {
        --primary-color: var(--secondary-text-color);
        margin-inline-end: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-areas-dashboard": HaConfigAreasDashboard;
  }
}
