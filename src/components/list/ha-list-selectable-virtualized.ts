import { customElement } from "lit/decorators";
import { HaListItemOption } from "../item/ha-list-item-option";
import { SelectableMixin } from "./ha-list-selectable-mixin";
import { HaListVirtualized } from "./ha-list-virtualized";

/**
 * @element ha-list-selectable-virtualized
 * @extends {HaListVirtualized}
 *
 * @summary
 * Virtualized selection list (role `listbox`). Rows must render
 * `<ha-list-item-option>` as their top-level element. Selection is driven by
 * the id-based `value` property; the component handles index/id translation
 * and fires `ha-list-value-changed` when the user changes the selection.
 *
 * Pass an externally-filtered subset of rows and the full `value`: ids that
 * aren't in `rows` are preserved untouched, so filtering the visible list
 * doesn't deselect items outside the current view.
 *
 * @attr {boolean} multi - Whether multiple options can be selected at once.
 *
 * @fires ha-list-value-changed - Fires on user-driven selection changes.
 *   `detail: { value, added, removed }` (all id-arrays).
 * @fires ha-list-item-selected - Lower-level index-based event from the base mixin.
 * @fires ha-list-item-deselected - Lower-level index-based event from the base mixin.
 */
@customElement("ha-list-selectable-virtualized")
export class HaListSelectableVirtualized extends SelectableMixin(
  HaListVirtualized
) {
  protected optionIndexOf(opt: HaListItemOption): number {
    if (!this.virtualizerElement || this.rangeStart === -1) {
      return -1;
    }
    const index = Array.from(this.virtualizerElement.children).indexOf(opt);
    if (index === -1) {
      return -1;
    }
    return this.rangeStart + index;
  }

  public clearSelection() {
    if (!this.virtualizerElement || this.rangeStart === -1) {
      return;
    }
    Array.from(this.virtualizerElement.children).forEach((opt) => {
      if (opt instanceof HaListItemOption && opt.selected) {
        opt.toggleAttribute("selected", false);
      }
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-selectable-virtualized": HaListSelectableVirtualized;
  }
}
