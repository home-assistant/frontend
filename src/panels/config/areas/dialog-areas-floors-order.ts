import { mdiClose, mdiDragHorizontalVariant, mdiTextureBox } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import {
  type AreasFloorHierarchy,
  getAreasFloorHierarchy,
  getAreasOrder,
  getFloorOrder,
} from "../../../common/areas/areas-floor-hierarchy";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-dialog-header";
import "../../../components/ha-floor-icon";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-md-dialog";
import type { HaMdDialog } from "../../../components/ha-md-dialog";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import type { AreaRegistryEntry } from "../../../data/area_registry";
import {
  reorderAreaRegistryEntries,
  updateAreaRegistryEntry,
} from "../../../data/area_registry";
import { reorderFloorRegistryEntries } from "../../../data/floor_registry";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { showToast } from "../../../util/toast";
import type { AreasFloorsOrderDialogParams } from "./show-dialog-areas-floors-order";

const UNASSIGNED_FLOOR = "__unassigned__";

interface FloorChange {
  areaId: string;
  floorId: string | null;
}

@customElement("dialog-areas-floors-order")
class DialogAreasFloorsOrder extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _hierarchy?: AreasFloorHierarchy;

  @state() private _saving = false;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public async showDialog(
    _params: AreasFloorsOrderDialogParams
  ): Promise<void> {
    this._open = true;
    this._computeHierarchy();
  }

  private _computeHierarchy(): void {
    this._hierarchy = getAreasFloorHierarchy(
      Object.values(this.hass.floors),
      Object.values(this.hass.areas)
    );
  }

  public closeDialog(): void {
    this._dialog?.close();
  }

  private _dialogClosed(): void {
    this._open = false;
    this._hierarchy = undefined;
    this._saving = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._open || !this._hierarchy) {
      return nothing;
    }

    const hasFloors = this._hierarchy.floors.length > 0;
    const dialogTitle = this.hass.localize(
      hasFloors
        ? "ui.panel.config.areas.dialog.reorder_floors_areas_title"
        : "ui.panel.config.areas.dialog.reorder_areas_title"
    );

    return html`
      <ha-md-dialog open @closed=${this._dialogClosed}>
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
            @click=${this.closeDialog}
          ></ha-icon-button>
          <span slot="title" .title=${dialogTitle}>${dialogTitle}</span>
        </ha-dialog-header>
        <div slot="content" class="content">
          <ha-sortable
            handle-selector=".floor-handle"
            draggable-selector=".floor"
            @item-moved=${this._floorMoved}
            invert-swap
          >
            <div class="floors">
              ${repeat(
                this._hierarchy.floors,
                (floor) => floor.id,
                (floor) => this._renderFloor(floor)
              )}
            </div>
          </ha-sortable>
          ${this._renderUnassignedAreas()}
        </div>
        <div slot="actions">
          <ha-button @click=${this.closeDialog} appearance="plain">
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button @click=${this._save} .disabled=${this._saving}>
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </div>
      </ha-md-dialog>
    `;
  }

  private _renderFloor(floor: { id: string; areas: string[] }) {
    const floorEntry = this.hass.floors[floor.id];
    if (!floorEntry) {
      return nothing;
    }

    return html`
      <div class="floor">
        <div class="floor-header">
          <ha-floor-icon .floor=${floorEntry}></ha-floor-icon>
          <span class="floor-name">${floorEntry.name}</span>
          <ha-svg-icon
            class="floor-handle"
            .path=${mdiDragHorizontalVariant}
          ></ha-svg-icon>
        </div>
        <ha-sortable
          handle-selector=".area-handle"
          draggable-selector="ha-md-list-item"
          @item-moved=${this._areaMoved}
          @item-added=${this._areaAdded}
          group="areas"
          .floor=${floor.id}
        >
          <ha-md-list>
            ${floor.areas.length > 0
              ? floor.areas.map((areaId) => this._renderArea(areaId))
              : html`<p class="empty">
                  ${this.hass.localize(
                    "ui.panel.config.areas.dialog.empty_floor"
                  )}
                </p>`}
          </ha-md-list>
        </ha-sortable>
      </div>
    `;
  }

  private _renderUnassignedAreas() {
    const hasFloors = this._hierarchy!.floors.length > 0;

    return html`
      <div class="floor unassigned">
        ${hasFloors
          ? html`<div class="floor-header">
              <span class="floor-name">
                ${this.hass.localize(
                  "ui.panel.config.areas.dialog.other_areas"
                )}
              </span>
            </div>`
          : nothing}
        <ha-sortable
          handle-selector=".area-handle"
          draggable-selector="ha-md-list-item"
          @item-moved=${this._areaMoved}
          @item-added=${this._areaAdded}
          group="areas"
          .floor=${UNASSIGNED_FLOOR}
        >
          <ha-md-list>
            ${this._hierarchy!.areas.length > 0
              ? this._hierarchy!.areas.map((areaId) => this._renderArea(areaId))
              : html`<p class="empty">
                  ${this.hass.localize(
                    "ui.panel.config.areas.dialog.empty_unassigned"
                  )}
                </p>`}
          </ha-md-list>
        </ha-sortable>
      </div>
    `;
  }

  private _renderArea(areaId: string) {
    const area = this.hass.areas[areaId];
    if (!area) {
      return nothing;
    }

    return html`
      <ha-md-list-item .sortableData=${area}>
        ${area.icon
          ? html`<ha-icon slot="start" .icon=${area.icon}></ha-icon>`
          : html`<ha-svg-icon
              slot="start"
              .path=${mdiTextureBox}
            ></ha-svg-icon>`}
        <span slot="headline">${area.name}</span>
        <ha-svg-icon
          class="area-handle"
          slot="end"
          .path=${mdiDragHorizontalVariant}
        ></ha-svg-icon>
      </ha-md-list-item>
    `;
  }

  private _floorMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._hierarchy) {
      return;
    }

    const { oldIndex, newIndex } = ev.detail;
    const newFloors = [...this._hierarchy.floors];
    const [movedFloor] = newFloors.splice(oldIndex, 1);
    newFloors.splice(newIndex, 0, movedFloor);

    this._hierarchy = {
      ...this._hierarchy,
      floors: newFloors,
    };
  }

  private _areaMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._hierarchy) {
      return;
    }

    const { floor } = ev.currentTarget as HTMLElement & { floor: string };
    const { oldIndex, newIndex } = ev.detail;
    const floorId = floor === UNASSIGNED_FLOOR ? null : floor;

    if (floorId === null) {
      // Reorder unassigned areas
      const newAreas = [...this._hierarchy.areas];
      const [movedArea] = newAreas.splice(oldIndex, 1);
      newAreas.splice(newIndex, 0, movedArea);

      this._hierarchy = {
        ...this._hierarchy,
        areas: newAreas,
      };
    } else {
      // Reorder areas within a floor
      this._hierarchy = {
        ...this._hierarchy,
        floors: this._hierarchy.floors.map((f) => {
          if (f.id === floorId) {
            const newAreas = [...f.areas];
            const [movedArea] = newAreas.splice(oldIndex, 1);
            newAreas.splice(newIndex, 0, movedArea);
            return { ...f, areas: newAreas };
          }
          return f;
        }),
      };
    }
  }

  private _areaAdded(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._hierarchy) {
      return;
    }

    const { floor } = ev.currentTarget as HTMLElement & { floor: string };
    const { data: area, index } = ev.detail as {
      data: AreaRegistryEntry;
      index: number;
    };

    const newFloorId = floor === UNASSIGNED_FLOOR ? null : floor;

    // Update hierarchy
    const newUnassignedAreas = this._hierarchy.areas.filter(
      (id) => id !== area.area_id
    );
    if (newFloorId === null) {
      // Add to unassigned at the specified index
      newUnassignedAreas.splice(index, 0, area.area_id);
    }

    this._hierarchy = {
      ...this._hierarchy,
      floors: this._hierarchy.floors.map((f) => {
        if (f.id === newFloorId) {
          // Add to new floor at the specified index
          const newAreas = [...f.areas];
          newAreas.splice(index, 0, area.area_id);
          return { ...f, areas: newAreas };
        }
        // Remove from old floor
        return {
          ...f,
          areas: f.areas.filter((id) => id !== area.area_id),
        };
      }),
      areas: newUnassignedAreas,
    };
  }

  private _computeFloorChanges(): FloorChange[] {
    if (!this._hierarchy) {
      return [];
    }

    const changes: FloorChange[] = [];

    // Check areas assigned to floors
    for (const floor of this._hierarchy.floors) {
      for (const areaId of floor.areas) {
        const originalFloorId = this.hass.areas[areaId]?.floor_id ?? null;
        if (floor.id !== originalFloorId) {
          changes.push({ areaId, floorId: floor.id });
        }
      }
    }

    // Check unassigned areas
    for (const areaId of this._hierarchy.areas) {
      const originalFloorId = this.hass.areas[areaId]?.floor_id ?? null;
      if (originalFloorId !== null) {
        changes.push({ areaId, floorId: null });
      }
    }

    return changes;
  }

  private async _save(): Promise<void> {
    if (!this._hierarchy || this._saving) {
      return;
    }

    this._saving = true;

    try {
      const areaOrder = getAreasOrder(this._hierarchy);
      const floorOrder = getFloorOrder(this._hierarchy);

      // Update floor assignments for areas that changed floors
      const floorChanges = this._computeFloorChanges();
      const floorChangePromises = floorChanges.map(({ areaId, floorId }) =>
        updateAreaRegistryEntry(this.hass, areaId, {
          floor_id: floorId,
        })
      );

      await Promise.all(floorChangePromises);

      // Reorder areas and floors
      await reorderAreaRegistryEntries(this.hass, areaOrder);
      await reorderFloorRegistryEntries(this.hass, floorOrder);

      this.closeDialog();
    } catch (err: any) {
      showToast(this, {
        message:
          err.message ||
          this.hass.localize("ui.panel.config.areas.dialog.reorder_failed"),
      });
      this._saving = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-md-dialog {
          min-width: 600px;
          max-height: 90%;
          --dialog-content-padding: 8px 24px;
        }

        @media all and (max-width: 600px), all and (max-height: 500px) {
          ha-md-dialog {
            --md-dialog-container-shape: 0;
            min-width: 100%;
            min-height: 100%;
          }
        }

        .floors {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .floor {
          border: 1px solid var(--divider-color);
          border-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
          overflow: hidden;
        }

        .floor.unassigned {
          margin-top: 16px;
        }

        .floor-header {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background-color: var(--secondary-background-color);
          gap: 12px;
        }

        .floor-name {
          flex: 1;
          font-weight: var(--ha-font-weight-medium);
        }

        .floor-handle {
          cursor: grab;
          color: var(--secondary-text-color);
        }

        ha-md-list {
          padding: 0;
          --md-list-item-leading-space: 16px;
          --md-list-item-trailing-space: 16px;
          display: flex;
          flex-direction: column;
        }

        ha-md-list-item {
          --md-list-item-one-line-container-height: 48px;
          --md-list-item-container-shape: 0;
        }

        ha-md-list-item.sortable-ghost {
          border-radius: calc(
            var(--ha-card-border-radius, var(--ha-border-radius-lg)) - 1px
          );
          box-shadow: inset 0 0 0 2px var(--primary-color);
        }

        .area-handle {
          cursor: grab;
          color: var(--secondary-text-color);
        }

        .empty {
          text-align: center;
          color: var(--secondary-text-color);
          font-style: italic;
          margin: 0;
          padding: 12px 16px;
          order: 1;
        }

        ha-md-list:has(ha-md-list-item) .empty {
          display: none;
        }

        .content {
          padding-top: 16px;
          padding-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-areas-floors-order": DialogAreasFloorsOrder;
  }
}
