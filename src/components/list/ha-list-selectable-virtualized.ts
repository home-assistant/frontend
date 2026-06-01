import type { PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { HaListItemOption } from "../item/ha-list-item-option";
import { SelectableMixin } from "./ha-list-selectable-mixin";
import {
  HaListVirtualized,
  type HaListVirtualizedItem,
} from "./ha-list-virtualized";
import type { HaListSelectedDetail } from "./types";

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
 * @fires ha-list-selected - Lower-level index-based event from the base mixin.
 */
@customElement("ha-list-selectable-virtualized")
export class HaListSelectableVirtualized extends SelectableMixin(
  HaListVirtualized
) {
  @property({ attribute: false }) public value?: string[];

  private _syncing = false;

  public get selectedItems(): HaListVirtualizedItem[] {
    return this.sortedSelectedIndices().map((i) => this.rows[i]);
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener(
      "ha-list-selected",
      this._onSelectionChanged as EventListener
    );
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener(
      "ha-list-selected",
      this._onSelectionChanged as EventListener
    );
  }

  public override willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("rows") || changedProps.has("value")) {
      this._syncSelectionFromValue();
    }
  }

  private _syncSelectionFromValue(): void {
    if (!this.rows) {
      return;
    }
    const valueSet = new Set(this.value ?? []);
    const indexes = new Set<number>();
    this.rows.forEach((row, i) => {
      if (valueSet.has(row.id)) {
        indexes.add(i);
      }
    });
    this._syncing = true;
    try {
      this.setSelected(indexes);
    } finally {
      this._syncing = false;
    }
  }

  private _onSelectionChanged = (ev: CustomEvent<HaListSelectedDetail>) => {
    if (this._syncing) {
      return;
    }
    if (!(ev.detail.index instanceof Set)) {
      return;
    }
    const selectedSet = ev.detail.index;
    const visibleIds = new Set(this.rows?.map((r) => r.id) ?? []);
    // Preserve ids that are selected but not in the current (filtered) rows.
    const preserved = (this.value ?? []).filter((id) => !visibleIds.has(id));
    const visibleSelectedIds: string[] = [];
    selectedSet.forEach((i) => {
      const id = this.rows[i]?.id;
      if (id !== undefined) {
        visibleSelectedIds.push(id);
      }
    });
    const newValue = [...preserved, ...visibleSelectedIds];

    const prevSet = new Set(this.value ?? []);
    const nextSet = new Set(newValue);
    const added = newValue.filter((id) => !prevSet.has(id));
    const removed = (this.value ?? []).filter((id) => !nextSet.has(id));
    if (!added.length && !removed.length) {
      return;
    }
    this.value = newValue;
    fireEvent(this, "ha-list-value-changed", {
      value: newValue,
      added,
      removed,
    });
  };

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

  protected forEachVisibleOption(
    callback: (opt: HaListItemOption, index: number) => void
  ): void {
    if (!this.virtualizerElement || this.rangeStart === -1) {
      return;
    }
    Array.from(this.virtualizerElement.children).forEach((child, i) => {
      if (child instanceof HaListItemOption) {
        callback(child, this.rangeStart + i);
      }
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-selectable-virtualized": HaListSelectableVirtualized;
  }
}
