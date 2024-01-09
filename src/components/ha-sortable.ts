/* eslint-disable lit/prefer-static-styles */
import { html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import type { SortableEvent } from "sortablejs";
import { fireEvent } from "../common/dom/fire_event";
import type { SortableInstance } from "../resources/sortable";

declare global {
  interface HASSDomEvents {
    "item-moved": {
      oldIndex: number;
      newIndex: number;
    };
    "item-removed": {
      index: number;
    };
    "item-added": {
      index: number;
      data: any;
    };
  }
}

@customElement("ha-sortable")
export class HaSortable extends LitElement {
  private _sortable?: SortableInstance;

  @property({ type: Boolean })
  public disabled = false;

  @property({ type: Boolean, attribute: "no-style" })
  public noStyle: boolean = false;

  @property({ type: String, attribute: "draggable-selector" })
  public draggableSelector?: string;

  @property({ type: String, attribute: "handle-selector" })
  public handleSelector?: string;

  @property({ type: String, attribute: "group" })
  public group?: string;

  protected updated(changedProperties: PropertyValues<this>) {
    if (changedProperties.has("disabled")) {
      if (this.disabled) {
        this._destroySortable();
      } else {
        this._createSortable();
      }
    }
  }

  // Workaround for connectedCallback just after disconnectedCallback (when dragging sortable with sortable children)
  private _shouldBeDestroy = false;

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._shouldBeDestroy = true;
    setTimeout(() => {
      if (this._shouldBeDestroy) {
        this._destroySortable();
        this._shouldBeDestroy = false;
      }
    }, 1);
  }

  public connectedCallback() {
    super.connectedCallback();
    this._shouldBeDestroy = false;
  }

  protected createRenderRoot() {
    return this;
  }

  protected render() {
    if (this.noStyle) return nothing;
    return html`
      <style>
        .sortable-fallback {
          display: none;
          opacity: 0;
        }

        .sortable-ghost {
          border: 2px solid var(--primary-color);
          background: rgba(var(--rgb-primary-color), 0.25);
          border-radius: 4px;
          opacity: 0.4;
        }

        .sortable-drag {
          border-radius: 4px;
          opacity: 1;
          background: var(--card-background-color);
          box-shadow: 0px 4px 8px 3px #00000026;
          cursor: grabbing;
        }
      </style>
    `;
  }

  private async _createSortable() {
    if (this._sortable) return;
    const container = this.children[0] as HTMLElement | undefined;

    if (!container) return;

    const Sortable = (await import("../resources/sortable")).default;

    const options: SortableInstance.Options = {
      animation: 150,
      swapThreshold: 0.75,
      fallbackOnBody: true,
      onChoose: this._handleChoose,
      onEnd: this._handleEnd,
      onRemove: this._handleRemove,
      onAdd: this._handleAdd,
    };

    if (this.draggableSelector) {
      options.draggable = this.draggableSelector;
    }
    if (this.handleSelector) {
      options.handle = this.handleSelector;
    }
    if (this.group) {
      options.group = this.group;
    }

    this._sortable = new Sortable(container, options);
  }

  private _handleEnd = async (evt: SortableEvent) => {
    // put back in original location
    if ((evt.item as any).placeholder) {
      (evt.item as any).placeholder.replaceWith(evt.item);
      delete (evt.item as any).placeholder;
    }

    if (
      evt.pullMode ||
      evt.oldIndex === undefined ||
      evt.newIndex === undefined ||
      evt.oldIndex === evt.newIndex
    ) {
      return;
    }

    fireEvent(this, "item-moved", {
      oldIndex: evt.oldIndex!,
      newIndex: evt.newIndex!,
    });
  };

  private _handleChoose = (evt: SortableEvent) => {
    (evt.item as any).placeholder = document.createComment("sort-placeholder");
    evt.item.after((evt.item as any).placeholder);
  };

  private _handleRemove = (evt: SortableEvent) => {
    if (!evt.pullMode) return;
    const index = evt.oldIndex;
    const data = (evt.item as any).sortableItemData;
    if (index === undefined || !data) {
      return;
    }

    setTimeout(() => {
      fireEvent(this, "item-removed", {
        index,
      });
    }, 1);
  };

  private _handleAdd = (evt: SortableEvent) => {
    if (!evt.pullMode) return;
    const index = evt.newIndex;
    const data = (evt.item as any).sortableItemData;
    if (index === undefined || !data) {
      return;
    }

    fireEvent(this, "item-added", {
      index,
      data,
    });
  };

  private _destroySortable() {
    if (!this._sortable) return;
    this._sortable.destroy();
    this._sortable = undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sortable": HaSortable;
  }
}
