import type { ActionDetail } from "@material/mwc-list";
import {
  mdiDelete,
  mdiDotsVertical,
  mdiHelpCircle,
  mdiPencil,
  mdiPlus,
  mdiSort,
} from "@mdi/js";
import {
  css,
  html,
  LitElement,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import {
  getAreasFloorHierarchy,
  getAreasOrder,
  type AreasFloorHierarchy,
} from "../../../common/areas/areas-floor-hierarchy";
import { formatListWithAnds } from "../../../common/string/format-list";
import "../../../components/ha-fab";
import "../../../components/ha-floor-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-sortable";
import type { HaSortableOptions } from "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import type { AreaRegistryEntry } from "../../../data/area/area_registry";
import {
  createAreaRegistryEntry,
  reorderAreaRegistryEntries,
  updateAreaRegistryEntry,
} from "../../../data/area/area_registry";
import type { FloorRegistryEntry } from "../../../data/floor_registry";
import {
  createFloorRegistryEntry,
  deleteFloorRegistryEntry,
  updateFloorRegistryEntry,
} from "../../../data/floor_registry";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage";
import type { HomeAssistant, Route } from "../../../types";
import { showToast } from "../../../util/toast";
import { configSections } from "../ha-panel-config";
import {
  loadAreaRegistryDetailDialog,
  showAreaRegistryDetailDialog,
} from "./show-dialog-area-registry-detail";
import { showAreasFloorsOrderDialog } from "./show-dialog-areas-floors-order";
import { showFloorRegistryDetailDialog } from "./show-dialog-floor-registry-detail";

const UNASSIGNED_FLOOR = "__unassigned__";

const SORT_OPTIONS: HaSortableOptions = {
  sort: true,
  delay: 500,
  delayOnTouchOnly: true,
};

interface AreaStats {
  devices: number;
  services: number;
  entities: number;
}

@customElement("ha-config-areas-dashboard")
export class HaConfigAreasDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  private _searchParms = new URLSearchParams(window.location.search);

  @state() private _hierarchy?: AreasFloorHierarchy;

  private _blockHierarchyUpdate = false;

  private _blockHierarchyUpdateTimeout?: number;

  private _processAreasStats = memoizeOne(
    (
      areas: HomeAssistant["areas"],
      devices: HomeAssistant["devices"],
      entities: HomeAssistant["entities"]
    ): Map<string, AreaStats> => {
      const computeAreaStats = (area: AreaRegistryEntry) => {
        let devicesCount = 0;
        let servicesCount = 0;
        let entitiesCount = 0;

        for (const device of Object.values(devices)) {
          if (device.area_id === area.area_id) {
            if (device.entry_type === "service") {
              servicesCount++;
            } else {
              devicesCount++;
            }
          }
        }

        for (const entity of Object.values(entities)) {
          if (entity.area_id === area.area_id) {
            entitiesCount++;
          }
        }

        return {
          devices: devicesCount,
          services: servicesCount,
          entities: entitiesCount,
        };
      };
      const areaStats = new Map<string, AreaStats>();
      Object.values(areas).forEach((area) => {
        areaStats.set(area.area_id, computeAreaStats(area));
      });
      return areaStats;
    }
  );

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has("hass")) {
      const oldHass = changedProperties.get("hass");
      if (
        (this.hass.areas !== oldHass?.areas ||
          this.hass.floors !== oldHass?.floors) &&
        !this._blockHierarchyUpdate
      ) {
        this._computeHierarchy();
      }
    }
  }

  private _computeHierarchy() {
    this._hierarchy = getAreasFloorHierarchy(
      Object.values(this.hass.floors),
      Object.values(this.hass.areas)
    );
  }

  protected render(): TemplateResult<1> | typeof nothing {
    if (!this._hierarchy) {
      return nothing;
    }
    const areasStats = this._processAreasStats(
      this.hass.areas,
      this.hass.devices,
      this.hass.entities
    );

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .isWide=${this.isWide}
        .backPath=${this._searchParms.has("historyBack")
          ? undefined
          : "/config"}
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
          <div class="floors">
            ${this._hierarchy.floors.map(({ areas, id }) => {
              const floor = this.hass.floors[id];
              if (!floor) {
                return nothing;
              }
              return html`
                <div class="floor">
                  <div class="header">
                    <h2>
                      <ha-floor-icon .floor=${floor}></ha-floor-icon>
                      ${floor.name}
                    </h2>
                    <div class="actions">
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
                            .path=${mdiSort}
                            slot="graphic"
                          ></ha-svg-icon
                          >${this.hass.localize(
                            "ui.panel.config.areas.picker.reorder"
                          )}</ha-list-item
                        >
                        <li divider role="separator"></li>
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
                  </div>
                  <ha-sortable
                    handle-selector="a"
                    draggable-selector="a"
                    @item-added=${this._areaAdded}
                    @item-moved=${this._areaMoved}
                    group="areas"
                    .options=${SORT_OPTIONS}
                    .floor=${floor.floor_id}
                  >
                    <div class="areas">
                      ${areas.map((areaId) => {
                        const area = this.hass.areas[areaId];
                        if (!area) {
                          return nothing;
                        }
                        const stats = areasStats.get(area.area_id);
                        return this._renderArea(area, stats);
                      })}
                    </div>
                  </ha-sortable>
                </div>
              `;
            })}
          </div>

          ${this._hierarchy.areas.length
            ? html`
                <div class="floor">
                  <div class="header">
                    <h2>
                      ${this.hass.localize(
                        this._hierarchy.floors.length
                          ? "ui.panel.config.areas.picker.other_areas"
                          : "ui.panel.config.areas.picker.header"
                      )}
                    </h2>
                    <div class="actions">
                      <ha-button-menu
                        @action=${this._handleUnassignedAreasAction}
                      >
                        <ha-icon-button
                          slot="trigger"
                          .path=${mdiDotsVertical}
                        ></ha-icon-button>
                        <ha-list-item graphic="icon"
                          ><ha-svg-icon
                            .path=${mdiSort}
                            slot="graphic"
                          ></ha-svg-icon
                          >${this.hass.localize(
                            "ui.panel.config.areas.picker.reorder"
                          )}</ha-list-item
                        >
                      </ha-button-menu>
                    </div>
                  </div>
                  <ha-sortable
                    handle-selector="a"
                    draggable-selector="a"
                    @item-added=${this._areaAdded}
                    @item-moved=${this._areaMoved}
                    group="areas"
                    .options=${SORT_OPTIONS}
                    .floor=${UNASSIGNED_FLOOR}
                  >
                    <div class="areas">
                      ${this._hierarchy.areas.map((areaId) => {
                        const area = this.hass.areas[areaId];
                        if (!area) {
                          return nothing;
                        }
                        const stats = areasStats.get(area.area_id);
                        return this._renderArea(area, stats);
                      })}
                    </div>
                  </ha-sortable>
                </div>
              `
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

  private _renderArea(
    area: AreaRegistryEntry,
    stats: AreaStats | undefined
  ): TemplateResult<1> {
    return html`
      <a href=${`/config/areas/area/${area.area_id}`} .sortableData=${area}>
        <ha-card outlined>
          <div
            style=${styleMap({
              backgroundImage: area.picture
                ? `url(${area.picture})`
                : undefined,
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
                  stats?.devices &&
                    this.hass.localize(
                      "ui.panel.config.integrations.config_entry.devices",
                      { count: stats.devices }
                    ),
                  stats?.services &&
                    this.hass.localize(
                      "ui.panel.config.integrations.config_entry.services",
                      { count: stats.services }
                    ),
                  stats?.entities &&
                    this.hass.localize(
                      "ui.panel.config.integrations.config_entry.entities",
                      { count: stats.entities }
                    ),
                ].filter((v): v is string => Boolean(v))
              )}
            </div>
          </div>
        </ha-card>
      </a>
    `;
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
    ev.stopPropagation();
    if (!this.hass || !this._hierarchy) {
      return;
    }
    const { floor } = ev.currentTarget;
    const { oldIndex, newIndex } = ev.detail;

    const floorId = floor === UNASSIGNED_FLOOR ? null : floor;

    // Reorder areas within the same floor
    const reorderAreas = (areas: string[], oldIdx: number, newIdx: number) => {
      const newAreas = [...areas];
      const [movedArea] = newAreas.splice(oldIdx, 1);
      newAreas.splice(newIdx, 0, movedArea);
      return newAreas;
    };

    // Optimistically update UI
    this._hierarchy = {
      ...this._hierarchy,
      floors: this._hierarchy.floors.map((f) => {
        if (f.id === floorId) {
          return {
            ...f,
            areas: reorderAreas(f.areas, oldIndex, newIndex),
          };
        }
        return f;
      }),
      areas:
        floorId === null
          ? reorderAreas(this._hierarchy.areas, oldIndex, newIndex)
          : this._hierarchy.areas,
    };

    const areaOrder = getAreasOrder(this._hierarchy);

    try {
      await reorderAreaRegistryEntries(this.hass, areaOrder);
    } catch {
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.config.areas.picker.area_move_failed"
        ),
      });
      // Revert on error
      this._computeHierarchy();
    }
  }

  private async _areaAdded(ev) {
    ev.stopPropagation();
    if (!this.hass || !this._hierarchy) {
      return;
    }
    const { floor } = ev.currentTarget;
    const { data: area, index } = ev.detail;

    const newFloorId = floor === UNASSIGNED_FLOOR ? null : floor;

    // Insert area at the specified index
    const insertAtIndex = (areas: string[], areaId: string, idx: number) => {
      const newAreas = [...areas];
      newAreas.splice(idx, 0, areaId);
      return newAreas;
    };

    // Optimistically update UI
    this._hierarchy = {
      ...this._hierarchy,
      floors: this._hierarchy.floors.map((f) => {
        if (f.id === newFloorId) {
          return {
            ...f,
            areas: insertAtIndex(f.areas, area.area_id, index),
          };
        }
        return {
          ...f,
          areas: f.areas.filter((id) => id !== area.area_id),
        };
      }),
      areas:
        newFloorId === null
          ? insertAtIndex(this._hierarchy.areas, area.area_id, index)
          : this._hierarchy.areas.filter((id) => id !== area.area_id),
    };

    const areaOrder = getAreasOrder(this._hierarchy);

    // Block hierarchy updates for 500ms to avoid flickering
    // because of multiple async updates
    this._blockHierarchyUpdateFor(500);

    try {
      await reorderAreaRegistryEntries(this.hass, areaOrder);
      await updateAreaRegistryEntry(this.hass, area.area_id, {
        floor_id: newFloorId,
      });
    } catch {
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.config.areas.picker.area_move_failed"
        ),
      });
      // Revert on error
      this._computeHierarchy();
    }
  }

  private _blockHierarchyUpdateFor(time: number) {
    this._blockHierarchyUpdate = true;
    if (this._blockHierarchyUpdateTimeout) {
      window.clearTimeout(this._blockHierarchyUpdateTimeout);
    }
    this._blockHierarchyUpdateTimeout = window.setTimeout(() => {
      this._blockHierarchyUpdate = false;
    }, time);
  }

  private _handleFloorAction(ev: CustomEvent<ActionDetail>) {
    const floor = (ev.currentTarget as any).floor;
    switch (ev.detail.index) {
      case 0:
        this._showReorderDialog();
        break;
      case 1:
        this._editFloor(floor);
        break;
      case 2:
        this._deleteFloor(floor);
        break;
    }
  }

  private _handleUnassignedAreasAction(ev: CustomEvent<ActionDetail>) {
    if (ev.detail.index === 0) {
      this._showReorderDialog();
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

  private _showReorderDialog() {
    showAreasFloorsOrderDialog(this, {});
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
    .header .actions {
      display: flex;
      align-items: center;
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
    .handle {
      cursor: move; /* fallback if grab cursor is unsupported */
      cursor: grab;
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
