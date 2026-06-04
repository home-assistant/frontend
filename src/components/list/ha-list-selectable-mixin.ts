import { property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { Constructor } from "../../types";
import { HaListItemOption } from "../item/ha-list-item-option";
import type { HaListBase } from "./ha-list-base";

export const SelectableMixin = <T extends Constructor<HaListBase>>(
  superClass: T
) => {
  class SelectableClass extends superClass {
    @property({ type: Boolean, reflect: true }) public multi = false;

    protected override readonly hostRole = "listbox";

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
      }
    }

    /** Hook: index of a clicked option element, or `-1` if it's not ours. */
    protected optionIndexOf(opt: HaListItemOption): number {
      return this.items.indexOf(opt);
    }

    public clearSelection() {
      (this.items as HaListItemOption[]).forEach((opt) => {
        if (opt.selected) {
          opt.toggleAttribute("selected", false);
        }
      });
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
            fireEvent(
              this,
              `ha-list-item-${el.selected ? "deselected" : "selected"}`,
              index
            );
            el.toggleAttribute("selected");
            return;
          }

          if (!el.selected) {
            fireEvent(this, "ha-list-item-selected", index);
            // deselect the other optional selected item
            this.clearSelection();
            el.toggleAttribute("selected", true);
          }
        }
      }
    };
  }
  return SelectableClass;
};
