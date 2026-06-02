import type { LitVirtualizer } from "@lit-labs/virtualizer";
import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize.js";
import {
  css,
  html,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import {
  customElement,
  eventOptions,
  property,
  query,
  state,
} from "lit/decorators";
import { fireEvent, type HASSDomEvent } from "../../common/dom/fire_event";
import { loadVirtualizer } from "../../resources/virtualizer";
import { HaListItemBase } from "../item/ha-list-item-base";
import { HaListBase } from "./ha-list-base";
import type { HaListItemRegistrationDetail } from "./types";

/**
 * A single row in a {@link HaListVirtualized}. Identified by a stable `id`
 * used as the virtualizer key. Extra fields are passed through to the
 * `rowRenderer`.
 */
export interface HaListVirtualizedItem {
  /** Stable key used by the virtualizer to track the row across re-renders. */
  id: string;
  /** Whether the row can be focused and activated. Defaults to `false`. */
  interactive?: boolean;
  disabled?: boolean;
  [key: string]: unknown;
}

/**
 * @element ha-list-virtualized
 * @extends {HaListBase}
 *
 * @summary
 * Virtualized list. Renders only the rows currently in view to keep large
 * lists performant, while preserving the roving-tabindex keyboard navigation
 * of {@link HaListBase}.
 *
 * @csspart base - The scrollable outer container (`<div>`).
 *
 * @attr {number} pin-index - Row index to scroll to when the list first
 * renders. Cleared once the user scrolls.
 * @attr {string} pin-block - Block alignment for `pin-index`: `start`,
 * `center` (default), `end`, or `nearest`.
 *
 * @fires ha-list-activated - Fired when a row is activated via Enter/Space. `detail: { index, item }`.
 */
@customElement("ha-list-virtualized")
export class HaListVirtualized extends HaListBase {
  @state() private _virtualizerReady = false;

  /**
   * The list data. Each item is rendered by `rowRenderer`; its `interactive`
   * and `disabled` flags determine whether the row is focusable.
   */
  @property({ attribute: false })
  public rows!: HaListVirtualizedItem[];

  /** Renders a single row from its data and index. */
  @property({ attribute: false })
  public rowRenderer?: RenderItemFunction<HaListVirtualizedItem>;

  /** Row index to scroll to on first render (the "pinned" row). */
  @property({ attribute: "pin-index", type: Number }) public pinIndex?: number;

  /** Block alignment used when scrolling to `pinIndex`. */
  @property({ attribute: "pin-block" }) public pinBlock:
    | "start"
    | "center"
    | "end"
    | "nearest" = "center";

  @state() private _unpinned = false;

  @query("lit-virtualizer")
  protected virtualizerElement?: LitVirtualizer<HaListVirtualizedItem>;

  protected rangeStart = -1;
  protected rangeEnd = -1;
  private _activeItemFocus = false;
  private _scrollToActiveItem = false;

  public willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated) {
      this._loadVirtualizer();
    }

    if (changedProps.has("rows")) {
      this.recomputeFocusableIndexes();
      this.activeItemIndex = this.firstFocusableIndex;
    }
  }

  private async _loadVirtualizer() {
    await loadVirtualizer();
    this._virtualizerReady = true;
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this._virtualizerReady) {
      return nothing;
    }

    return html`<div part="base" class="base ha-scrollbar">
      <lit-virtualizer
        .keyFunction=${this._keyFunction}
        tabindex="-1"
        scroller
        .items=${this.rows}
        .renderItem=${this.rowRenderer}
        style="min-height: 36px; height: 100%;"
        .layout=${!this._unpinned && this.pinIndex !== undefined
          ? {
              pin: {
                index: this.pinIndex,
                block: this.pinBlock,
              },
            }
          : undefined}
        @unpinned=${this._handleUnpinned}
        @rangeChanged=${this._handleRangeChanged}
      >
      </lit-virtualizer>
    </div>`;
  }

  /**
   * Sets the active (roving-tabindex) row. If the row is outside the rendered
   * range it is scrolled into view first, then activated/focused once the
   * virtualizer has laid it out.
   * @param index - Row index to make active; clamped to the valid range.
   * @param focusItem - Whether to move DOM focus to the row.
   */
  public setActiveItemIndex(index: number, focusItem = false) {
    if (!this.hasFocusableItem) {
      this.activeItemIndex = -1;
      return;
    }
    this.activeItemIndex = Math.max(0, Math.min(this.rows.length - 1, index));
    if (!this.isFocusable(this.activeItemIndex)) {
      this.activeItemIndex = this.firstFocusableIndex;
    }
    if (
      this.activeItemIndex >= this.rangeStart &&
      this.activeItemIndex <= this.rangeEnd
    ) {
      this.applyActive(focusItem);
    } else {
      this._activeItemFocus = focusItem;
      this._scrollToActiveItem = true;
      this.virtualizerElement
        ?.element(index)
        ?.scrollIntoView({ block: "nearest" });
    }
  }

  /**
   * Focuses the row at `index`, scrolling it into view if needed. No-op until
   * the virtualizer is ready or when `index` is negative.
   */
  public override focusItemAtIndex(index: number) {
    if (!this._virtualizerReady || index < 0) {
      return;
    }
    this.setActiveItemIndex(index, true);
  }

  protected override applyActive(focusItem: boolean) {
    if (this.virtualizerElement && this.rangeStart > -1) {
      Array.from(this.virtualizerElement.children).forEach((child, index) => {
        const el = child as HTMLElement;
        if (index + this.rangeStart === this.activeItemIndex) {
          el.tabIndex = 0;
          if (focusItem) {
            el.focus();
          }
        } else {
          el.removeAttribute("tabindex");
        }
      });
    }
  }

  @eventOptions({ passive: true })
  private async _handleRangeChanged(ev: { first: number; last: number }) {
    this.rangeStart = ev.first;
    this.rangeEnd = ev.last;

    await this.virtualizerElement?.layoutComplete;
    this._applySetSize();

    if (!this.virtualizerElement) {
      return;
    }
    const inRange =
      this.activeItemIndex >= this.rangeStart &&
      this.activeItemIndex <= this.rangeEnd;
    const focus = this._scrollToActiveItem && inRange && this._activeItemFocus;
    this.applyActive(focus);
    if (this._scrollToActiveItem && inRange) {
      this._activeItemFocus = false;
      this._scrollToActiveItem = false;
    }
  }

  // Expose total count + position to assistive tech, since only a slice of
  // items is in the DOM at any time.
  private _applySetSize() {
    if (!this.virtualizerElement || this.rangeStart < 0) {
      return;
    }
    const total = this.rows?.length ?? 0;
    Array.from(this.virtualizerElement.children).forEach((child, index) => {
      const el = child as HTMLElement;
      el.setAttribute("aria-setsize", String(total));
      el.setAttribute("aria-posinset", String(this.rangeStart + index + 1));
    });
  }

  protected onFocusIn = (ev: FocusEvent) => {
    if (
      !this.virtualizerElement ||
      this.rangeStart === -1 ||
      this.rangeEnd === -1
    ) {
      return;
    }
    const path = ev.composedPath();
    const children = Array.from(this.virtualizerElement.children);
    for (let i = this.rangeStart; i <= this.rangeEnd; i++) {
      if (path.includes(children[i - this.rangeStart])) {
        if (i !== this.activeItemIndex) {
          this.activeItemIndex = i;
          if (i < this.rangeStart || i > this.rangeEnd) {
            this._activeItemFocus = true;
            this._scrollToActiveItem = true;
            this.virtualizerElement
              ?.element(this.activeItemIndex)
              ?.scrollIntoView({ block: "nearest" });
          } else {
            this.applyActive(false);
          }
        }
        return;
      }
    }
  };

  protected override onActivate = (ev: KeyboardEvent) => {
    if (!this.isFocusable(this.activeItemIndex)) {
      return;
    }
    if (
      this.virtualizerElement &&
      this.activeItemIndex >= this.rangeStart &&
      this.activeItemIndex <= this.rangeEnd
    ) {
      const active = this.virtualizerElement?.children[
        this.activeItemIndex - this.rangeStart
      ] as HaListItemBase | undefined;
      if (active && active instanceof HaListItemBase) {
        ev.preventDefault();
        active.activate();
        fireEvent(this, "ha-list-activated", {
          index: this.activeItemIndex,
          item: active,
        });
      }
    }
  };

  protected isFocusable(index: number): boolean {
    const item = this.rows[index];
    if (!item) {
      return false;
    }
    const { disabled = false, interactive = false } = this.rows[index];
    return interactive && !disabled;
  }

  protected override get itemCount(): number {
    return this.rows?.length ?? 0;
  }

  protected override moveFocus(ev: KeyboardEvent, next: number) {
    if (!this.hasFocusableItem) {
      return;
    }
    ev.preventDefault();
    if (next < 0 || next === this.activeItemIndex) {
      return;
    }
    this.activeItemIndex = next;
    if (next < this.rangeStart || next > this.rangeEnd) {
      this._activeItemFocus = true;
      this._scrollToActiveItem = true;
      this.virtualizerElement?.element(this.activeItemIndex)?.scrollIntoView({
        block: "nearest",
      });
    } else {
      this.applyActive(true);
    }
  }

  protected override getPageSize(): number {
    if (this.rangeStart < 0 || this.rangeEnd < 0) {
      return super.getPageSize();
    }
    return Math.max(1, this.rangeEnd - this.rangeStart + 1);
  }

  private _keyFunction = (item: HaListVirtualizedItem) => item.id;

  @eventOptions({ passive: true })
  private _handleUnpinned() {
    this._unpinned = true;
  }

  protected override onItemRegister = (
    ev: HASSDomEvent<HaListItemRegistrationDetail>
  ) => {
    ev.stopPropagation();
  };

  protected override onItemUnregister = (
    ev: HASSDomEvent<HaListItemRegistrationDetail>
  ) => {
    ev.stopPropagation();
    // ignore
  };

  static styles = [
    ...HaListBase.styles,
    css`
      .base {
        height: 100%;
      }
      [ha-list-item] {
        width: 100%;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-virtualized": HaListVirtualized;
  }
}
