import { mdiDragHorizontalVariant, mdiTextureBox } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import {
  type AreasFloorHierarchy,
  getAreasFloorHierarchy,
} from "../../../common/areas/areas-floor-hierarchy";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-floor-icon";
import "../../../components/ha-icon";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import "../../../components/ha-wa-dialog";
import type { AreaRegistryEntry } from "../../../data/area/area_registry";
import type { HomeFrontendSystemData } from "../../../data/frontend";
import {
  applyAreasOrder,
  applyFloorOrder,
  buildAreasOrderFromHierarchy,
} from "../../lovelace/strategies/home/helpers/home-order-helper";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { showToast } from "../../../util/toast";
import type { HomeAreasOrderDialogParams } from "./show-dialog-home-areas-order";

const UNASSIGNED_FLOOR = "__unassigned__";

@customElement("dialog-home-areas-order")
class DialogHomeAreasOrder extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _hierarchy?: AreasFloorHierarchy;

  @state() private _saving = false;

  @state() private _params?: HomeAreasOrderDialogParams;

  public async showDialog(params: HomeAreasOrderDialogParams): Promise<void> {
    this._params = params;
    this._open = true;
    this._computeHierarchy();
  }

  private _computeHierarchy(): void {
    this._hierarchy = getAreasFloorHierarchy(
      Object.values(this.hass.floors),
      Object.values(this.hass.areas)
    );

    // Apply existing custom order if configured
    if (this._params?.config.areas_order) {
      const { areas_order } = this._params.config;

      const orderedFloors = applyFloorOrder(
        Object.values(this.hass.floors),
        areas_order.floors
      );
      this._hierarchy = getAreasFloorHierarchy(
        orderedFloors,
        Object.values(this.hass.areas)
      );
      this._hierarchy = applyAreasOrder(this._hierarchy, areas_order);
    }
  }

  public closeDialog(): void {
    this._saving = false;
    this._open = false;
  }

  private _dialogClosed(): void {
    this._open = false;
    this._hierarchy = undefined;
    this._params = undefined;
    this._saving = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._hierarchy || !this._params) {
      return nothing;
    }

    const hasFloors = this._hierarchy.floors.length > 0;
    const dialogTitle = this.hass.localize(
      hasFloors
        ? "ui.panel.home.editor.reorder_areas.title_with_floors"
        : "ui.panel.home.editor.reorder_areas.title"
    );

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${dialogTitle}
        header-subtitle=${this.hass.localize(
          "ui.panel.home.editor.reorder_areas.description"
        )}
        @closed=${this._dialogClosed}
      >
        <div class="content">
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
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            @click=${this._reset}
            appearance="plain"
          >
            ${this.hass.localize("ui.panel.home.editor.reorder_areas.reset")}
          </ha-button>
          <ha-button
            slot="secondaryAction"
            @click=${this.closeDialog}
            appearance="plain"
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._save}
            .disabled=${this._saving}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
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
                    "ui.panel.home.editor.reorder_areas.empty_floor"
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
                  "ui.panel.home.editor.reorder_areas.other_areas"
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
                    "ui.panel.home.editor.reorder_areas.empty_unassigned"
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

    // Update hierarchy for display purposes only
    // Note: This does NOT change the actual floor_id in the registry
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

  private async _reset(): Promise<void> {
    if (this._saving) {
      return;
    }

    // Reset to registry order
    this._computeHierarchy();

    // Clear the custom order configuration and save
    const newConfig: HomeFrontendSystemData = {
      ...this._params!.config,
      areas_order: undefined,
    };

    this._saving = true;
    try {
      await this._params!.saveConfig(newConfig);
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.home.editor.reorder_areas.reset_success"
        ),
      });
      this.closeDialog();
    } catch (err: any) {
      showToast(this, {
        message:
          err.message ||
          this.hass.localize("ui.panel.home.editor.reorder_areas.save_error"),
      });
      this._saving = false;
    }
  }

  private async _save(): Promise<void> {
    if (!this._hierarchy || !this._params || this._saving) {
      return;
    }

    this._saving = true;

    try {
      // Build the areas order configuration from current hierarchy
      const areasOrder = buildAreasOrderFromHierarchy(this._hierarchy);

      // Create updated config
      const newConfig: HomeFrontendSystemData = {
        ...this._params.config,
        areas_order: areasOrder,
      };

      // Save through the callback provided by parent
      await this._params.saveConfig(newConfig);

      showToast(this, {
        message: this.hass.localize(
          "ui.panel.home.editor.reorder_areas.save_success"
        ),
      });

      this.closeDialog();
    } catch (err: any) {
      showToast(this, {
        message:
          err.message ||
          this.hass.localize("ui.panel.home.editor.reorder_areas.save_error"),
      });
      this._saving = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-wa-dialog {
          max-height: 90%;
          --dialog-content-padding: var(--ha-space-2) var(--ha-space-6);
        }

        @media all and (max-width: 580px), all and (max-height: 500px) {
          ha-wa-dialog {
            min-width: 100%;
            min-height: 100%;
          }
        }

        .floors {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
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
          margin-top: var(--ha-space-4);
        }

        .floor-header {
          display: flex;
          align-items: center;
          padding: var(--ha-space-3) var(--ha-space-4);
          background-color: var(--secondary-background-color);
          gap: var(--ha-space-3);
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
          --md-list-item-leading-space: var(--ha-space-4);
          --md-list-item-trailing-space: var(--ha-space-4);
        }

        .area-handle {
          cursor: grab;
          color: var(--secondary-text-color);
        }

        .empty {
          padding: var(--ha-space-4);
          text-align: center;
          color: var(--secondary-text-color);
          font-style: italic;
        }

        .sortable-ghost {
          opacity: 0.4;
        }

        .sortable-drag {
          background: var(--card-background-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-home-areas-order": DialogHomeAreasOrder;
  }
}
