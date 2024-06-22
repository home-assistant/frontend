import { ActionDetail } from "@material/mwc-list";
import {
  mdiDelete,
  mdiDotsVertical,
  mdiHelpCircle,
  mdiPencil,
  mdiPlus,
} from "@mdi/js";
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
import "../../../components/ha-floor-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/ha-sortable";
import {
  AreaRegistryEntry,
  createAreaRegistryEntry,
  updateAreaRegistryEntry,
} from "../../../data/area_registry";
import {
  FloorRegistryEntry,
  createFloorRegistryEntry,
  deleteFloorRegistryEntry,
  getFloorAreaLookup,
  subscribeFloorRegistry,
  updateFloorRegistryEntry,
} from "../../../data/floor_registry";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant, Route } from "../../../types";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import {
  loadAreaRegistryDetailDialog,
  showAreaRegistryDetailDialog,
} from "./show-dialog-area-registry-detail";
import { showFloorRegistryDetailDialog } from "./show-dialog-floor-registry-detail";

const UNASSIGNED_PATH = ["__unassigned__"];

const SORT_OPTIONS = { sort: false, delay: 500, delayOnTouchOnly: true };

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
                    <ha-floor-icon .floor=${floor}></ha-floor-icon>
                    ${floor.name}
                  </h2>
                  <ha-button-menu
                    .floor=${floor}
                    @action=${this._handleFloorAction}
                  >
                    <ha-icon-button
                      slot="trigger"
                      .path=${mdiDotsVertical}
                    ></ha-icon-button>
                    <ha-list-item graphic="icon"
                      ><ha-svg-icon
                        .path=${mdiPencil}
                        slot="graphic"
                      ></ha-svg-icon
                      >${this.hass.localize(
                        "ui.panel.config.areas.picker.floor.edit_floor"
                      )}</ha-list-item
                    >
                    <ha-list-item class="warning" graphic="icon"
                      ><ha-svg-icon
                        class="warning"
                        .path=${mdiDelete}
                        slot="graphic"
                      ></ha-svg-icon
                      >${this.hass.localize(
                        "ui.panel.config.areas.picker.floor.delete_floor"
                      )}</ha-list-item
                    >
                  </ha-button-menu>
                </div>
                <ha-sortable
                  handle-selector="a"
                  draggable-selector="a"
                  @item-moved=${this._areaMoved}
                  group="floor"
                  .options=${SORT_OPTIONS}
                  .path=${[floor.floor_id]}
                >
                  <div class="areas">
                    ${floor.areas.map((area) => this._renderArea(area))}
                  </div>
                </ha-sortable>
              </div>`
          )}
          ${areasAndFloors?.unassisgnedAreas.length
            ? html`<div class="floor">
                <div class="header">
                  <h2>
                    ${this.hass.localize(
                      "ui.panel.config.areas.picker.unassigned_areas"
                    )}
                  </h2>
                </div>
                <ha-sortable
                  handle-selector="a"
                  draggable-selector="a"
                  @item-moved=${this._areaMoved}
                  group="floor"
                  .options=${SORT_OPTIONS}
                  .path=${UNASSIGNED_PATH}
                >
                  <div class="areas">
                    ${areasAndFloors?.unassisgnedAreas.map((area) =>
                      this._renderArea(area)
                    )}
                  </div>
                </ha-sortable>
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
        <div class="card-header">
          ${area.name}
          <ha-icon-button
            .area=${area}
            .path=${mdiPencil}
            @click=${this._openAreaDetails}
          ></ha-icon-button>
        </div>
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

  private _openAreaDetails(ev) {
    ev.preventDefault();
    const area = ev.currentTarget.area;
    showAreaRegistryDetailDialog(this, {
      entry: area,
      updateEntry: async (values) =>
        updateAreaRegistryEntry(this.hass!, area.area_id, values),
    });
  }

  private async _areaMoved(ev) {
    const areasAndFloors = this._processAreas(
      this.hass.areas,
      this.hass.devices,
      this.hass.entities,
      this._floors!
    );
    let area: AreaRegistryEntry;
    if (ev.detail.oldPath === UNASSIGNED_PATH) {
      area = areasAndFloors.unassisgnedAreas[ev.detail.oldIndex];
    } else {
      const oldFloor = areasAndFloors.floors!.find(
        (floor) => floor.floor_id === ev.detail.oldPath[0]
      );
      area = oldFloor!.areas[ev.detail.oldIndex];
    }

    await updateAreaRegistryEntry(this.hass, area.area_id, {
      floor_id:
        ev.detail.newPath === UNASSIGNED_PATH ? null : ev.detail.newPath[0],
    });
  }

  private _handleFloorAction(ev: CustomEvent<ActionDetail>) {
    const floor = (ev.currentTarget as any).floor;
    switch (ev.detail.index) {
      case 0:
        this._editFloor(floor);
        break;
      case 1:
        this._deleteFloor(floor);
        break;
    }
  }

  private _createFloor() {
    this._openFloorDialog();
  }

  private _editFloor(floor) {
    this._openFloorDialog(floor);
  }

  private async _deleteFloor(floor) {
    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.areas.picker.floor.confirm_delete"
      ),
      text: this.hass.localize(
        "ui.panel.config.areas.picker.floor.confirm_delete_text"
      ),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
    });
    if (!confirm) {
      return;
    }
    await deleteFloorRegistryEntry(this.hass, floor.floor_id);
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
      createEntry: async (values, addedAreas) => {
        const floor = await createFloorRegistryEntry(this.hass!, values);
        addedAreas.forEach((areaId) => {
          updateAreaRegistryEntry(this.hass, areaId, {
            floor_id: floor.floor_id,
          });
        });
      },
      updateEntry: async (values, addedAreas, removedAreas) => {
        const floor = await updateFloorRegistryEntry(
          this.hass!,
          entry!.floor_id,
          values
        );
        addedAreas.forEach((areaId) => {
          updateAreaRegistryEntry(this.hass, areaId, {
            floor_id: floor.floor_id,
          });
        });
        removedAreas.forEach((areaId) => {
          updateAreaRegistryEntry(this.hass, areaId, {
            floor_id: null,
          });
        });
      },
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
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        overflow-wrap: anywhere;
      }
      .warning {
        color: var(--error-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-areas-dashboard": HaConfigAreasDashboard;
  }
}
