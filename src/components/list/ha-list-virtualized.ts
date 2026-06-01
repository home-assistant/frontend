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

export interface HaListVirtualizedItem {
  id: string;
  interactive?: boolean;
  disabled?: boolean;
  [key: string]: unknown;
}

/**
 * @element ha-list-virtualized
 * @extends {HaListBase}
 *
 * @summary
 * Virtualized list. Renders only the items currently in view to keep large
 * lists performant.
 */
@customElement("ha-list-virtualized")
export class HaListVirtualized extends HaListBase {
  @state() private _virtualizerReady = false;

  @property({ attribute: false })
  public rows!: HaListVirtualizedItem[];

  @property({ attribute: false })
  public rowRenderer?: RenderItemFunction<HaListVirtualizedItem>;

  @property({ attribute: "pin-index", type: Number }) public pinIndex?: number;

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
    this.onRangeChanged(ev.first, ev.last);

    // rangeChanged fires before the virtualizer renders the new children,
    // so wait for layout to settle before reading/focusing them.
    await this.virtualizerElement?.layoutComplete;
    this._applySetSize();

    if (!this.virtualizerElement) {
      return;
    }
    const inRange =
      this.activeItemIndex >= this.rangeStart &&
      this.activeItemIndex <= this.rangeEnd;
    const focus = this._scrollToActiveItem && inRange && this._activeItemFocus;
    // Always keep roving tabindex in sync with the rendered range so the
    // active item is the tab target — otherwise nothing in the list is
    // tabbable and focus falls through to the scroller container.
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

  /** Hook fired whenever the visible row range changes. */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected onRangeChanged(_first: number, _last: number) {}

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
    // Number of rendered (visible) rows in the current range. Fall back to
    // the base default when the range isn't known yet.
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
