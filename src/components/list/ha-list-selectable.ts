import { customElement } from "lit/decorators";
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
 * @attr {boolean} controlled - Only notify on click, never toggle an option's `selected` state.
 *   Set it when the consumer derives `selected` from its own state, for example when a row stands
 *   for a group whose click also changes its children.
 *
 * @fires ha-list-item-selected - An option was selected. `detail: number` (option index).
 * @fires ha-list-item-deselected - An option was deselected (multi mode only). `detail: number` (option index).
 */
@customElement("ha-list-selectable")
export class HaListSelectable extends SelectableMixin(HaListBase) {}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-selectable": HaListSelectable;
  }
}
