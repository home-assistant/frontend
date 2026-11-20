import type { ContextType } from "@lit/context";
import { mdiDotsVertical, mdiPencil } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import { updateAreaRegistryEntry } from "../../../data/area/area_registry";
import type { FloorRegistryEntry } from "../../../data/floor_registry";
import { apiContext } from "../../../data/context";
import { showFloorRegistryDetailDialog } from "../areas/show-dialog-floor-registry-detail";

@customElement("ha-floor-group-actions")
export class HaFloorGroupActions extends LitElement {
  @property({ attribute: false }) public floor?: FloorRegistryEntry;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  protected render() {
    if (!this.floor) {
      return nothing;
    }

    return html`
      <ha-dropdown @wa-select=${this._handleAction}>
        <ha-icon-button
          slot="trigger"
          .label=${this._localize("ui.common.overflow_menu_for", {
            name: this.floor.name,
          })}
          .path=${mdiDotsVertical}
        ></ha-icon-button>
        <ha-dropdown-item value="edit">
          <ha-svg-icon slot="icon" .path=${mdiPencil}></ha-svg-icon>
          ${this._localize("ui.panel.config.category.editor.edit")}
        </ha-dropdown-item>
      </ha-dropdown>
    `;
  }

  private _handleAction(ev: HaDropdownSelectEvent<"edit">) {
    if (ev.detail.item.value !== "edit" || !this.floor) {
      return;
    }

    const floor = this.floor;

    showFloorRegistryDetailDialog(this, {
      entry: floor,
      updateEntry: async (updates, addedAreas, removedAreas) => {
        const updatedFloor = await this._api.callWS<FloorRegistryEntry>({
          type: "config/floor_registry/update",
          floor_id: floor.floor_id,
          ...updates,
        });

        addedAreas.forEach((areaId) => {
          updateAreaRegistryEntry(this._api.callWS, areaId, {
            floor_id: updatedFloor.floor_id,
          });
        });

        removedAreas.forEach((areaId) => {
          updateAreaRegistryEntry(this._api.callWS, areaId, {
            floor_id: null,
          });
        });

        return updatedFloor;
      },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-floor-group-actions": HaFloorGroupActions;
  }
}
