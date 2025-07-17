import { ResizeController } from "@lit-labs/observers/resize-controller";
import { mdiDrag, mdiEye, mdiEyeOff } from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { repeat } from "lit/directives/repeat";
import { until } from "lit/directives/until";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { orderCompare } from "../common/string/compare";
import type { HomeAssistant } from "../types";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-icon-next";
import "./ha-md-list";
import "./ha-md-list-item";
import "./ha-sortable";
import "./ha-svg-icon";

export interface DisplayItem {
  icon?: string | Promise<string | undefined>;
  iconPath?: string;
  value: string;
  label: string;
  description?: string;
  disableSorting?: boolean;
}

export interface DisplayValue {
  order: string[];
  hidden: string[];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-items-display-editor": HaItemDisplayEditor;
  }
  interface HASSDomEvents {
    "item-display-navigate-clicked": { value: string };
  }
}

@customElement("ha-items-display-editor")
export class HaItemDisplayEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public items: DisplayItem[] = [];

  @property({ type: Boolean, attribute: "show-navigation-button" })
  public showNavigationButton = false;

  @property({ type: Boolean, attribute: "dont-sort-visible" })
  public dontSortVisible = false;

  @property({ attribute: false })
  public value: DisplayValue = {
    order: [],
    hidden: [],
  };

  @property({ attribute: false }) public actionsRenderer?: (
    item: DisplayItem
  ) => TemplateResult<1> | typeof nothing;

  /**
   * Used to sort items by keyboard navigation.
   */
  @state() private _dragIndex: number | null = null;

  private _showIcon = new ResizeController(this, {
    callback: (entries) => entries[0]?.contentRect.width > 450,
  });

  protected render() {
    const allItems = this._allItems(
      this.items,
      this.value.hidden,
      this.value.order
    );

    const showIcon = this._showIcon.value;
    return html`
      <ha-sortable
        draggable-selector=".draggable"
        handle-selector=".handle"
        @item-moved=${this._itemMoved}
      >
        <ha-md-list>
          ${repeat(
            allItems,
            (item) => item.value,
            (item: DisplayItem, idx) => {
              const isVisible = !this.value.hidden.includes(item.value);
              const {
                label,
                value,
                description,
                icon,
                iconPath,
                disableSorting,
              } = item;
              return html`
                <ha-md-list-item
                  type="button"
                  @click=${this.showNavigationButton
                    ? this._navigate
                    : undefined}
                  .value=${value}
                  class=${classMap({
                    hidden: !isVisible,
                    draggable: isVisible && !disableSorting,
                    "drag-selected": this._dragIndex === idx,
                  })}
                  @keydown=${isVisible && !disableSorting
                    ? this._listElementKeydown
                    : undefined}
                  .idx=${idx}
                >
                  <span slot="headline">${label}</span>
                  ${description
                    ? html`<span slot="supporting-text">${description}</span>`
                    : nothing}
                  ${!showIcon
                    ? nothing
                    : icon
                      ? html`
                          <ha-icon
                            class="icon"
                            .icon=${until(icon, "")}
                            slot="start"
                          ></ha-icon>
                        `
                      : iconPath
                        ? html`
                            <ha-svg-icon
                              class="icon"
                              .path=${iconPath}
                              slot="start"
                            ></ha-svg-icon>
                          `
                        : nothing}
                  ${this.showNavigationButton
                    ? html`<ha-icon-next slot="end"></ha-icon-next>`
                    : nothing}
                  <div slot="end" class="separator"></div>
                  ${this.actionsRenderer
                    ? html`
                        <div slot="end" @click=${stopPropagation}>
                          ${this.actionsRenderer(item)}
                        </div>
                      `
                    : nothing}
                  <ha-icon-button
                    .path=${isVisible ? mdiEye : mdiEyeOff}
                    slot="end"
                    .label=${this.hass.localize(
                      `ui.components.items-display-editor.${isVisible ? "hide" : "show"}`,
                      {
                        label: label,
                      }
                    )}
                    .value=${value}
                    @click=${this._toggle}
                  ></ha-icon-button>
                  ${isVisible && !disableSorting
                    ? html`
                        <ha-svg-icon
                          tabindex=${ifDefined(
                            this.showNavigationButton ? "0" : undefined
                          )}
                          .idx=${idx}
                          @keydown=${this.showNavigationButton
                            ? this._dragHandleKeydown
                            : undefined}
                          class="handle"
                          .path=${mdiDrag}
                          slot="end"
                        ></ha-svg-icon>
                      `
                    : html`<ha-svg-icon slot="end"></ha-svg-icon>`}
                </ha-md-list-item>
              `;
            }
          )}
        </ha-md-list>
      </ha-sortable>
    `;
  }

  private _toggle(ev) {
    ev.stopPropagation();
    this._dragIndex = null;
    const value = ev.currentTarget.value;

    const hiddenItems = this._hiddenItems(this.items, this.value.hidden);

    const newHidden = hiddenItems.map((item) => item.value);

    if (newHidden.includes(value)) {
      newHidden.splice(newHidden.indexOf(value), 1);
    } else {
      newHidden.push(value);
    }

    const newVisibleItems = this._visibleItems(
      this.items,
      newHidden,
      this.value.order
    );
    const newOrder = newVisibleItems.map((a) => a.value);

    this.value = {
      hidden: newHidden,
      order: newOrder,
    };
    fireEvent(this, "value-changed", { value: this.value });
  }

  private _itemMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;

    this._moveItem(oldIndex, newIndex);
  }

  private _moveItem(oldIndex, newIndex) {
    if (oldIndex === newIndex) {
      return;
    }

    const visibleItems = this._visibleItems(
      this.items,
      this.value.hidden,
      this.value.order
    );
    const newOrder = visibleItems.map((item) => item.value);

    const movedItem = newOrder.splice(oldIndex, 1)[0];
    newOrder.splice(newIndex, 0, movedItem);

    this.value = {
      ...this.value,
      order: newOrder,
    };
    fireEvent(this, "value-changed", { value: this.value });
  }

  private _navigate(ev) {
    const value = ev.currentTarget.value;
    fireEvent(this, "item-display-navigate-clicked", { value });
    ev.stopPropagation();
  }

  private _visibleItems = memoizeOne(
    (items: DisplayItem[], hidden: string[], order: string[]) => {
      const compare = orderCompare(order);

      const visibleItems = items.filter((item) => !hidden.includes(item.value));
      if (this.dontSortVisible) {
        return [
          ...visibleItems.filter((item) => !item.disableSorting),
          ...visibleItems.filter((item) => item.disableSorting),
        ];
      }

      return visibleItems.sort((a, b) =>
        a.disableSorting && !b.disableSorting ? -1 : compare(a.value, b.value)
      );
    }
  );

  private _allItems = memoizeOne(
    (items: DisplayItem[], hidden: string[], order: string[]) => {
      const visibleItems = this._visibleItems(items, hidden, order);
      const hiddenItems = this._hiddenItems(items, hidden);
      return [...visibleItems, ...hiddenItems];
    }
  );

  private _hiddenItems = memoizeOne((items: DisplayItem[], hidden: string[]) =>
    items.filter((item) => hidden.includes(item.value))
  );

  private _maxSortableIndex = memoizeOne(
    (items: DisplayItem[], hidden: string[]) =>
      items.filter(
        (item) => !item.disableSorting && !hidden.includes(item.value)
      ).length - 1
  );

  private _keyActivatedMove = (ev: KeyboardEvent, clearDragIndex = false) => {
    const oldIndex = this._dragIndex;

    if (ev.key === "ArrowUp") {
      this._dragIndex = Math.max(0, this._dragIndex! - 1);
    } else {
      this._dragIndex = Math.min(
        this._maxSortableIndex(this.items, this.value.hidden),
        this._dragIndex! + 1
      );
    }
    this._moveItem(oldIndex, this._dragIndex);

    // refocus the item after the sort
    setTimeout(async () => {
      await this.updateComplete;
      const selectedElement = this.shadowRoot?.querySelector(
        `ha-md-list-item:nth-child(${this._dragIndex! + 1})`
      ) as HTMLElement | null;
      selectedElement?.focus();
      if (clearDragIndex) {
        this._dragIndex = null;
      }
    });
  };

  private _sortKeydown = (ev: KeyboardEvent) => {
    if (
      this._dragIndex !== null &&
      (ev.key === "ArrowUp" || ev.key === "ArrowDown")
    ) {
      ev.preventDefault();
      this._keyActivatedMove(ev);
    } else if (this._dragIndex !== null && ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      this._dragIndex = null;
      this.removeEventListener("keydown", this._sortKeydown);
    }
  };

  private _listElementKeydown = (ev: KeyboardEvent) => {
    if (ev.altKey && (ev.key === "ArrowUp" || ev.key === "ArrowDown")) {
      ev.preventDefault();
      this._dragIndex = (ev.target as any).idx;
      this._keyActivatedMove(ev, true);
    } else if (
      (!this.showNavigationButton && ev.key === "Enter") ||
      ev.key === " "
    ) {
      this._dragHandleKeydown(ev);
    }
  };

  private _dragHandleKeydown(ev: KeyboardEvent): void {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      ev.stopPropagation();
      if (this._dragIndex === null) {
        this._dragIndex = (ev.target as any).idx;
        this.addEventListener("keydown", this._sortKeydown);
      } else {
        this.removeEventListener("keydown", this._sortKeydown);
        this._dragIndex = null;
      }
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._sortKeydown);
  }

  static styles = css`
    :host {
      display: block;
    }
    .handle {
      cursor: move;
      padding: 8px;
      margin: -8px;
    }
    .separator {
      width: 1px;
      background-color: var(--divider-color);
      height: 21px;
      margin: 0 -4px;
    }
    ha-md-list {
      padding: 0;
    }
    ha-md-list-item {
      --md-list-item-top-space: 0;
      --md-list-item-bottom-space: 0;
      --md-list-item-leading-space: 8px;
      --md-list-item-trailing-space: 8px;
      --md-list-item-two-line-container-height: 48px;
      --md-list-item-one-line-container-height: 48px;
    }
    ha-md-list-item.drag-selected {
      box-shadow:
        0px 0px 8px 4px rgba(var(--rgb-accent-color), 0.8),
        inset 0px 2px 8px 4px rgba(var(--rgb-accent-color), 0.4);
      border-radius: 8px;
    }
    ha-md-list-item ha-icon-button {
      margin-left: -12px;
      margin-right: -12px;
    }
    ha-md-list-item.hidden {
      --md-list-item-label-text-color: var(--disabled-text-color);
      --md-list-item-supporting-text-color: var(--disabled-text-color);
    }
    ha-md-list-item.hidden .icon {
      color: var(--disabled-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-items-display-editor": HaItemDisplayEditor;
  }
}
