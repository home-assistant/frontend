import { ResizeController } from "@lit-labs/observers/resize-controller";
import { mdiDragHorizontalVariant, mdiEye, mdiEyeOff } from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { repeat } from "lit/directives/repeat";
import { until } from "lit/directives/until";
import memoizeOne from "memoize-one";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { orderCompare } from "../common/string/compare";
import type { LocalizeFunc } from "../common/translations/localize";
import { afterNextRender } from "../common/util/render-status";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-icon-next";
import "./ha-sortable";
import "./ha-svg-icon";
import "./item/ha-list-item-button";
import "./list/ha-list-base";

export interface DisplayItem {
  icon?: string | Promise<string | undefined>;
  iconPath?: string;
  value: string;
  label: string;
  description?: string;
  disableSorting?: boolean;
  disableHiding?: boolean;
}

export interface DisplayValue {
  order: string[];
  hidden: string[];
}

// Rows and drag handles get their index set as `.idx` in the template
type IndexedElement = HTMLElement & { idx: number };

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
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

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
        <ha-list-base>
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
                disableHiding,
              } = item;
              return html`
                <ha-list-item-button
                  @click=${
                    this.showNavigationButton ? this._navigate : undefined
                  }
                  .value=${value}
                  class=${classMap({
                    hidden: !isVisible,
                    draggable: isVisible && !disableSorting,
                    "drag-selected": this._dragIndex === idx,
                  })}
                  @keydown=${
                    isVisible && !disableSorting
                      ? this._listElementKeydown
                      : undefined
                  }
                  .idx=${idx}
                >
                  <span slot="headline">${label}</span>
                  ${
                    description
                      ? html`<span slot="supporting-text">${description}</span>`
                      : nothing
                  }
                  ${
                    !showIcon
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
                          : nothing
                  }
                  ${
                    this.showNavigationButton
                      ? html`
                          <ha-icon-next slot="end"></ha-icon-next>
                          <div slot="end" class="separator"></div>
                        `
                      : nothing
                  }
                  ${
                    this.actionsRenderer
                      ? html`
                          <div slot="end" @click=${stopPropagation}>
                            ${this.actionsRenderer(item)}
                          </div>
                        `
                      : nothing
                  }
                  ${
                    !isVisible || !disableHiding
                      ? html`<ha-icon-button
                          .path=${isVisible ? mdiEye : mdiEyeOff}
                          slot="end"
                          .label=${this._localize(
                            `ui.components.items-display-editor.${isVisible ? "hide" : "show"}`,
                            {
                              label: label,
                            }
                          )}
                          .value=${value}
                          @click=${this._toggle}
                          @keydown=${stopPropagation}
                          .disabled=${disableHiding || false}
                        ></ha-icon-button>`
                      : nothing
                  }
                  ${
                    isVisible && !disableSorting
                      ? html`
                          <ha-svg-icon
                            tabindex=${ifDefined(
                              this.showNavigationButton ? "0" : undefined
                            )}
                            .idx=${idx}
                            @keydown=${
                              this.showNavigationButton
                                ? this._dragHandleKeydown
                                : undefined
                            }
                            class="handle"
                            .path=${mdiDragHorizontalVariant}
                            slot="end"
                          ></ha-svg-icon>
                        `
                      : html`<ha-svg-icon slot="end"></ha-svg-icon>`
                  }
                </ha-list-item-button>
              `;
            }
          )}
        </ha-list-base>
      </ha-sortable>
    `;
  }

  private _toggle(ev) {
    ev.stopPropagation();
    this._dragIndex = null;
    const row = ev.currentTarget.closest("ha-list-item-button");
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

    // Hiding or showing moves the row, which can drop focus. Wait for the
    // parent to pass the new value back before refocusing.
    afterNextRender(() => row?.focus());
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

  private _keyActivatedMove = (ev: KeyboardEvent, oldIndex: number) => {
    const newIndex =
      ev.key === "ArrowUp"
        ? Math.max(0, oldIndex - 1)
        : Math.min(
            this._maxSortableIndex(this.items, this.value.hidden),
            oldIndex + 1
          );
    this._moveItem(oldIndex, newIndex);
    if (this._dragIndex !== null) {
      this._dragIndex = newIndex;
    }

    // refocus the item after the sort
    afterNextRender(() => {
      // eslint-disable-next-line lit/prefer-query-decorators
      const selectedElement = this.shadowRoot?.querySelector(
        `ha-list-item-button:nth-child(${newIndex + 1})`
      ) as HTMLElement | null;
      selectedElement?.focus();
    });
  };

  private _sortKeydown = (ev: KeyboardEvent) => {
    if (
      this._dragIndex !== null &&
      (ev.key === "ArrowUp" || ev.key === "ArrowDown")
    ) {
      ev.preventDefault();
      this._keyActivatedMove(ev, this._dragIndex);
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
      this._keyActivatedMove(ev, (ev.currentTarget as IndexedElement).idx);
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
        this._dragIndex = (ev.target as IndexedElement).idx;
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
    ha-list-item-button {
      --ha-row-item-padding-block: 0;
      --ha-row-item-padding-inline: var(--ha-space-2);
    }
    ha-list-item-button::part(start),
    ha-list-item-button::part(end) {
      color: var(--ha-color-text-secondary);
    }
    ha-list-item-button::part(end) {
      gap: var(--ha-space-4);
    }
    ha-list-item-button.drag-selected::part(base) {
      outline-color: rgba(var(--rgb-accent-color), 0.6);
      background-color: rgba(var(--rgb-accent-color), 0.08);
    }
    ha-list-item-button ha-icon-button {
      margin-left: -12px;
      margin-right: -12px;
    }
    ha-list-item-button.hidden,
    ha-list-item-button.hidden::part(supporting-text),
    ha-list-item-button.hidden .icon {
      color: var(--disabled-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-items-display-editor": HaItemDisplayEditor;
  }
}
