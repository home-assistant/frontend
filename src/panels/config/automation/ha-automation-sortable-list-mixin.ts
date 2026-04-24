import deepClone from "deep-clone-simple";
import type { LitElement } from "lit";
import { property, state } from "lit/decorators";
import { ensureArray } from "../../../common/array/ensure-array";
import { storage } from "../../../common/decorators/storage";
import { fireEvent } from "../../../common/dom/fire_event";
import { nextRender } from "../../../common/util/render-status";
import type { AutomationClipboard } from "../../../data/automation";
import type { Constructor, HomeAssistant } from "../../../types";

export const AutomationSortableListMixin = <T extends object>(
  superClass: Constructor<LitElement>
) => {
  class AutomationSortableListClass extends superClass {
    @property({ attribute: false }) public hass!: HomeAssistant;

    @property({ type: Boolean }) public disabled = false;

    @property({ type: Boolean }) public narrow = false;

    @property({ type: Boolean, attribute: "sidebar" }) public optionsInSidebar =
      false;

    @state() protected rowSortSelected?: number;

    @state()
    @storage({
      key: "automationClipboard",
      state: true,
      subscribe: true,
      storage: "sessionStorage",
    })
    public _clipboard?: AutomationClipboard;

    protected focusLastItemOnChange = false;

    protected focusItemIndexOnChange?: number;

    private _itemKeys = new WeakMap<T, string>();

    protected get items(): T[] {
      throw new Error("Not implemented");
    }

    protected set items(_items: T[]) {
      throw new Error("Not implemented");
    }

    protected getKey(item: T): string {
      if (!this._itemKeys.has(item)) {
        this._itemKeys.set(item, Math.random().toString());
      }

      return this._itemKeys.get(item)!;
    }

    protected moveUp(ev) {
      ev.stopPropagation();
      const index = (ev.target as any).index;
      if (!(ev.target as any).first) {
        const newIndex = index - 1;
        this.move(index, newIndex);
        if (this.rowSortSelected === index) {
          this.rowSortSelected = newIndex;
        }
        ev.target.focus();
      }
    }

    protected moveDown(ev) {
      ev.stopPropagation();
      const index = (ev.target as any).index;
      if (!(ev.target as any).last) {
        const newIndex = index + 1;
        this.move(index, newIndex);
        if (this.rowSortSelected === index) {
          this.rowSortSelected = newIndex;
        }
        ev.target.focus();
      }
    }

    protected move(oldIndex: number, newIndex: number) {
      const items = this.items.concat();
      const item = items.splice(oldIndex, 1)[0];
      items.splice(newIndex, 0, item);
      this.items = items;
      fireEvent(this, "value-changed", { value: items });
    }

    protected itemMoved(ev: CustomEvent): void {
      ev.stopPropagation();
      const { oldIndex, newIndex } = ev.detail;
      this.move(oldIndex, newIndex);
    }

    protected async itemAdded(ev: CustomEvent): Promise<void> {
      ev.stopPropagation();
      const { index, data } = ev.detail;
      const selected = (ev.detail.item as any).selected;

      let items = [
        ...this.items.slice(0, index),
        data,
        ...this.items.slice(index),
      ];
      // Add item locally to avoid UI jump
      this.items = items;
      if (selected) {
        this.focusItemIndexOnChange = items.length === 1 ? 0 : index;
      }
      await nextRender();
      if (this.items !== items) {
        // Ensure item is added even after update
        items = [
          ...this.items.slice(0, index),
          data,
          ...this.items.slice(index),
        ];
        if (selected) {
          this.focusItemIndexOnChange = items.length === 1 ? 0 : index;
        }
      }
      fireEvent(this, "value-changed", { value: items });
    }

    protected async itemRemoved(ev: CustomEvent): Promise<void> {
      ev.stopPropagation();
      const { index } = ev.detail;
      const item = this.items[index];
      // Remove item locally to avoid UI jump
      this.items = this.items.filter((i) => i !== item);
      await nextRender();
      // Ensure item is removed even after update
      const items = this.items.filter((i) => i !== item);
      fireEvent(this, "value-changed", { value: items });
    }

    protected itemChanged(ev: CustomEvent) {
      ev.stopPropagation();
      const items = [...this.items];
      const newValue = ev.detail.value;
      const index = (ev.target as any).index;

      if (newValue === null) {
        items.splice(index, 1);
      } else {
        // Store key on new value.
        const key = this.getKey(items[index]);
        this._itemKeys.set(newValue, key);

        items[index] = newValue;
      }

      this.items = items;
      fireEvent(this, "value-changed", { value: items });
    }

    protected duplicateItem(ev: CustomEvent) {
      ev.stopPropagation();
      const index = (ev.target as any).index;
      fireEvent(this, "value-changed", {
        // @ts-expect-error Requires library bump to ES2023
        value: this.items.toSpliced(index + 1, 0, deepClone(this.items[index])),
      });
    }

    protected pasteItem(ev: CustomEvent) {
      ev.stopPropagation();
      if (!ev.detail.item) return;

      const index = (ev.target as any).index;
      const clonedItem = deepClone(ev.detail.item);

      this.setHighlightedItems(ensureArray(clonedItem));

      fireEvent(this, "value-changed", {
        // @ts-expect-error Requires library bump to ES2023
        value: this.items.toSpliced(index + 1, 0, clonedItem),
      });
    }

    protected insertAfter(ev: CustomEvent) {
      ev.stopPropagation();
      const index = (ev.target as any).index;
      const inserted = ensureArray(ev.detail.value);
      this.setHighlightedItems(inserted);
      fireEvent(this, "value-changed", {
        // @ts-expect-error Requires library bump to ES2023
        value: this.items.toSpliced(index + 1, 0, ...inserted),
      });
    }

    protected setHighlightedItems(_items: T[]) {
      throw new Error("Not implemented");
    }

    protected handleDragKeydown(ev: KeyboardEvent) {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.stopPropagation();
        this.rowSortSelected =
          this.rowSortSelected === undefined
            ? (ev.target as any).index
            : undefined;
      }
    }

    protected stopSortSelection() {
      this.rowSortSelected = undefined;
    }
  }
  return AutomationSortableListClass;
};
