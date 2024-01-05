/* eslint-disable lit/prefer-static-styles */
import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import type { SortableEvent } from "sortablejs";
import type { SortableInstance } from "../resources/sortable";
import { fireEvent } from "../common/dom/fire_event";

declare global {
  interface HASSDomEvents {
    "item-moved": {
      oldIndex: number;
      newIndex: number;
    };
  }
}

@customElement("ha-sortable")
export class HaSortable extends LitElement {
  private _sortable?: SortableInstance;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: String }) public container?: string;

  @property({ type: String }) public item?: string;

  @property({ type: String }) public handle?: string = ".handle";

  protected updated(changedProperties: PropertyValues<this>) {
    if (changedProperties.has("disabled")) {
      if (this.disabled) {
        this._destroySortable();
      } else {
        this._createSortable();
      }
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._destroySortable();
  }

  protected createRenderRoot() {
    return this;
  }

  protected render(): TemplateResult {
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

        .handle {
          cursor: move; /* fallback if grab cursor is unsupported */
          cursor: grab;
        }
      </style>
    `;
  }

  private async _createSortable() {
    const containerElement = (
      this.container ? this.querySelector(this.container) : this.children[0]
    ) as HTMLElement | undefined;

    if (!containerElement) return;

    const Sortable = (await import("../resources/sortable")).default;

    const options: SortableInstance.Options = {
      animation: 150,
      onChoose: this._handleChoose,
      onEnd: this._handleEnd,
    };

    if (this.item) {
      options.draggable = this.item;
    }
    if (this.handle) {
      options.handle = this.handle;
    }
    this._sortable = new Sortable(containerElement, options);
  }

  private _handleEnd = (evt: SortableEvent) => {
    // put back in original location
    if ((evt.item as any).placeholder) {
      (evt.item as any).placeholder.replaceWith(evt.item);
      delete (evt.item as any).placeholder;
    }
    if (evt.oldIndex === evt.newIndex) return;
    fireEvent(this, "item-moved", {
      oldIndex: evt.oldIndex!,
      newIndex: evt.newIndex!,
    });
  };

  private _handleChoose = (evt: SortableEvent) => {
    (evt.item as any).placeholder = document.createComment("sort-placeholder");
    evt.item.after((evt.item as any).placeholder);
  };

  private _destroySortable() {
    this._sortable?.destroy();
    this._sortable = undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sortable": HaSortable;
  }
}
