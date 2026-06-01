import { customElement } from "lit/decorators";
import type { HaListItemOption } from "../item/ha-list-item-option";
import { HaListBase } from "./ha-list-base";
import { SelectableMixin } from "./ha-list-selectable-mixin";

/**
 * @element ha-list-selectable
 * @extends {HaListBase}
 *
 * @summary
 * Selection list (role `listbox`). Items must be `<ha-list-item-option>`.
 * Toggle single vs multi selection via the `multi` attribute.
 *
 * @attr {boolean} multi - Whether multiple options can be selected at once.
 *
 * @fires ha-list-selected - Fired when the selection changes. `detail: HaListSelectedDetail`.
 */
@customElement("ha-list-selectable")
export class HaListSelectable extends SelectableMixin(HaListBase) {
  public get selectedItems(): HaListItemOption[] {
    return this.sortedSelectedIndices()
      .map((i) => this.items[i] as HaListItemOption | undefined)
      .filter((it): it is HaListItemOption => !!it);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-selectable": HaListSelectable;
  }
}
