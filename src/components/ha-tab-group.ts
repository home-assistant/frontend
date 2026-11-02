import TabGroup from "@home-assistant/webawesome/dist/components/tab-group/tab-group";
import { css, type CSSResultGroup, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import type { SortableEvent } from "sortablejs";
import { DragScrollController } from "../common/controllers/drag-scroll-controller";
import { fireEvent } from "../common/dom/fire_event";
import type { SortableInstance } from "../resources/sortable";

const TOUCH_DRAG_DELAY = 300;

const AUTO_SCROLL_SENSITIVITY = 30;

@customElement("ha-tab-group")
export class HaTabGroup extends TabGroup {
  private _dragScrollController = new DragScrollController(this, {
    selector: ".nav",
  });

  @property({ attribute: "tab-tag" }) override tabTag = "ha-tab-group-tab";

  @property({ attribute: "tab-only", type: Boolean }) tabOnly = true;

  /**
   * Allow reordering tabs by dragging or with Alt+ArrowUp/ArrowDown. Fires
   * `item-moved`; the owner applies the new order.
   */
  @property({ type: Boolean }) public sortable = false;

  /** Drag handle that starts a touch drag without the long press. */
  @property({ attribute: "handle-selector" }) public handleSelector?: string;

  private _sortable?: SortableInstance;

  private _sortPlaceholder?: Comment;

  connectedCallback(): void {
    super.connectedCallback();
    // Prevent the tab group from consuming Alt+Arrow and Cmd+Arrow keys,
    // which browsers use for back/forward navigation.
    this.addEventListener("keydown", this._handleKeyDown, true);
    // Capture, so the delay is set before SortableJS reads it.
    this.addEventListener("touchstart", this._handleTouchStart, {
      capture: true,
      passive: true,
    });
    if (this.hasUpdated && this.sortable) {
      this._createSortable();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._handleKeyDown, true);
    this.removeEventListener("touchstart", this._handleTouchStart, true);
    this._destroySortable();
  }

  protected override updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);
    if (changedProperties.has("sortable")) {
      // Dragging the tab bar to scroll would compete with dragging a tab.
      this._dragScrollController.enabled = !this.sortable;
      if (this.sortable) {
        this._createSortable();
      } else {
        this._destroySortable();
      }
    }
  }

  private async _createSortable() {
    if (this._sortable) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const Sortable = (await import("../resources/sortable")).default;
    if (this._sortable || !this.sortable || !this.isConnected) {
      return;
    }

    // supportPointer is missing from the SortableJS typings.
    const options: SortableInstance.Options & { supportPointer?: boolean } = {
      draggable: this.tabTag,
      // The tab bar scrolls inside the shadow root, where SortableJS can't find it.
      scroll: this.nav,
      // Force the autoscroll fallback because it works better than the native one
      forceAutoScrollFallback: true,
      scrollSensitivity: AUTO_SCROLL_SENSITIVITY,
      scrollSpeed: 20,
      animation: 150,
      // Keep swiping on touch screens for scrolling the tab bar.
      delay: TOUCH_DRAG_DELAY,
      delayOnTouchOnly: true,
      // A scrolling swipe ends in pointercancel, after which SortableJS
      // ignores the next drag. Touch events end with touchend instead.
      supportPointer: false,
      onStart: this._handleSortableStart,
      onEnd: this._handleSortableEnd,
      onUpdate: this._handleSortableUpdate,
    };
    this._sortable = new Sortable(this, options);
  }

  private _destroySortable() {
    this._sortable?.destroy();
    this._sortable = undefined;
    this._removeRtlAutoScrollListeners();
  }

  private _handleTouchStart = (ev: TouchEvent) => {
    if (!this._sortable) {
      return;
    }
    const onHandle =
      !!this.handleSelector &&
      ev
        .composedPath()
        .some(
          (el) => el instanceof Element && el.matches(this.handleSelector!)
        );
    this._sortable.option("delay", onHandle ? 0 : TOUCH_DRAG_DELAY);
  };

  private _handleSortableStart = (evt: SortableEvent) => {
    // Put the tab back after dropping, the owner renders the new order.
    this._sortPlaceholder = document.createComment("sort-placeholder");
    evt.item.after(this._sortPlaceholder);
    // Touch drags add a copy of the tab to this element, which the tab group
    // would show and select as an extra tab. The dimmed tab shows the position.
    this.querySelector(":scope > .sortable-fallback")?.remove();
    if (getComputedStyle(this.nav).direction !== "rtl") {
      return;
    }
    // Capture, so this runs before SortableJS checks for auto scroll.
    const options = { capture: true, passive: true };
    window.addEventListener("dragover", this._unblockRtlAutoScroll, options);
    window.addEventListener("touchmove", this._unblockRtlAutoScroll, options);
  };

  private _removeRtlAutoScrollListeners() {
    window.removeEventListener("dragover", this._unblockRtlAutoScroll, true);
    window.removeEventListener("touchmove", this._unblockRtlAutoScroll, true);
  }

  // SortableJS only auto scrolls left while scrollLeft isn't 0, but in RTL the
  // tab bar starts at 0 and scrolls left into negative values.
  private _unblockRtlAutoScroll = (ev: DragEvent | TouchEvent) => {
    const x = "touches" in ev ? ev.touches[0]?.clientX : ev.clientX;
    if (x === undefined || this.nav.scrollLeft !== 0) {
      return;
    }
    const left = this.nav.getBoundingClientRect().left;
    if (Math.abs(x - left) <= AUTO_SCROLL_SENSITIVITY) {
      this.nav.scrollLeft = -1;
    }
  };

  private _handleSortableEnd = (evt: SortableEvent) => {
    this._removeRtlAutoScrollListeners();
    this._sortPlaceholder?.replaceWith(evt.item);
    this._sortPlaceholder = undefined;
  };

  private _handleSortableUpdate = (evt: SortableEvent) => {
    fireEvent(this, "item-moved", {
      oldIndex: evt.oldIndex!,
      newIndex: evt.newIndex!,
    });
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    // The tab group cancels Enter and Space, so buttons inside a tab would not
    // be pressed.
    if (
      (event.key === "Enter" || event.key === " ") &&
      event.composedPath()[0] instanceof HTMLButtonElement &&
      (event.target as HTMLElement).closest(this.tabTag)
    ) {
      event.stopPropagation();
      return;
    }
    if (event.altKey || event.metaKey) {
      event.stopPropagation();
    }
    if (
      this.sortable &&
      event.altKey &&
      !(event.ctrlKey || event.metaKey) &&
      !event.shiftKey &&
      (event.key === "ArrowUp" || event.key === "ArrowDown")
    ) {
      this._moveTabWithKeyboard(event);
    }
  };

  // Up and down follow the tab order, so they work the same in RTL.
  private _moveTabWithKeyboard(event: KeyboardEvent) {
    const tab = (event.target as HTMLElement).closest(this.tabTag);
    if (!tab) {
      return;
    }
    const tabs = [...this.children].filter(
      (el) => el.localName === this.tabTag
    );
    const oldIndex = tabs.indexOf(tab);
    const newIndex = oldIndex + (event.key === "ArrowUp" ? -1 : 1);
    event.preventDefault();
    if (oldIndex === -1 || newIndex < 0 || newIndex >= tabs.length) {
      return;
    }
    fireEvent(this, "item-moved", { oldIndex, newIndex });
  }

  protected override handleClick(event: MouseEvent) {
    if (this._dragScrollController.scrolled) {
      return;
    }
    super.handleClick(event);
  }

  static get styles(): CSSResultGroup {
    return [
      TabGroup.styles,
      css`
        :host {
          --track-width: 2px;
          --track-color: var(--ha-tab-track-color, var(--divider-color));
          --indicator-color: var(
            --ha-tab-indicator-color,
            var(--primary-color)
          );
          --wa-color-neutral-on-quiet: var(--indicator-color);
        }

        .tab-group-top ::slotted(ha-tab-group-tab[active]) {
          border-block-end: solid var(--track-width) var(--indicator-color);
          margin-block-end: calc(-1 * var(--track-width));
        }

        .tab-group-start ::slotted(ha-tab-group-tab[active]) {
          border-inline-end: solid var(--track-width) var(--indicator-color);
          margin-inline-end: calc(-1 * var(--track-width));
        }

        .tab-group-end ::slotted(ha-tab-group-tab[active]) {
          border-inline-start: solid var(--track-width) var(--indicator-color);
          margin-inline-start: calc(-1 * var(--track-width));
        }

        ::slotted(.sortable-ghost) {
          opacity: 0.4;
        }

        .scroll-button::part(base):hover {
          background-color: transparent;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tab-group": HaTabGroup;
  }
}
