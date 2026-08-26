import { consume, type ContextType } from "@lit/context";
import { mdiDragHorizontalVariant, mdiTextureBox } from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../common/dom/fire_event";
import { computeFloorName } from "../common/entity/compute_floor_name";
import { getAreaContext } from "../common/entity/context/get_area_context";
import type { LocalizeFunc } from "../common/translations/localize";
import { areasContext, floorsContext } from "../data/context";
import type { FloorRegistryEntry } from "../data/floor_registry";
import { getFloors } from "../panels/lovelace/strategies/areas/helpers/areas-strategy-helper";
import type { ValueChangedEvent } from "../types";
import "./ha-expansion-panel";
import "./ha-floor-icon";
import "./ha-items-display-editor";
import type { DisplayItem, DisplayValue } from "./ha-items-display-editor";
import "./ha-svg-icon";

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
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: areasContext, subscribe: true })
  @state()
  private _areas!: ContextType<typeof areasContext>;

  @consume({ context: floorsContext, subscribe: true })
  @state()
  private _floors!: ContextType<typeof floorsContext>;

  @property() public label?: string;

  @property({ attribute: false }) public value?: AreasFloorsDisplayValue;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ attribute: false }) public actionsRenderer?: () =>
    TemplateResult<1> | typeof nothing;

  @property({ type: Boolean, attribute: "show-navigation-button" })
  public showNavigationButton = false;

  protected render(): TemplateResult {
    const groupedAreasItems = this._groupedAreasItems(
      this._areas,
      this._floors
    );

    const filteredFloors = this._sortedFloors(
      this._floors,
      this.value?.floors_display?.order,
      this._localize
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
        invert-swap
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
                ${
                  floor.floor_id === UNASSIGNED_FLOOR || !canReorderFloors
                    ? nothing
                    : html`
                        <ha-svg-icon
                          class="handle"
                          slot="icons"
                          .path=${mdiDragHorizontalVariant}
                        ></ha-svg-icon>
                      `
                }
                <ha-items-display-editor
                  .items=${groupedAreasItems[floor.floor_id]}
                  .value=${value}
                  .floorId=${floor.floor_id}
                  .actionsRenderer=${this.actionsRenderer}
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
      areas: ContextType<typeof areasContext>,
      floors: ContextType<typeof floorsContext>
    ): Record<string, DisplayItem[]> => {
      const areaList = Object.values(areas);

      const groupedItems: Record<string, DisplayItem[]> = areaList.reduce(
        (acc, area) => {
          const { floor } = getAreaContext(area, floors);
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
      floors: ContextType<typeof floorsContext>,
      order: string[] | undefined,
      localize: LocalizeFunc
    ): FloorRegistryEntry[] => {
      const sortedFloors = getFloors(floors, order);
      const noFloors = sortedFloors.length === 0;
      sortedFloors.push({
        floor_id: UNASSIGNED_FLOOR,
        name: noFloors
          ? localize("ui.panel.lovelace.strategy.areas.areas")
          : localize("ui.panel.lovelace.strategy.areas.other_areas"),
        icon: null,
        level: null,
        aliases: [],
        created_at: 0,
        modified_at: 0,
      });
      return sortedFloors;
    }
  );

  private _floorMoved(ev: HASSDomEvent<HASSDomEvents["item-moved"]>) {
    ev.stopPropagation();
    const newIndex = ev.detail.newIndex;
    const oldIndex = ev.detail.oldIndex;
    const floorIds = this._sortedFloors(
      this._floors,
      this.value?.floors_display?.order,
      this._localize
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

  private async _areaDisplayChanged(
    ev: ValueChangedEvent<DisplayValue> &
      HASSDomCurrentTargetEvent<
        HTMLElementTagNameMap["ha-items-display-editor"] & { floorId?: string }
      >
  ) {
    ev.stopPropagation();
    const value = ev.detail.value;
    const currentFloorId = (ev.currentTarget as any).floorId;

    const floorIds = this._sortedFloors(
      this._floors,
      this.value?.floors_display?.order,
      this._localize
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
        const id = this._areas[areaId]?.floor_id ?? UNASSIGNED_FLOOR;
        return id === floorId;
      });
      if (hidden?.length) {
        newHidden.push(...hidden);
      }
      const order = oldOrder.filter((areaId) => {
        const id = this._areas[areaId]?.floor_id ?? UNASSIGNED_FLOOR;
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
