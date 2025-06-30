import { mdiDrag, mdiTextureBox } from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeFloorName } from "../common/entity/compute_floor_name";
import { getAreaContext } from "../common/entity/context/get_area_context";
import { areaCompare } from "../data/area_registry";
import type { FloorRegistryEntry } from "../data/floor_registry";
import { getFloors } from "../panels/lovelace/strategies/areas/helpers/areas-strategy-helper";
import type { HomeAssistant } from "../types";
import "./ha-expansion-panel";
import "./ha-floor-icon";
import "./ha-items-display-editor";
import type { DisplayItem, DisplayValue } from "./ha-items-display-editor";
import "./ha-svg-icon";
import "./ha-textfield";

export interface AreasFloorsDisplayValue {
  areas_display?: {
    hidden?: string[];
    order?: string[];
  };
  floors_display?: {
    order?: string[];
  };
}

const UNASSIGNED_FLOOR = "__unassigned__";

@customElement("ha-areas-floors-display-editor")
export class HaAreasFloorsDisplayEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property({ attribute: false }) public value?: AreasFloorsDisplayValue;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, attribute: "show-navigation-button" })
  public showNavigationButton = false;

  protected render(): TemplateResult {
    const groupedAreasItems = this._groupedAreasItems(
      this.hass.areas,
      this.hass.floors
    );

    const filteredFloors = this._sortedFloors(
      this.hass.floors,
      this.value?.floors_display?.order
    ).filter(
      (floor) =>
        // Only include floors that have areas assigned to them
        groupedAreasItems[floor.floor_id]?.length > 0
    );

    const value: DisplayValue = {
      order: this.value?.areas_display?.order ?? [],
      hidden: this.value?.areas_display?.hidden ?? [],
    };

    const canReorderFloors =
      filteredFloors.filter((floor) => floor.floor_id !== UNASSIGNED_FLOOR)
        .length > 1;

    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <ha-sortable
        draggable-selector=".draggable"
        handle-selector=".handle"
        @item-moved=${this._floorMoved}
        .disabled=${this.disabled || !canReorderFloors}
      >
        <div>
          ${repeat(
            filteredFloors,
            (floor) => floor.floor_id,
            (floor: FloorRegistryEntry) => html`
              <ha-expansion-panel
                outlined
                .header=${computeFloorName(floor)}
                left-chevron
                class=${floor.floor_id === UNASSIGNED_FLOOR ? "" : "draggable"}
              >
                <ha-floor-icon
                  slot="leading-icon"
                  .floor=${floor}
                ></ha-floor-icon>
                ${floor.floor_id === UNASSIGNED_FLOOR || !canReorderFloors
                  ? nothing
                  : html`
                      <ha-svg-icon
                        class="handle"
                        slot="icons"
                        .path=${mdiDrag}
                      ></ha-svg-icon>
                    `}
                <ha-items-display-editor
                  .hass=${this.hass}
                  .items=${groupedAreasItems[floor.floor_id]}
                  .value=${value}
                  .floorId=${floor.floor_id}
                  @value-changed=${this._areaDisplayChanged}
                  .showNavigationButton=${this.showNavigationButton}
                ></ha-items-display-editor>
              </ha-expansion-panel>
            `
          )}
        </div>
      </ha-sortable>
    `;
  }

  private _groupedAreasItems = memoizeOne(
    (
      hassAreas: HomeAssistant["areas"],
      // update items if floors change
      _hassFloors: HomeAssistant["floors"]
    ): Record<string, DisplayItem[]> => {
      const compare = areaCompare(hassAreas);

      const areas = Object.values(hassAreas).sort((areaA, areaB) =>
        compare(areaA.area_id, areaB.area_id)
      );
      const groupedItems: Record<string, DisplayItem[]> = areas.reduce(
        (acc, area) => {
          const { floor } = getAreaContext(area, this.hass!);
          const floorId = floor?.floor_id ?? UNASSIGNED_FLOOR;

          if (!acc[floorId]) {
            acc[floorId] = [];
          }
          acc[floorId].push({
            value: area.area_id,
            label: area.name,
            icon: area.icon ?? undefined,
            iconPath: mdiTextureBox,
          });

          return acc;
        },
        {} as Record<string, DisplayItem[]>
      );
      return groupedItems;
    }
  );

  private _sortedFloors = memoizeOne(
    (
      hassFloors: HomeAssistant["floors"],
      order: string[] | undefined
    ): FloorRegistryEntry[] => {
      const floors = getFloors(hassFloors, order);
      const noFloors = floors.length === 0;
      floors.push({
        floor_id: UNASSIGNED_FLOOR,
        name: noFloors
          ? this.hass.localize("ui.panel.lovelace.strategy.areas.areas")
          : this.hass.localize("ui.panel.lovelace.strategy.areas.other_areas"),
        icon: null,
        level: null,
        aliases: [],
        created_at: 0,
        modified_at: 0,
      });
      return floors;
    }
  );

  private _floorMoved(ev: CustomEvent<HASSDomEvents["item-moved"]>) {
    ev.stopPropagation();
    const newIndex = ev.detail.newIndex;
    const oldIndex = ev.detail.oldIndex;
    const floorIds = this._sortedFloors(
      this.hass.floors,
      this.value?.floors_display?.order
    ).map((floor) => floor.floor_id);
    const newOrder = [...floorIds];
    const movedFloorId = newOrder.splice(oldIndex, 1)[0];
    newOrder.splice(newIndex, 0, movedFloorId);
    const newValue: AreasFloorsDisplayValue = {
      areas_display: this.value?.areas_display,
      floors_display: {
        order: newOrder,
      },
    };
    if (newValue.floors_display?.order?.length === 0) {
      delete newValue.floors_display.order;
    }
    fireEvent(this, "value-changed", { value: newValue });
  }

  private async _areaDisplayChanged(ev: CustomEvent<{ value: DisplayValue }>) {
    ev.stopPropagation();
    const value = ev.detail.value;
    const currentFloorId = (ev.currentTarget as any).floorId;

    const floorIds = this._sortedFloors(
      this.hass.floors,
      this.value?.floors_display?.order
    ).map((floor) => floor.floor_id);

    const oldAreaDisplay = this.value?.areas_display ?? {};

    const oldHidden = oldAreaDisplay?.hidden ?? [];
    const oldOrder = oldAreaDisplay?.order ?? [];

    const newHidden: string[] = [];
    const newOrder: string[] = [];

    for (const floorId of floorIds) {
      if ((currentFloorId ?? UNASSIGNED_FLOOR) === floorId) {
        newHidden.push(...(value.hidden ?? []));
        newOrder.push(...(value.order ?? []));
        continue;
      }
      const hidden = oldHidden.filter((areaId) => {
        const id = this.hass.areas[areaId]?.floor_id ?? UNASSIGNED_FLOOR;
        return id === floorId;
      });
      if (hidden?.length) {
        newHidden.push(...hidden);
      }
      const order = oldOrder.filter((areaId) => {
        const id = this.hass.areas[areaId]?.floor_id ?? UNASSIGNED_FLOOR;
        return id === floorId;
      });
      if (order?.length) {
        newOrder.push(...order);
      }
    }

    const newValue: AreasFloorsDisplayValue = {
      areas_display: {
        hidden: newHidden,
        order: newOrder,
      },
      floors_display: this.value?.floors_display,
    };
    if (newValue.areas_display?.hidden?.length === 0) {
      delete newValue.areas_display.hidden;
    }
    if (newValue.areas_display?.order?.length === 0) {
      delete newValue.areas_display.order;
    }
    if (newValue.floors_display?.order?.length === 0) {
      delete newValue.floors_display.order;
    }

    fireEvent(this, "value-changed", { value: newValue });
  }

  static styles = css`
    ha-expansion-panel {
      margin-bottom: 8px;
      --expansion-panel-summary-padding: 0 16px;
    }
    ha-expansion-panel [slot="leading-icon"] {
      margin-inline-end: 16px;
    }
    label {
      display: block;
      font-weight: var(--ha-font-weight-bold);
      margin-bottom: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-areas-floors-display-editor": HaAreasFloorsDisplayEditor;
  }
}
