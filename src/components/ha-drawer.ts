import "@home-assistant/webawesome/dist/components/drawer/drawer";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { HASSDomEvent } from "../common/dom/fire_event";

declare global {
  interface HASSDomEvents {
    "hass-drawer-closed": undefined;
    "hass-layout-transition": { active: boolean; reason?: string };
  }
  interface HTMLElementEventMap {
    "hass-drawer-closed": HASSDomEvent<
      HASSDomEvents["hass-drawer-closed"]
    >;
    "hass-layout-transition": HASSDomEvent<
      HASSDomEvents["hass-layout-transition"]
    >;
  }
}

@customElement("ha-drawer")
export class HaDrawer extends LitElement {
  @property({ reflect: true }) public direction: "ltr" | "rtl" = "ltr";

  @property() public type  = "";

  @property({ type: Boolean, reflect: true }) public open = false;

  @query(".sidebar-shell") private _sidebarShell?: HTMLElement;

  private _mc?: HammerManager;

  private _sidebarTransitionActive = false;

  private _swipeSetupId = 0;

  private _transitionTarget?: HTMLElement;

  private get _modal() {
    return this.type === "modal";
  }

  private get _placement() {
    return this.direction === "rtl" ? "end" : "start";
  }

  protected render(): TemplateResult {
    return this._modal
      ? html`
          <slot name="appContent"></slot>
          <wa-drawer
            placement=${this._placement}
            .open=${this.open}
            light-dismiss
            without-header
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

  protected updated(changedProps: PropertyValues<this>) {
    this._syncTransitionListeners();

    if (
      (changedProps.has("direction") || changedProps.has("open")) &&
      this._modal
    ) {
      if (this.open) {
        this._setupSwipe();
      } else if (this._mc) {
        this._mc.destroy();
        this._mc = undefined;
      }
    }

    if (changedProps.has("type")) {
      if (this._modal && this.open) {
        this._setupSwipe();
      } else if (this._mc) {
        this._mc.destroy();
        this._mc = undefined;
      }
    }
  }

  protected firstUpdated() {
    this._syncTransitionListeners();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._removeTransitionListeners();
    if (this._mc) {
      this._mc.destroy();
      this._mc = undefined;
    }
    this._swipeSetupId += 1;
  }

  private _handleAfterHide() {
    this.open = false;
    fireEvent(this, "hass-drawer-closed");
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

  private async _setupSwipe() {
    if (this._mc) {
      this._mc.destroy();
      this._mc = undefined;
    }
    const setupId = ++this._swipeSetupId;

    const hammer = await import("../resources/hammer");
    if (setupId !== this._swipeSetupId || !this.open || !this._modal) {
      return;
    }

    this._mc = new hammer.Manager(document, {
      touchAction: "pan-y",
    });
    this._mc.add(
      new hammer.Swipe({
        direction:
          this.direction === "rtl"
            ? hammer.DIRECTION_RIGHT
            : hammer.DIRECTION_LEFT,
      })
    );
    this._mc.on("swipeleft swiperight", () => {
      fireEvent(this, "hass-toggle-menu", { open: false });
    });
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
      display: flex;
      height: 100%;
    }

    :host([direction="rtl"]) .layout {
      flex-direction: row-reverse;
    }

    .sidebar-shell {
      width: var(--ha-sidebar-width);
      height: 100%;
      flex: 0 0 auto;
      border-inline-end: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      box-sizing: border-box;
      transition: width var(--ha-animation-duration-normal) ease;
    }

    :host([direction="rtl"]) .sidebar-shell {
      border-inline-end: none;
      border-inline-start: 1px solid
        var(--divider-color, rgba(0, 0, 0, 0.12));
    }

    .app-content {
      overflow: unset;
      flex: 1;
      min-width: 0;
      width: 100%;
      box-sizing: border-box;
    }

    wa-drawer {
      --size: var(--ha-sidebar-width, 256px);
      --show-duration: var(--ha-animation-duration-normal);
      --hide-duration: var(--ha-animation-duration-normal);
    }

    wa-drawer::part(dialog) {
      border-color: var(--divider-color, rgba(0, 0, 0, 0.12));
    }

    wa-drawer::part(body) {
      margin: 0;
      padding: 0;
    }

    @media (prefers-reduced-motion: reduce) {
      .sidebar-shell {
        transition: 1ms;
      }

      wa-drawer {
        --show-duration: 1ms;
        --hide-duration: 1ms;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-drawer": HaDrawer;
  }
}
