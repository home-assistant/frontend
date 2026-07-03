import { css, html, LitElement, type nothing, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { tinykeys } from "tinykeys";
import { compareNodeOrder } from "../../common/dom/compare-node-order";
import { fireEvent, type HASSDomEvent } from "../../common/dom/fire_event";
import { haStyleScrollbar } from "../../resources/styles";
import type { HaListItemBase } from "../item/ha-list-item-base";
import "./types";
import type { HaListItemRegistrationDetail } from "./types";

/**
 * @element ha-list-base
 * @extends {LitElement}
 *
 * @summary
 * Base list container with roving-tabindex keyboard navigation (ArrowUp/Down,
 * Home/End, optional Enter/Space activation, optional wrap-focus). Tracks
 * `HaListItemBase` descendants via the `ha-list-item-register` /
 * `ha-list-item-unregister` events they fire on connect/disconnect — works
 * across any nesting depth and shadow boundaries. Subclasses override
 * `hostRole` and/or `render()` to specialize.
 *
 * @slot - List items (`<ha-list-item-*>`).
 *
 * @csspart base - The outer container (`<div role="list">`).
 *
 * @cssprop --ha-list-gap - Spacing between items. Defaults to `0`.
 * @cssprop --ha-list-padding - Padding around the list content. Defaults to `0`.
 *
 * @attr {boolean} wrap-focus - Whether ArrowUp/Down navigation wraps at the ends.
 * @attr {string} aria-label - Accessible label for the list.
 *
 * @fires ha-list-activated - Fired when an item is activated via Enter/Space. `detail: { index, item }`.
 */
@customElement("ha-list-base")
export class HaListBase extends LitElement {
  @property({ type: Boolean, attribute: "wrap-focus" })
  public wrapFocus = false;

  @property({ type: String, attribute: "aria-label", reflect: true })
  public ariaLabel: string | null = null;

  public items: readonly HaListItemBase[] = [];

  /** Host `role` attribute. Empty string means no role is set. */
  protected readonly hostRole: string = "list";

  protected activeItemIndex = -1;

  protected firstFocusableIndex = -1;

  protected lastFocusableIndex = -1;

  protected hasFocusableItem = false;

  private _unbindKeys?: () => void;

  public connectedCallback() {
    super.connectedCallback();
    if (!this.hasAttribute("ha-list")) {
      this.setAttribute("ha-list", "");
    }
    if (!this.hasAttribute("role") && this.hostRole) {
      this.setAttribute("role", this.hostRole);
    }
    this._unbindKeys = tinykeys(
      this,
      {
        ArrowDown: this._onForward,
        ArrowUp: this._onBack,
        Home: this._onHome,
        End: this._onEnd,
        PageDown: this._onPageDown,
        PageUp: this._onPageUp,
        Enter: this.onActivate,
        Space: this.onActivate,
      },
      { ignore: this._ignoreKeyEvent }
    );
    this.addEventListener("focusin", this.onFocusIn);
    this.addEventListener(
      "ha-list-item-register",
      this.onItemRegister as EventListener
    );
    this.addEventListener(
      "ha-list-item-unregister",
      this.onItemUnregister as EventListener
    );
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unbindKeys?.();
    this._unbindKeys = undefined;
    this.removeEventListener("focusin", this.onFocusIn);
    this.removeEventListener(
      "ha-list-item-register",
      this.onItemRegister as EventListener
    );
    this.removeEventListener(
      "ha-list-item-unregister",
      this.onItemUnregister as EventListener
    );
  }

  public focus(options?: FocusOptions) {
    if (!this.itemCount) {
      super.focus(options);
      return;
    }
    this.focusItemAtIndex(this.activeItemIndex >= 0 ? this.activeItemIndex : 0);
  }

  public focusItemAtIndex(index: number) {
    if (index < 0) {
      return;
    }
    this.setActiveItemIndex(index, true);
  }

  public getActiveItemIndex(): number {
    return this.activeItemIndex;
  }

  public setActiveItemIndex(index: number, focusItem = false) {
    if (!this.hasFocusableItem) {
      this.activeItemIndex = -1;
      return;
    }
    this.activeItemIndex = Math.max(0, Math.min(this.itemCount - 1, index));
    if (!this.isFocusable(this.activeItemIndex)) {
      this.activeItemIndex = this.firstFocusableIndex;
    }
    this.applyActive(focusItem);
  }

  /**
   * Hook called whenever the items array has changed. Subclasses can override
   * to layer in extra bookkeeping (e.g. selection state sync).
   */
  public updateListItems() {
    this.recomputeFocusableIndexes();
    if (
      this.activeItemIndex >= this.itemCount ||
      !this.hasFocusableItem ||
      this.activeItemIndex < 0
    ) {
      this.activeItemIndex = this.firstFocusableIndex;
    }
    this.applyActive(false);
  }

  protected onItemRegister = (
    ev: HASSDomEvent<HaListItemRegistrationDetail>
  ) => {
    ev.stopPropagation();
    const item = ev.detail.item;
    if (this.items.includes(item)) {
      return;
    }
    const next = [...this.items, item];
    next.sort(compareNodeOrder);
    this.items = next;
    this.updateListItems();
  };

  protected onItemUnregister = (
    ev: HASSDomEvent<HaListItemRegistrationDetail>
  ) => {
    ev.stopPropagation();
    const item = ev.detail.item;
    if (!this.items.includes(item)) {
      return;
    }
    this.items = this.items.filter((it) => it !== item);
    this.updateListItems();
  };

  protected recomputeFocusableIndexes() {
    let first = -1;
    let last = -1;
    for (let i = 0; i < this.itemCount; i++) {
      if (this.isFocusable(i)) {
        if (first === -1) {
          first = i;
        }
        last = i;
      }
    }
    this.firstFocusableIndex = first;
    this.lastFocusableIndex = last;
    this.hasFocusableItem = first !== -1;
  }

  protected render(): TemplateResult | typeof nothing {
    return html`<div part="base" class="base ha-scrollbar">
      <slot></slot>
    </div>`;
  }

  protected isFocusable(index: number): boolean {
    const item = this.items[index];
    return !!item && item.interactive && !item.disabled;
  }

  protected applyActive(focusItem: boolean) {
    this.items.forEach((item, i) => {
      if (!item.interactive || item.disabled) {
        item.removeAttribute("tabindex");
        return;
      }
      item.tabIndex = i === this.activeItemIndex ? 0 : -1;
    });
    if (focusItem && this.activeItemIndex >= 0) {
      this.items[this.activeItemIndex]?.focus();
    }
  }

  protected onFocusIn = (ev: FocusEvent) => {
    const path = ev.composedPath();
    for (let i = 0; i < this.items.length; i++) {
      if (path.includes(this.items[i])) {
        if (i !== this.activeItemIndex) {
          this.activeItemIndex = i;
          this.applyActive(false);
        }
        return;
      }
    }
  };

  private _ignoreKeyEvent = (ev: KeyboardEvent): boolean => {
    if (ev.repeat && (ev.key === "Enter" || ev.key === " ")) {
      return true;
    }
    if (ev.isComposing) {
      return true;
    }
    const target = ev.target as HTMLElement | null;
    // Allow held arrow/Home/End to repeat for continuous navigation
    return (
      !!target &&
      target !== ev.currentTarget &&
      target.matches("[contenteditable],input,select,textarea")
    );
  };

  private _onForward = (ev: KeyboardEvent) => {
    this.moveFocus(ev, this._stepIndex(this.activeItemIndex, 1));
  };

  private _onBack = (ev: KeyboardEvent) => {
    this.moveFocus(ev, this._stepIndex(this.activeItemIndex, -1));
  };

  private _onHome = (ev: KeyboardEvent) => {
    this.moveFocus(ev, this.firstFocusableIndex);
  };

  private _onEnd = (ev: KeyboardEvent) => {
    this.moveFocus(ev, this.lastFocusableIndex);
  };

  private _onPageDown = (ev: KeyboardEvent) => {
    this.moveFocus(
      ev,
      this._stepIndex(this.activeItemIndex, 1, this.getPageSize())
    );
  };

  private _onPageUp = (ev: KeyboardEvent) => {
    this.moveFocus(
      ev,
      this._stepIndex(this.activeItemIndex, -1, this.getPageSize())
    );
  };

  /**
   * Number of items to jump for PageUp/PageDown. Defaults to 10 (per WAI-ARIA
   * Authoring Practices: "moves focus a manageable number of nodes,
   * typically 10"). Subclasses with a known viewport (e.g. virtualized lists)
   * can override to use the visible page size.
   */
  protected getPageSize(): number {
    return 10;
  }

  protected onActivate = (ev: KeyboardEvent) => {
    if (!this.isFocusable(this.activeItemIndex)) {
      return;
    }
    ev.preventDefault();
    const active = this.items[this.activeItemIndex];
    active.activate();
    fireEvent(this, "ha-list-activated", {
      index: this.activeItemIndex,
      item: active,
    });
  };

  protected moveFocus(ev: KeyboardEvent, next: number) {
    if (!this.hasFocusableItem) {
      return;
    }
    ev.preventDefault();
    if (next < 0 || next === this.activeItemIndex) {
      return;
    }
    this.activeItemIndex = next;
    this.applyActive(true);
  }

  protected get itemCount(): number {
    return this.items.length;
  }

  /**
   * Step from `from` by `delta`, skipping non-interactive and disabled items.
   * Pass `count` > 1 to advance by multiple focusable items (PageUp/Down).
   * Returns the last focusable index reached, or `from` when none is.
   */
  private _stepIndex(from: number, delta: 1 | -1, count = 1): number {
    const n = this.itemCount;
    if (!n || !this.hasFocusableItem) {
      return from;
    }
    let last = from;
    let i = from;
    let landed = 0;
    for (let step = 0; step < n && landed < count; step++) {
      i += delta;
      if (i < 0 || i >= n) {
        if (!this.wrapFocus) {
          return last;
        }
        i = (i + n) % n;
      }
      if (this.isFocusable(i)) {
        last = i;
        landed++;
      }
    }
    return last;
  }

  static styles = [
    haStyleScrollbar,
    css`
      :host {
        display: block;
      }
      .base {
        display: flex;
        flex-direction: column;
        gap: var(--ha-list-gap, 0);
        padding: var(--ha-list-padding, 0);
        margin: 0;
        list-style: none;
        overflow-x: hidden;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-base": HaListBase;
  }
}
