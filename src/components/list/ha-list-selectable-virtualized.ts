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
 * `<ha-list-item-option>` as their top-level element. Selection is index-based:
 * clicking a row fires `ha-list-item-selected` / `ha-list-item-deselected` with
 * the row's index, and the row's `selected` attribute is toggled. Consumers own
 * the source of truth — set each row's `selected` from their own state (for
 * example, keyed by the option's `value`) and update it in the event handlers.
 *
 * Because selection is tracked per-row by the consumer, filtering the visible
 * `rows` doesn't affect selections for items outside the current view.
 *
 * @attr {boolean} multi - Whether multiple options can be selected at once. In
 *   single-select mode, selecting a row clears any previous selection.
 *
 * @fires ha-list-item-selected - Fires when the user selects a row.
 *   `detail` is the row's index (number).
 * @fires ha-list-item-deselected - Fires when the user deselects a row (multi-select only).
 *   `detail` is the row's index (number).
 */
@customElement("ha-list-selectable-virtualized")
export class HaListSelectableVirtualized extends SelectableMixin(
  HaListVirtualized
) {
  /**
   * Hook: maps a clicked option to its absolute index by offsetting its
   * position among the rendered (virtualized) children by `rangeStart`.
   * Returns `-1` if it's not one of our rows or nothing is rendered yet.
   */
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

  /** Deselects every currently rendered (visible) option. */
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
