import { mdiTextureBox } from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeFloorName } from "../common/entity/compute_floor_name";
import { getAreaContext } from "../common/entity/context/get_area_context";
import { stringCompare } from "../common/string/compare";
import { areaCompare } from "../data/area_registry";
import type { FloorRegistryEntry } from "../data/floor_registry";
import type { HomeAssistant } from "../types";
import "./ha-expansion-panel";
import "./ha-floor-icon";
import "./ha-items-display-editor";
import type { DisplayItem, DisplayValue } from "./ha-items-display-editor";
import "./ha-svg-icon";
import "./ha-textfield";

export interface AreasDisplayValue {
  hidden?: string[];
  order?: string[];
}

const UNASSIGNED_FLOOR = "__unassigned__";

@customElement("ha-areas-floors-display-editor")
export class HaAreasFloorsDisplayEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property({ attribute: false }) public value?: AreasDisplayValue;

  @property() public helper?: string;

  @property({ type: Boolean }) public expanded = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, attribute: "show-navigation-button" })
  public showNavigationButton = false;

  protected render(): TemplateResult {
    const groupedItems = this._groupedItems(this.hass.areas, this.hass.floors);

    const filteredFloors = this._sortedFloors(this.hass.floors).filter(
      (floor) =>
        // Only include floors that have areas assigned to them
        groupedItems[floor.floor_id]?.length > 0
    );

    const value: DisplayValue = {
      order: this.value?.order ?? [],
      hidden: this.value?.hidden ?? [],
    };

    return html`
      <ha-expansion-panel
        outlined
        .header=${this.label}
        .expanded=${this.expanded}
      >
        <ha-svg-icon slot="leading-icon" .path=${mdiTextureBox}></ha-svg-icon>
        ${filteredFloors.map((floor, _, array) => {
          const noFloors =
            array.length === 1 && floor.floor_id === UNASSIGNED_FLOOR;
          return html`
            <div class="floor">
              ${noFloors
                ? nothing
                : html`<div class="header">
                    <ha-floor-icon .floor=${floor}></ha-floor-icon>
                    <p>${computeFloorName(floor)}</p>
                  </div>`}
              <div class="areas">
                <ha-items-display-editor
                  .hass=${this.hass}
                  .items=${groupedItems[floor.floor_id] || []}
                  .value=${value}
                  .floorId=${floor.floor_id ?? UNASSIGNED_FLOOR}
                  @value-changed=${this._areaDisplayChanged}
                  .showNavigationButton=${this.showNavigationButton}
                ></ha-items-display-editor>
              </div>
            </div>
          `;
        })}
      </ha-expansion-panel>
    `;
  }

  private _groupedItems = memoizeOne(
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
            description: floor?.name,
          });

          return acc;
        },
        {} as Record<string, DisplayItem[]>
      );
      return groupedItems;
    }
  );

  private _sortedFloors = memoizeOne(
    (hassFloors: HomeAssistant["floors"]): FloorRegistryEntry[] => {
      const floors = Object.values(hassFloors).sort((floorA, floorB) => {
        if (floorA.level !== floorB.level) {
          return (floorA.level ?? 0) - (floorB.level ?? 0);
        }
        return stringCompare(floorA.name, floorB.name);
      });
      floors.push({
        floor_id: UNASSIGNED_FLOOR,
        name: this.hass.localize(
          "ui.panel.lovelace.strategy.areas.others_areas"
        ),
        icon: null,
        level: null,
        aliases: [],
        created_at: 0,
        modified_at: 0,
      });
      return floors;
    }
  );

  private async _areaDisplayChanged(ev) {
    ev.stopPropagation();
    const value = ev.detail.value as DisplayValue;
    const currentFloorId = ev.currentTarget.floorId;

    const floorIds = this._sortedFloors(this.hass.floors).map(
      (floor) => floor.floor_id
    );

    const oldHidden = this.value?.hidden ?? [];
    const oldOrder = this.value?.order ?? [];

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

    const newValue: AreasDisplayValue = {
      hidden: newHidden,
      order: newOrder,
    };
    if (newValue.hidden?.length === 0) {
      delete newValue.hidden;
    }
    if (newValue.order?.length === 0) {
      delete newValue.order;
    }
    this.value = newValue;
    fireEvent(this, "value-changed", { value: newValue });
  }

  static styles = css`
    .floor .header p {
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      flex: 1;
    }
    .floor .header {
      margin: 16px 0 8px 0;
      padding: 0 8px;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
    }
    ha-expansion-panel {
      margin-bottom: 8px;
      --expansion-panel-summary-padding: 0 16px;
    }
    ha-expansion-panel [slot="leading-icon"] {
      margin-inline-end: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-areas-floors-display-editor": HaAreasFloorsDisplayEditor;
  }
}
