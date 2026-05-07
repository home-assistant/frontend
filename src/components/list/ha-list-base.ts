import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { tinykeys } from "tinykeys";
import { fireEvent } from "../../common/dom/fire_event";
import { HaListItemBase } from "../item/ha-list-item-base";
import "./types";

/**
 * @element ha-list-base
 * @extends {LitElement}
 *
 * @summary
 * Base list container with roving-tabindex keyboard navigation (ArrowUp/Down,
 * Home/End, optional Enter/Space activation, optional wrap-focus). Discovers
 * slotted `HaListItemBase` descendants. Subclasses override `hostRole` and/or
 * `render()` to specialize.
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

  private _activeItemIndex = -1;

  private _firstFocusableIndex = -1;

  private _lastFocusableIndex = -1;

  private _hasFocusableItem = false;

  private _unbindKeys?: () => void;

  public connectedCallback() {
    super.connectedCallback();
    if (!this.hasAttribute("ha-list")) {
      this.setAttribute("ha-list", "");
    }
    if (!this.hasAttribute("role") && this.hostRole) {
      this.setAttribute("role", this.hostRole);
    }
    this._unbindKeys = tinykeys(this, {
      ArrowDown: this._onForward,
      ArrowUp: this._onBack,
      Home: this._onHome,
      End: this._onEnd,
      Enter: this._onActivate,
      Space: this._onActivate,
    });
    this.addEventListener("focusin", this._onFocusIn);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unbindKeys?.();
    this._unbindKeys = undefined;
    this.removeEventListener("focusin", this._onFocusIn);
  }

  public firstUpdated(changed: PropertyValues) {
    super.firstUpdated(changed);
    this.updateListItems();
  }

  public focus(options?: FocusOptions) {
    if (!this.items.length) {
      super.focus(options);
      return;
    }
    this.focusItemAtIndex(
      this._activeItemIndex >= 0 ? this._activeItemIndex : 0
    );
  }

  public focusItemAtIndex(index: number) {
    if (index < 0) {
      return;
    }
    this.setActiveItemIndex(index, true);
  }

  public getActiveItemIndex(): number {
    return this._activeItemIndex;
  }

  public setActiveItemIndex(index: number, focusItem = false) {
    if (!this._hasFocusableItem) {
      this._activeItemIndex = -1;
      return;
    }
    this._activeItemIndex = Math.max(0, Math.min(this.items.length - 1, index));
    if (!this._isFocusable(this._activeItemIndex)) {
      this._activeItemIndex = this._firstFocusableIndex;
    }
    this._applyActive(focusItem);
  }

  public updateListItems() {
    const next = this._discoverListItems();
    const changed =
      next.length !== this.items.length ||
      next.some((it, i) => it !== this.items[i]);
    if (!changed) {
      return;
    }
    this.items = next;
    this._recomputeFocusableIndexes();
    if (
      this._activeItemIndex >= next.length ||
      !this._hasFocusableItem ||
      this._activeItemIndex < 0
    ) {
      this._activeItemIndex = this._firstFocusableIndex;
    }
    this._applyActive(false);
  }

  private _recomputeFocusableIndexes() {
    let first = -1;
    let last = -1;
    for (let i = 0; i < this.items.length; i++) {
      if (this._isFocusable(i)) {
        if (first === -1) {
          first = i;
        }
        last = i;
      }
    }
    this._firstFocusableIndex = first;
    this._lastFocusableIndex = last;
    this._hasFocusableItem = first !== -1;
  }

  public handleSlotChange = () => {
    this.updateListItems();
  };

  protected render(): TemplateResult {
    return html`<div part="base" class="base">
      <slot @slotchange=${this.handleSlotChange}></slot>
    </div>`;
  }

  private _discoverListItems(): HaListItemBase[] {
    const slot =
      this.renderRoot?.querySelector<HTMLSlotElement>("slot:not([name])");
    if (!slot) {
      return [];
    }
    return slot
      .assignedElements({ flatten: true })
      .filter((el): el is HaListItemBase => el instanceof HaListItemBase);
  }

  private _isFocusable(index: number): boolean {
    const item = this.items[index];
    return !!item && item.interactive && !item.disabled;
  }

  private _applyActive(focusItem: boolean) {
    this.items.forEach((item, i) => {
      if (!item.interactive || item.disabled) {
        item.removeAttribute("tabindex");
        return;
      }
      item.tabIndex = i === this._activeItemIndex ? 0 : -1;
    });
    if (focusItem && this._activeItemIndex >= 0) {
      this.items[this._activeItemIndex]?.focus();
    }
  }

  private _onFocusIn = (ev: FocusEvent) => {
    const path = ev.composedPath();
    for (let i = 0; i < this.items.length; i++) {
      if (path.includes(this.items[i])) {
        if (i !== this._activeItemIndex) {
          this._activeItemIndex = i;
          this._applyActive(false);
        }
        return;
      }
    }
  };

  private _onForward = (ev: KeyboardEvent) => {
    this._moveFocus(ev, this._stepIndex(this._activeItemIndex, 1));
  };

  private _onBack = (ev: KeyboardEvent) => {
    this._moveFocus(ev, this._stepIndex(this._activeItemIndex, -1));
  };

  private _onHome = (ev: KeyboardEvent) => {
    this._moveFocus(ev, this._firstFocusableIndex);
  };

  private _onEnd = (ev: KeyboardEvent) => {
    this._moveFocus(ev, this._lastFocusableIndex);
  };

  private _onActivate = (ev: KeyboardEvent) => {
    if (!this._isFocusable(this._activeItemIndex)) {
      return;
    }
    ev.preventDefault();
    const active = this.items[this._activeItemIndex];
    active.activate();
    fireEvent(this, "ha-list-activated", {
      index: this._activeItemIndex,
      item: active,
    });
  };

  private _moveFocus(ev: KeyboardEvent, next: number) {
    if (!this._hasFocusableItem || next < 0 || next === this._activeItemIndex) {
      return;
    }
    ev.preventDefault();
    this._activeItemIndex = next;
    this._applyActive(true);
  }

  /**
   * Step from `from` by `delta`, skipping non-interactive and disabled items.
   * Returns `from` when no other focusable item can be reached (honouring
   * `wrapFocus`).
   */
  private _stepIndex(from: number, delta: 1 | -1): number {
    const n = this.items.length;
    if (!n || !this._hasFocusableItem) {
      return from;
    }
    let i = from;
    for (let step = 0; step < n; step++) {
      i += delta;
      if (i < 0 || i >= n) {
        if (!this.wrapFocus) {
          return from;
        }
        i = (i + n) % n;
      }
      if (this._isFocusable(i)) {
        return i;
      }
    }
    return from;
  }

  static styles: CSSResultGroup = css`
    :host {
      display: block;
      --ha-list-gap: 0;
      --ha-list-padding: 0;
    }
    .base {
      display: flex;
      flex-direction: column;
      gap: var(--ha-list-gap);
      padding: var(--ha-list-padding);
      margin: 0;
      list-style: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-base": HaListBase;
  }
}
