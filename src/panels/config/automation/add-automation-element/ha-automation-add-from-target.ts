import "@home-assistant/webawesome/dist/components/tree-item/tree-item";
import "@home-assistant/webawesome/dist/components/tree/tree";
import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  getAreasNestedInFloors,
  UNASSIGNED_FLOOR_ID,
  type AreaFloorValue,
} from "../../../../data/area_floor";
import {
  areasContext,
  devicesContext,
  entitiesContext,
  floorsContext,
  statesContext,
} from "../../../../data/context";
import type { FloorComboBoxItem } from "../../../../data/floor_registry";
import type { HomeAssistant } from "../../../../types";

const SEPARATOR = "________";

@customElement("ha-automation-add-from-target")
export default class HaAutomationAddFromTarget extends LitElement {
  @state()
  @consume<any>({ context: statesContext, subscribe: true })
  private states!: HomeAssistant["states"];

  @state()
  @consume({ context: floorsContext, subscribe: true })
  private floors!: HomeAssistant["floors"];

  @state()
  @consume({ context: areasContext, subscribe: true })
  private areas!: HomeAssistant["areas"];

  @state()
  @consume({ context: devicesContext, subscribe: true })
  private devices!: HomeAssistant["devices"];

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  private entities!: HomeAssistant["entities"];

  private _getAreasAndFloorsMemoized = memoizeOne(getAreasNestedInFloors);

  protected render() {
    const areaFloors = this._getAreaFloors();

    return html`
      <wa-tree>
        ${areaFloors.map(({ id, primary, areas }, index) =>
          index === 0 && id === UNASSIGNED_FLOOR_ID
            ? this._renderAreas(areas)
            : html`<wa-tree-item>
                ${primary} ${this._renderAreas(areas)}
              </wa-tree-item>`
        )}
      </wa-tree>
    `;
  }

  private _renderAreas(areas: FloorComboBoxItem[]) {
    return areas.map(
      ({ primary }) => html`<wa-tree-item> ${primary} </wa-tree-item>`
    );
  }

  private _getAreaFloors = () =>
    this._getAreasAndFloorsMemoized(
      this.states,
      this.floors,
      this.areas,
      this.devices,
      this.entities,
      this._formatValue
    );

  private _formatValue = memoizeOne((value: AreaFloorValue): string =>
    [value.type, value.id].join(SEPARATOR)
  );

  static styles = css``;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-add-from-target": HaAutomationAddFromTarget;
  }
}
