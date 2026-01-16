import {
  mdiChevronDown,
  mdiChevronRight,
  mdiDragHorizontalVariant,
  mdiTextureBox,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import {
  type AreasFloorHierarchy,
  getAreasFloorHierarchy,
} from "../../../../../common/areas/areas-floor-hierarchy";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/entity/ha-entities-picker";
import "../../../../../components/ha-button";
import "../../../../../components/ha-floor-icon";
import "../../../../../components/ha-icon";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-sortable";
import "../../../../../components/ha-svg-icon";
import type { AreaRegistryEntry } from "../../../../../data/area/area_registry";
import {
  applyAreasOrder,
  applyFloorOrder,
  buildAreasOrderFromHierarchy,
} from "../helpers/home-order-helper";
import type { HomeAssistant } from "../../../../../types";
import type { LovelaceStrategyEditor } from "../../types";
import type { HomeDashboardStrategyConfig } from "../home-dashboard-strategy";

const UNASSIGNED_FLOOR = "__unassigned__";

@customElement("hui-home-dashboard-strategy-editor")
export class HuiHomeDashboardStrategyEditor
  extends LitElement
  implements LovelaceStrategyEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state()
  private _config?: HomeDashboardStrategyConfig;

  @state()
  private _hierarchy?: AreasFloorHierarchy;

  @state()
  private _expandedFloors: Set<string> = new Set<string>();

  public setConfig(config: HomeDashboardStrategyConfig): void {
    this._config = config;
    if (this.hass) {
      this._computeHierarchy();
    }
  }

  protected willUpdate(changedProps: Map<string, any>): void {
    super.willUpdate(changedProps);
    if (changedProps.has("hass") && this.hass && this._config) {
      this._computeHierarchy();
    }
  }

  private _computeHierarchy(): void {
    if (!this.hass) {
      return;
    }

    this._hierarchy = getAreasFloorHierarchy(
      Object.values(this.hass.floors),
      Object.values(this.hass.areas)
    );

    // Apply existing custom order if configured
    if (this._config?.areas_order) {
      const { areas_order } = this._config;

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

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-entities-picker
        .hass=${this.hass}
        .value=${this._config.favorite_entities || []}
        label=${this.hass.localize(
          "ui.panel.lovelace.editor.strategy.home.favorite_entities"
        )}
        placeholder=${this.hass.localize(
          "ui.panel.lovelace.editor.strategy.home.add_favorite_entity"
        )}
        reorder
        @value-changed=${this._valueChanged}
      >
      </ha-entities-picker>

      <div class="section-divider"></div>

      <div class="reorder-section">
        <div class="section-header">
          <h3>
            ${this.hass.localize("ui.panel.home.editor.reorder_areas.title")}
          </h3>
          <p class="section-description">
            ${this.hass.localize(
              "ui.panel.home.editor.reorder_areas.description"
            )}
          </p>
        </div>
        ${this._hierarchy ? this._renderReorderUI() : nothing}
      </div>
    `;
  }

  private _renderReorderUI() {
    if (!this._hierarchy || !this.hass) {
      return nothing;
    }

    return html`
      <div class="reorder-content">
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
        <div class="reset-container">
          <ha-button @click=${this._resetOrder} appearance="plain">
            ${this.hass.localize("ui.panel.home.editor.reorder_areas.reset")}
          </ha-button>
        </div>
      </div>
    `;
  }

  private _renderFloor(floor: { id: string; areas: string[] }) {
    const floorEntry = this.hass!.floors[floor.id];
    if (!floorEntry) {
      return nothing;
    }

    const isExpanded = this._expandedFloors.has(floor.id);

    return html`
      <div class="floor">
        <div
          class="floor-header"
          .floorId=${floor.id}
          @click=${this._handleFloorHeaderClick}
        >
          <ha-svg-icon
            class="expand-icon"
            .path=${isExpanded ? mdiChevronDown : mdiChevronRight}
          ></ha-svg-icon>
          <ha-floor-icon .floor=${floorEntry}></ha-floor-icon>
          <span class="floor-name">${floorEntry.name}</span>
          <ha-svg-icon
            class="floor-handle"
            .path=${mdiDragHorizontalVariant}
            @click=${this._handleDragHandleClick}
          ></ha-svg-icon>
        </div>
        ${isExpanded
          ? html`
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
                        ${this.hass!.localize(
                          "ui.panel.home.editor.reorder_areas.empty_floor"
                        )}
                      </p>`}
                </ha-md-list>
              </ha-sortable>
            `
          : nothing}
      </div>
    `;
  }

  private _renderUnassignedAreas() {
    if (!this._hierarchy || !this.hass) {
      return nothing;
    }

    const hasFloors = this._hierarchy.floors.length > 0;
    const isExpanded = this._expandedFloors.has(UNASSIGNED_FLOOR);

    return html`
      <div class="floor unassigned">
        <div
          class="floor-header"
          .floorId=${UNASSIGNED_FLOOR}
          @click=${this._handleFloorHeaderClick}
        >
          ${hasFloors
            ? html`
                <ha-svg-icon
                  class="expand-icon"
                  .path=${isExpanded ? mdiChevronDown : mdiChevronRight}
                ></ha-svg-icon>
                <span class="floor-name">
                  ${this.hass.localize(
                    "ui.panel.home.editor.reorder_areas.other_areas"
                  )}
                </span>
              `
            : nothing}
        </div>
        ${!hasFloors || isExpanded
          ? html`
              <ha-sortable
                handle-selector=".area-handle"
                draggable-selector="ha-md-list-item"
                @item-moved=${this._areaMoved}
                @item-added=${this._areaAdded}
                group="areas"
                .floor=${UNASSIGNED_FLOOR}
              >
                <ha-md-list>
                  ${this._hierarchy.areas.length > 0
                    ? this._hierarchy.areas.map((areaId) =>
                        this._renderArea(areaId)
                      )
                    : html`<p class="empty">
                        ${this.hass.localize(
                          "ui.panel.home.editor.reorder_areas.empty_unassigned"
                        )}
                      </p>`}
                </ha-md-list>
              </ha-sortable>
            `
          : nothing}
      </div>
    `;
  }

  private _renderArea(areaId: string) {
    const area = this.hass!.areas[areaId];
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

  private _toggleFloor(floorId: string): void {
    if (this._expandedFloors.has(floorId)) {
      this._expandedFloors.delete(floorId);
    } else {
      this._expandedFloors.add(floorId);
    }
    this.requestUpdate();
  }

  private _handleFloorHeaderClick(ev: Event): void {
    const floorId = (ev.currentTarget as any).floorId;
    this._toggleFloor(floorId);
  }

  private _handleDragHandleClick(ev: Event): void {
    ev.stopPropagation();
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

    this._fireConfigChanged();
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

    this._fireConfigChanged();
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
    const newUnassignedAreas = this._hierarchy.areas.filter(
      (id) => id !== area.area_id
    );
    if (newFloorId === null) {
      newUnassignedAreas.splice(index, 0, area.area_id);
    }

    this._hierarchy = {
      ...this._hierarchy,
      floors: this._hierarchy.floors.map((f) => {
        if (f.id === newFloorId) {
          const newAreas = [...f.areas];
          newAreas.splice(index, 0, area.area_id);
          return { ...f, areas: newAreas };
        }
        return {
          ...f,
          areas: f.areas.filter((id) => id !== area.area_id),
        };
      }),
      areas: newUnassignedAreas,
    };

    this._fireConfigChanged();
  }

  private _resetOrder(): void {
    if (!this._config || !this.hass) {
      return;
    }

    // Reset to registry order
    this._computeHierarchy();

    // Clear the custom order configuration
    const config: HomeDashboardStrategyConfig = {
      ...this._config,
      areas_order: undefined,
    };

    fireEvent(this, "config-changed", { config });
  }

  private _fireConfigChanged(): void {
    if (!this._hierarchy || !this._config) {
      return;
    }

    // Build the areas order configuration from current hierarchy
    const areasOrder = buildAreasOrderFromHierarchy(this._hierarchy);

    // Create updated config
    const config: HomeDashboardStrategyConfig = {
      ...this._config,
      areas_order: areasOrder,
    };

    // Fire config-changed event for the strategy
    fireEvent(this, "config-changed", { config });
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const favoriteEntities = ev.detail.value as string[];

    const config: HomeDashboardStrategyConfig = {
      ...this._config,
      favorite_entities: favoriteEntities,
    };

    if (config.favorite_entities?.length === 0) {
      delete config.favorite_entities;
    }

    fireEvent(this, "config-changed", { config });
  }

  static styles: CSSResultGroup = css`
    :host {
      display: block;
    }

    ha-entities-picker {
      display: block;
      margin-bottom: var(--ha-space-4);
    }

    .section-divider {
      height: 1px;
      background-color: var(--divider-color);
      margin: var(--ha-space-6) 0;
    }

    .reorder-section {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-4);
    }

    .section-header h3 {
      margin: 0 0 var(--ha-space-2) 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--primary-text-color);
    }

    .section-description {
      margin: 0 0 var(--ha-space-4) 0;
      font-size: 14px;
      color: var(--secondary-text-color);
    }

    .reorder-content {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-4);
    }

    .floors {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-4);
    }

    .floor {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      overflow: hidden;
    }

    .floor.unassigned {
      margin-top: var(--ha-space-2);
    }

    .floor-header {
      display: flex;
      align-items: center;
      padding: var(--ha-space-3) var(--ha-space-4);
      background-color: var(--secondary-background-color);
      gap: var(--ha-space-3);
      cursor: pointer;
      user-select: none;
    }

    .floor-header:hover {
      background-color: var(--state-hover-color);
    }

    .expand-icon {
      color: var(--secondary-text-color);
      transition: transform 0.2s;
    }

    .floor-name {
      flex: 1;
      font-weight: var(--ha-font-weight-medium);
    }

    .floor-handle {
      cursor: grab;
      color: var(--secondary-text-color);
    }

    .floor-handle:hover {
      color: var(--primary-text-color);
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

    .area-handle:hover {
      color: var(--primary-text-color);
    }

    .empty {
      padding: var(--ha-space-4);
      text-align: center;
      color: var(--secondary-text-color);
      font-style: italic;
      margin: 0;
    }

    .sortable-ghost {
      opacity: 0.4;
    }

    .sortable-drag {
      background: var(--card-background-color);
    }

    .reset-container {
      display: flex;
      justify-content: flex-end;
      padding-top: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-home-dashboard-strategy-editor": HuiHomeDashboardStrategyEditor;
  }
}
