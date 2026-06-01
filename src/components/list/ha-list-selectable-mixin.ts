import { property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { Constructor } from "../../types";
import { HaListItemOption } from "../item/ha-list-item-option";
import type { HaListBase } from "./ha-list-base";
import type { HaListSelectedDetail } from "./types";

/**
 * Adds single/multi selection semantics (role `listbox`) to a list base class.
 * Items must be `<ha-list-item-option>`.
 *
 * Subclasses can override the protected hooks (`_getOption`, `_optionIndexOf`,
 * `_forEachVisibleOption`) to adapt selection to non-DOM-resident items, e.g.
 * the virtualized variant.
 */
export const SelectableMixin = <T extends Constructor<HaListBase>>(
  superClass: T
) => {
  class SelectableClass extends superClass {
    @property({ type: Boolean, reflect: true }) public multi = false;

    protected override readonly hostRole = "listbox";

    protected _selectedIndices?: Set<number>;

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
        this.setAttribute(
          "aria-multiselectable",
          this.multi ? "true" : "false"
        );
        if (!this.multi && (this._selectedIndices?.size ?? 0) > 1) {
          const first = Math.min(...this._selectedIndices!);
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
      return (this._selectedIndices?.size ?? 0) === 0
        ? -1
        : this._selectedIndices!.values().next().value!;
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
        const isSelected = this._selectedIndices!.has(index);
        const shouldSelect = force !== undefined ? force : !isSelected;
        this._setSelection(shouldSelect ? new Set([index]) : new Set());
      }
    }

    public clearSelection(): void {
      this._setSelection(new Set());
    }

    public updateListItems() {
      super.updateListItems();
      this.syncItemSelectedState(true);
    }

    /** Hook: index of a clicked option element, or `-1` if it's not ours. */
    protected optionIndexOf(opt: HaListItemOption): number {
      return this.items.indexOf(opt);
    }

    /**
     * Hook: iterate currently rendered options. Called when syncing the
     * `selected` attribute on items.
     */
    protected forEachVisibleOption(
      callback: (opt: HaListItemOption, index: number) => void
    ): void {
      this.items.forEach((item, i) => callback(item as HaListItemOption, i));
    }

    protected syncItemSelectedState(reset = false): void {
      if (!this._selectedIndices || reset) {
        this._selectedIndices = new Set<number>();
        this.forEachVisibleOption((opt, i) => {
          if (opt.selected) {
            this._selectedIndices!.add(i);
          }
        });
        return;
      }

      this.forEachVisibleOption((opt, i) => {
        const shouldBe = this._selectedIndices!.has(i);
        if (opt.selected !== shouldBe) {
          opt.selected = shouldBe;
        }
      });
    }

    protected sortedSelectedIndices(): number[] {
      return [...(this._selectedIndices ?? [])].sort((a, b) => a - b);
    }

    private _setSelection(next: Set<number>): void {
      const prev = this._selectedIndices ?? new Set<number>();
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
      this.syncItemSelectedState();

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
          if (el.disabled) {
            return;
          }
          const index = this.optionIndexOf(el);
          if (index < 0) {
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
  return SelectableClass;
};
