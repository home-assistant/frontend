import TabGroup from "@home-assistant/webawesome/dist/components/tab-group/tab-group";
import { css, type CSSResultGroup, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import type { SortableEvent } from "sortablejs";
import { DragScrollController } from "../common/controllers/drag-scroll-controller";
import { fireEvent } from "../common/dom/fire_event";
import type { SortableInstance } from "../resources/sortable";

const TOUCH_DRAG_DELAY = 300;

@customElement("ha-tab-group")
export class HaTabGroup extends TabGroup {
  private _dragScrollController = new DragScrollController(this, {
    selector: ".nav",
  });

  @property({ attribute: "tab-tag" }) override tabTag = "ha-tab-group-tab";

  @property({ attribute: "tab-only", type: Boolean }) tabOnly = true;

  /**
   * Allow tabs to be reordered by dragging. Fires `item-moved` with the old
   * and new index of the tab; the tabs are put back in place, so the owner
   * has to update its data to apply the new order.
   */
  @property({ type: Boolean }) public sortable = false;

  /**
   * Drag handle inside a tab. On touch screens a tab otherwise needs a long
   * press before it can be dragged; from the handle the drag starts right away.
   */
  @property({ attribute: "handle-selector" }) public handleSelector?: string;

  private _sortable?: SortableInstance;

  private _sortPlaceholders = new WeakMap<HTMLElement, Comment>();

  connectedCallback(): void {
    super.connectedCallback();
    // Prevent the tab group from consuming Alt+Arrow and Cmd+Arrow keys,
    // which browsers use for back/forward navigation.
    this.addEventListener("keydown", this._handleKeyDown, true);
    // Runs before SortableJS reads the delay in its own touchstart listener.
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

    // The tabs are slotted children of this element, so the host is the
    // sortable container.
    // supportPointer is missing from the SortableJS typings.
    const options: SortableInstance.Options & { supportPointer?: boolean } = {
      draggable: this.tabTag,
      // The tabs scroll inside the shadow root, which SortableJS can't find
      // by walking up from the host, so point auto scroll at it directly.
      scroll: this.nav,
      // Force the autoscroll fallback because it works better than the native one
      forceAutoScrollFallback: true,
      scrollSpeed: 20,
      animation: 150,
      // Keep swiping the tab bar on touch screens for scrolling.
      delay: TOUCH_DRAG_DELAY,
      delayOnTouchOnly: true,
      // With pointer events, a swipe that scrolls the tab bar ends in
      // pointercancel, which SortableJS doesn't reset on and then ignores the
      // next drag. Touch events always end with touchend.
      supportPointer: false,
      onChoose: this._handleSortableChoose,
      onEnd: this._handleSortableEnd,
      onUpdate: this._handleSortableUpdate,
    };
    this._sortable = new Sortable(this, options);
  }

  private _destroySortable() {
    this._sortable?.destroy();
    this._sortable = undefined;
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

  // Remember where the tab was, so it can be put back after dropping and the
  // owner stays in control of the rendered order.
  private _handleSortableChoose = (evt: SortableEvent) => {
    const placeholder = document.createComment("sort-placeholder");
    this._sortPlaceholders.set(evt.item, placeholder);
    evt.item.after(placeholder);
  };

  private _handleSortableEnd = (evt: SortableEvent) => {
    const placeholder = this._sortPlaceholders.get(evt.item);
    if (placeholder) {
      placeholder.replaceWith(evt.item);
      this._sortPlaceholders.delete(evt.item);
    }
  };

  private _handleSortableUpdate = (evt: SortableEvent) => {
    fireEvent(this, "item-moved", {
      oldIndex: evt.oldIndex!,
      newIndex: evt.newIndex!,
    });
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.metaKey) {
      event.stopPropagation();
    }
  };

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
