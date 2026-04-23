import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { HaListBase } from "./ha-list-base";
import { HaListItemOption } from "../item/ha-list-item-option";
import type { HaListSelectedDetail } from "./types";

/**
 * @element ha-list-box
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
@customElement("ha-list-box")
export class HaListBox extends HaListBase {
  @property({ type: Boolean, reflect: true }) public multi = false;

  protected override readonly hostRole = "listbox";

  private _selectedIndices = new Set<number>();

  public connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("click", this._onOptionClick);
    this.setAttribute("aria-multiselectable", this.multi ? "true" : "false");
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("click", this._onOptionClick);
  }

  public updated(changed: Map<string, unknown>) {
    super.updated(changed);
    if (changed.has("multi")) {
      this.setAttribute("aria-multiselectable", this.multi ? "true" : "false");
      if (!this.multi && this._selectedIndices.size > 1) {
        const first = Math.min(...this._selectedIndices);
        this._setSelection(new Set([first]));
      }
    }
  }

  /**
   * Returns the current selection. `number` (or `-1` if nothing) when single,
   * `Set<number>` when multi.
   */
  public get selected(): number | Set<number> {
    if (this.multi) {
      return new Set(this._selectedIndices);
    }
    return this._selectedIndices.size === 0
      ? -1
      : this._selectedIndices.values().next().value!;
  }

  public get selectedItems(): HaListItemOption[] {
    return this._sortedSelectedIndices()
      .map((i) => this.items[i] as HaListItemOption | undefined)
      .filter((it): it is HaListItemOption => !!it);
  }

  /** Replace the entire selection. */
  public setSelected(indices: number | number[] | Set<number>): void {
    const next =
      typeof indices === "number"
        ? indices < 0
          ? new Set<number>()
          : new Set([indices])
        : new Set(indices);
    if (!this.multi && next.size > 1) {
      const first = Math.min(...next);
      this._setSelection(new Set([first]));
      return;
    }
    this._setSelection(next);
  }

  public select(index: number): void {
    if (index < 0) {
      return;
    }
    if (this.multi) {
      const next = new Set(this._selectedIndices);
      next.add(index);
      this._setSelection(next);
    } else {
      this._setSelection(new Set([index]));
    }
  }

  public toggle(index: number, force?: boolean): void {
    if (index < 0) {
      return;
    }
    if (this.multi) {
      const next = new Set(this._selectedIndices);
      const isSelected = next.has(index);
      const shouldSelect = force !== undefined ? force : !isSelected;
      if (shouldSelect) {
        next.add(index);
      } else {
        next.delete(index);
      }
      this._setSelection(next);
    } else {
      const isSelected = this._selectedIndices.has(index);
      const shouldSelect = force !== undefined ? force : !isSelected;
      this._setSelection(shouldSelect ? new Set([index]) : new Set());
    }
  }

  public clearSelection(): void {
    this._setSelection(new Set());
  }

  public updateListItems() {
    super.updateListItems();
    this._syncItemSelectedState();
  }

  private _sortedSelectedIndices(): number[] {
    return [...this._selectedIndices].sort((a, b) => a - b);
  }

  private _syncItemSelectedState() {
    this.items.forEach((item, i) => {
      const opt = item as HaListItemOption;
      const shouldBe = this._selectedIndices.has(i);
      if (opt.selected !== shouldBe) {
        opt.selected = shouldBe;
      }
    });
  }

  private _setSelection(next: Set<number>): void {
    const prev = this._selectedIndices;
    const added = new Set<number>();
    const removed = new Set<number>();
    next.forEach((i) => {
      if (!prev.has(i)) {
        added.add(i);
      }
    });
    prev.forEach((i) => {
      if (!next.has(i)) {
        removed.add(i);
      }
    });
    if (!added.size && !removed.size) {
      return;
    }

    this._selectedIndices = next;
    this._syncItemSelectedState();

    const detail: HaListSelectedDetail = this.multi
      ? { index: new Set(next), diff: { added, removed } }
      : {
          index: next.size === 0 ? -1 : next.values().next().value!,
          diff: { added, removed },
        };
    fireEvent(this, "ha-list-selected", detail);
  }

  private _onOptionClick = (ev: Event) => {
    const path = ev.composedPath();
    for (const el of path) {
      if (el === this) {
        return;
      }
      if (el instanceof HaListItemOption) {
        const index = this.items.indexOf(el);
        if (index < 0) {
          return;
        }
        const item = this.items[index];
        if (item.disabled) {
          return;
        }
        if (this.multi) {
          this.toggle(index);
        } else {
          this.select(index);
        }
        return;
      }
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-box": HaListBox;
  }
}
