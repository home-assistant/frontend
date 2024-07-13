/* eslint-disable lit/prefer-static-styles */
import { html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import type { SortableEvent } from "sortablejs";
import { fireEvent } from "../common/dom/fire_event";
import type { SortableInstance } from "../resources/sortable";
import { ItemPath } from "../types";

declare global {
  interface HASSDomEvents {
    "item-moved": {
      oldIndex: number;
      newIndex: number;
      oldPath?: ItemPath;
      newPath?: ItemPath;
    };
    "drag-start": undefined;
    "drag-end": undefined;
  }
}

export type HaSortableOptions = Omit<
  SortableInstance.SortableOptions,
  "onStart" | "onChoose" | "onEnd"
>;

@customElement("ha-sortable")
export class HaSortable extends LitElement {
  private _sortable?: SortableInstance;

  @property({ type: Boolean })
  public disabled = false;

  @property({ type: Array })
  public path?: ItemPath;

  @property({ type: Boolean, attribute: "no-style" })
  public noStyle: boolean = false;

  @property({ type: String, attribute: "draggable-selector" })
  public draggableSelector?: string;

  @property({ type: String, attribute: "handle-selector" })
  public handleSelector?: string;

  @property({ type: String })
  public group?: string | SortableInstance.GroupOptions;

  @property({ type: Boolean, attribute: "invert-swap" })
  public invertSwap: boolean = false;

  @property({ attribute: false })
  public options?: HaSortableOptions;

  @property({ type: Boolean })
  public rollback: boolean = true;

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
    if (this.hasUpdated && !this.disabled) {
      this._createSortable();
    }
  }

  protected createRenderRoot() {
    return this;
  }

  protected render() {
    if (this.noStyle) return nothing;
    return html`
      <style>
        .sortable-fallback {
          display: none !important;
        }

        .sortable-ghost {
          box-shadow: 0 0 0 2px var(--primary-color);
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
      ...this.options,
      onChoose: this._handleChoose,
      onStart: this._handleStart,
      onEnd: this._handleEnd,
    };

    if (this.draggableSelector) {
      options.draggable = this.draggableSelector;
    }
    if (this.handleSelector) {
      options.handle = this.handleSelector;
    }
    if (this.invertSwap !== undefined) {
      options.invertSwap = this.invertSwap;
    }
    if (this.group) {
      options.group = this.group;
    }

    this._sortable = new Sortable(container, options);
  }

  private _handleEnd = async (evt: SortableEvent) => {
    fireEvent(this, "drag-end");
    // put back in original location
    if (this.rollback && (evt.item as any).placeholder) {
      (evt.item as any).placeholder.replaceWith(evt.item);
      delete (evt.item as any).placeholder;
    }

    const oldIndex = evt.oldIndex;
    const oldPath = (evt.from.parentElement as HaSortable).path;
    const newIndex = evt.newIndex;
    const newPath = (evt.to.parentElement as HaSortable).path;

    if (
      oldIndex === undefined ||
      newIndex === undefined ||
      (oldIndex === newIndex && oldPath?.join(".") === newPath?.join("."))
    ) {
      return;
    }

    fireEvent(this, "item-moved", {
      oldIndex,
      newIndex,
      oldPath,
      newPath,
    });
  };

  private _handleStart = () => {
    fireEvent(this, "drag-start");
  };

  private _handleChoose = (evt: SortableEvent) => {
    if (!this.rollback) return;
    (evt.item as any).placeholder = document.createComment("sort-placeholder");
    evt.item.after((evt.item as any).placeholder);
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
