import "@home-assistant/webawesome/dist/components/drawer/drawer";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { HASSDomEvent } from "../common/dom/fire_event";
import { SwipeGestureRecognizer } from "../common/util/swipe-gesture-recognizer";

declare global {
  interface HASSDomEvents {
    "hass-drawer-closed": undefined;
    "hass-layout-transition": { active: boolean; reason?: string };
  }
  interface HTMLElementEventMap {
    "hass-drawer-closed": HASSDomEvent<HASSDomEvents["hass-drawer-closed"]>;
    "hass-layout-transition": HASSDomEvent<
      HASSDomEvents["hass-layout-transition"]
    >;
  }
}

@customElement("ha-drawer")
export class HaDrawer extends LitElement {
  private static readonly _SWIPE_AXIS_TOLERANCE = 32;

  @property({ reflect: true }) public direction: "ltr" | "rtl" = "ltr";

  @property() public type = "";

  @property({ type: Boolean, reflect: true }) public open = false;

  @query("wa-drawer") private _modalDrawer?: HTMLElement;

  @query(".sidebar-shell") private _sidebarShell?: HTMLElement;

  private _sidebarTransitionActive = false;

  private _transitionTarget?: HTMLElement;

  private _gestureRecognizer = new SwipeGestureRecognizer({
    velocitySwipeThreshold: 0.35,
  });

  private _touchStartY = 0;

  private _touchDeltaY = 0;

  private get _modal() {
    return this.type === "modal";
  }

  protected render(): TemplateResult {
    return this._modal
      ? html`
          <slot name="appContent"></slot>
          <wa-drawer
            placement="start"
            .open=${this.open}
            light-dismiss
            without-header
            @touchstart=${this._handleTouchStart}
            @wa-after-hide=${this._handleAfterHide}
          >
            <slot></slot>
          </wa-drawer>
        `
      : html`
          <div class="layout">
            <div class="sidebar-shell">
              <slot></slot>
            </div>
            <div class="app-content">
              <slot name="appContent"></slot>
            </div>
          </div>
        `;
  }

  protected updated(_: PropertyValues<this>) {
    this._syncTransitionListeners();

    if (!this.open) {
      this._resetSwipeTracking();
    }
  }

  protected firstUpdated() {
    this._syncTransitionListeners();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._removeTransitionListeners();
    this._unregisterSwipeHandlers();
  }

  private _handleAfterHide(ev: Event) {
    ev.stopPropagation();
    this.open = false;
    fireEvent(this, "hass-drawer-closed");
  }

  private _closeModalDrawer() {
    this.open = false;
  }

  private _handleDrawerTransitionStart = (ev: TransitionEvent) => {
    if (ev.propertyName !== "width" || this._sidebarTransitionActive) {
      return;
    }
    this._sidebarTransitionActive = true;
    fireEvent(window, "hass-layout-transition", {
      active: true,
      reason: "sidebar",
    });
  };

  private _handleDrawerTransitionEnd = (ev: TransitionEvent) => {
    if (ev.propertyName !== "width" || !this._sidebarTransitionActive) {
      return;
    }
    this._sidebarTransitionActive = false;
    fireEvent(window, "hass-layout-transition", {
      active: false,
      reason: "sidebar",
    });
  };

  private _handleTouchStart = (ev: TouchEvent) => {
    if (!this._modal || !this.open) {
      return;
    }

    const drawer = this._modalDrawer;
    const dialog = drawer?.shadowRoot?.querySelector(
      "dialog"
    ) as HTMLDialogElement | null;

    if (!dialog) {
      return;
    }

    const path = ev.composedPath();

    if (!path.includes(dialog)) {
      return;
    }

    ev.stopPropagation();
    this._startSwipeTracking(ev.touches[0].clientX, ev.touches[0].clientY);
  };

  private _startSwipeTracking(clientX: number, clientY: number) {
    document.addEventListener("touchmove", this._handleTouchMove, {
      passive: true,
    });
    document.addEventListener("touchend", this._handleTouchEnd);
    document.addEventListener("touchcancel", this._handleTouchEnd);

    this._touchStartY = clientY;
    this._touchDeltaY = 0;
    this._gestureRecognizer.start(clientX);
  }

  private _handleTouchMove = (ev: TouchEvent) => {
    const currentX = ev.touches[0].clientX;
    const currentY = ev.touches[0].clientY;
    this._touchDeltaY = Math.abs(currentY - this._touchStartY);
    this._gestureRecognizer.move(currentX);
  };

  private _handleTouchEnd = () => {
    this._unregisterSwipeHandlers();

    const result = this._gestureRecognizer.end();
    const isHorizontalGesture =
      Math.abs(result.delta) >
      this._touchDeltaY + HaDrawer._SWIPE_AXIS_TOLERANCE;

    if (!isHorizontalGesture) {
      this._resetSwipeTracking();
      return;
    }

    const drawerDialog = this._modalDrawer?.shadowRoot?.querySelector(
      '[part="dialog"]'
    ) as HTMLElement | null;
    const drawerWidth = drawerDialog?.offsetWidth || 0;

    if (result.isSwipe) {
      const closeByVelocity =
        this.direction === "rtl"
          ? result.isDownwardSwipe
          : !result.isDownwardSwipe;

      if (closeByVelocity) {
        this._closeModalDrawer();
      }
      return;
    }

    const closeByDistance =
      drawerWidth > 0 &&
      (this.direction === "rtl"
        ? result.delta > 0 && Math.abs(result.delta) > drawerWidth * 0.5
        : result.delta < 0 && Math.abs(result.delta) > drawerWidth * 0.5);

    if (closeByDistance) {
      this._closeModalDrawer();
    }
  };

  private _unregisterSwipeHandlers() {
    document.removeEventListener("touchmove", this._handleTouchMove);
    document.removeEventListener("touchend", this._handleTouchEnd);
    document.removeEventListener("touchcancel", this._handleTouchEnd);
  }

  private _resetSwipeTracking() {
    this._unregisterSwipeHandlers();
    this._gestureRecognizer.reset();
    this._touchStartY = 0;
    this._touchDeltaY = 0;
  }

  private _syncTransitionListeners() {
    if (this._transitionTarget === this._sidebarShell) {
      return;
    }

    this._removeTransitionListeners();

    if (!this._sidebarShell) {
      return;
    }

    this._transitionTarget = this._sidebarShell;
    this._transitionTarget.addEventListener(
      "transitionstart",
      this._handleDrawerTransitionStart
    );
    this._transitionTarget.addEventListener(
      "transitionend",
      this._handleDrawerTransitionEnd
    );
    this._transitionTarget.addEventListener(
      "transitioncancel",
      this._handleDrawerTransitionEnd
    );
  }

  private _removeTransitionListeners() {
    if (!this._transitionTarget) {
      return;
    }

    this._transitionTarget.removeEventListener(
      "transitionstart",
      this._handleDrawerTransitionStart
    );
    this._transitionTarget.removeEventListener(
      "transitionend",
      this._handleDrawerTransitionEnd
    );
    this._transitionTarget.removeEventListener(
      "transitioncancel",
      this._handleDrawerTransitionEnd
    );
    this._transitionTarget = undefined;
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    
    .layout {
      height: 100%;
    }

    .sidebar-shell {
      position: fixed;
      width: var(--ha-sidebar-width);
      height: 100%;
      border-inline-end: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      box-sizing: border-box;
      transition: width var(--ha-animation-duration-normal) ease;
    }

    .app-content {
      overflow: unset;
      min-width: 0;
      padding-inline-start: var(--ha-sidebar-width);
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }

    wa-drawer {
      --size: var(--ha-sidebar-width, 256px);
      --show-duration: var(--ha-animation-duration-normal);
      --hide-duration: var(--ha-animation-duration-normal);
    }

    wa-drawer::part(body) {
      margin: 0;
      padding: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-drawer": HaDrawer;
  }
}
