import type { ActionDetail } from "@material/mwc-list";
import {
  mdiDelete,
  mdiDotsVertical,
  mdiHelpCircle,
  mdiPencil,
  mdiPlus,
} from "@mdi/js";
import {
  LitElement,
  type PropertyValues,
  type TemplateResult,
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
import "../../../components/ha-list-item";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import type { AreaRegistryEntry } from "../../../data/area_registry";
import {
  createAreaRegistryEntry,
  updateAreaRegistryEntry,
} from "../../../data/area_registry";
import type { FloorRegistryEntry } from "../../../data/floor_registry";
import {
  createFloorRegistryEntry,
  deleteFloorRegistryEntry,
  getFloorAreaLookup,
  updateFloorRegistryEntry,
} from "../../../data/floor_registry";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage";
import type { HomeAssistant, Route } from "../../../types";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import {
  loadAreaRegistryDetailDialog,
  showAreaRegistryDetailDialog,
} from "./show-dialog-area-registry-detail";
import { showFloorRegistryDetailDialog } from "./show-dialog-floor-registry-detail";

const UNASSIGNED_FLOOR = "__unassigned__";

const SORT_OPTIONS = { sort: false, delay: 500, delayOnTouchOnly: true };

@customElement("ha-config-areas-dashboard")
export class HaConfigAreasDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _areas: AreaRegistryEntry[] = [];

  private _processAreas = memoizeOne(
    (
      areas: AreaRegistryEntry[],
      devices: HomeAssistant["devices"],
      entities: HomeAssistant["entities"],
      floors: HomeAssistant["floors"]
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

      const floorAreaLookup = getFloorAreaLookup(areas);
      const unassignedAreas = areas.filter(
        (area) => !area.floor_id || !floorAreaLookup[area.floor_id]
      );
      return {
        floors: Object.values(floors).map((floor) => ({
          ...floor,
          areas: (floorAreaLookup[floor.floor_id] || []).map(processArea),
        })),
        unassignedAreas: unassignedAreas.map(processArea),
      };
    }
  );

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has("hass")) {
      const oldHass = changedProperties.get("hass");
      if (this.hass.areas !== oldHass?.areas) {
        this._areas = Object.values(this.hass.areas);
      }
    }
  }

  protected render(): TemplateResult {
    const areasAndFloors =
      !this.hass.areas ||
      !this.hass.devices ||
      !this.hass.entities ||
      !this.hass.floors
        ? undefined
        : this._processAreas(
            this._areas,
            this.hass.devices,
            this.hass.entities,
            this.hass.floors
          );

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .isWide=${this.isWide}
        back-path="/config"
        .tabs=${configSections.areas}
        .route=${this.route}
        has-fab
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
                  @item-added=${this._areaAdded}
                  group="floor"
                  .options=${SORT_OPTIONS}
                  .floor=${floor.floor_id}
                >
                  <div class="areas">
                    ${floor.areas.map((area) => this._renderArea(area))}
                  </div>
                </ha-sortable>
              </div>`
          )}
          ${areasAndFloors?.unassignedAreas.length
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
                  @item-added=${this._areaAdded}
                  group="floor"
                  .options=${SORT_OPTIONS}
                  .floor=${UNASSIGNED_FLOOR}
                >
                  <div class="areas">
                    ${areasAndFloors?.unassignedAreas.map((area) =>
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
    return html`<a
      href=${`/config/areas/area/${area.area_id}`}
      .sortableData=${area}
    >
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

  private async _areaAdded(ev) {
    ev.stopPropagation();
    const { floor } = ev.currentTarget;

    const newFloorId = floor === UNASSIGNED_FLOOR ? null : floor;

    const { data: area } = ev.detail;

    this._areas = this._areas.map<AreaRegistryEntry>((a) => {
      if (a.area_id === area.area_id) {
        return { ...a, floor_id: newFloorId };
      }
      return a;
    });

    await updateAreaRegistryEntry(this.hass, area.area_id, {
      floor_id: newFloorId,
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

  static styles = css`
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
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
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

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-areas-dashboard": HaConfigAreasDashboard;
  }
}
