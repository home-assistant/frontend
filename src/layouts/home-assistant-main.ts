import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HASSDomEvent } from "../common/dom/fire_event";
import { fireEvent } from "../common/dom/fire_event";
import { listenMediaQuery } from "../common/dom/media_query";
import { toggleAttribute } from "../common/dom/toggle_attribute";
import { computeRTLDirection } from "../common/util/compute_rtl";
import "../components/ha-drawer";
import { showNotificationDrawer } from "../dialogs/notifications/show-notification-drawer";
import type { HomeAssistant, Route } from "../types";
import "./partial-panel-resolver";

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-toggle-menu": undefined | { open?: boolean };
    "hass-show-notifications": undefined;
  }
  interface HTMLElementEventMap {
    "hass-toggle-menu": HASSDomEvent<HASSDomEvents["hass-toggle-menu"]>;
  }
}

@customElement("home-assistant-main")
export class HomeAssistantMain extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route?: Route;

  @property({ type: Boolean }) public narrow = false;

  @state() private _sidebarEditMode = false;

  @state() private _externalSidebar = false;

  @state() private _drawerOpen = false;

  constructor() {
    super();
    listenMediaQuery("(max-width: 870px)", (matches) => {
      this.narrow = matches;
    });
  }

  protected render(): TemplateResult {
    const sidebarNarrow = this._sidebarNarrow || this._externalSidebar;

    return html`
      <ha-drawer
        .type=${sidebarNarrow ? "modal" : ""}
        .open=${sidebarNarrow ? this._drawerOpen : undefined}
        .direction=${computeRTLDirection(this.hass)}
        @MDCDrawer:closed=${this._drawerClosed}
      >
        <ha-sidebar
          .hass=${this.hass}
          .narrow=${sidebarNarrow}
          .route=${this.route}
          .alwaysExpand=${sidebarNarrow || this.hass.dockedSidebar === "docked"}
        ></ha-sidebar>
        <partial-panel-resolver
          .narrow=${this.narrow}
          .hass=${this.hass}
          .route=${this.route}
          slot="appContent"
        ></partial-panel-resolver>
      </ha-drawer>
    `;
  }

  protected firstUpdated() {
    import(/* webpackPreload: true */ "../components/ha-sidebar");

    if (this.hass.auth.external) {
      this._externalSidebar =
        this.hass.auth.external.config.hasSidebar === true;
      import("../external_app/external_app_entrypoint").then((mod) =>
        mod.attachExternalToApp(this)
      );
    }

    this.addEventListener("hass-toggle-menu", (ev) => {
      if (this._sidebarEditMode) {
        return;
      }
      if (this._externalSidebar) {
        this.hass.auth.external!.fireMessage({
          type: "sidebar/show",
        });
        return;
      }
      if (this._sidebarNarrow) {
        this._drawerOpen = ev.detail?.open ?? !this._drawerOpen;
      } else {
        fireEvent(this, "hass-dock-sidebar", {
          dock: ev.detail?.open
            ? "docked"
            : ev.detail?.open === false
              ? "auto"
              : this.hass.dockedSidebar === "auto"
                ? "docked"
                : "auto",
        });
      }
    });

    this.addEventListener("hass-show-notifications", () => {
      showNotificationDrawer(this, {
        narrow: this.narrow,
      });
    });
  }

  public willUpdate(changedProps: PropertyValues) {
    if (changedProps.has("route") && this._sidebarNarrow) {
      this._drawerOpen = false;
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    toggleAttribute(this, "expanded", this.hass.dockedSidebar === "docked");

    toggleAttribute(
      this,
      "modal",
      this._sidebarNarrow || this._externalSidebar
    );
  }

  private get _sidebarNarrow() {
    return this.narrow || this.hass.dockedSidebar === "always_hidden";
  }

  private _drawerClosed() {
    this._drawerOpen = false;
    this._sidebarEditMode = false;
  }

  static styles = css`
    :host {
      color: var(--primary-text-color);
      /* remove the grey tap highlights in iOS on the fullscreen touch targets */
      -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
      --mdc-drawer-width: calc(56px + var(--safe-area-inset-left, 0px));
      --mdc-top-app-bar-width: calc(
        100% - var(--mdc-drawer-width, 0px) - var(
            --safe-area-inset-left,
            0px
          ) - var(--safe-area-inset-right, 0px)
      );
      --safe-area-content-inset-left: 0px;
      --safe-area-content-inset-right: var(--safe-area-inset-right);
    }
    :host([expanded]) {
      --mdc-drawer-width: calc(256px + var(--safe-area-inset-left, 0px));
    }
    :host([modal]) {
      --mdc-drawer-width: unset;
      --mdc-top-app-bar-width: unset;
      --safe-area-content-inset-left: var(--safe-area-inset-left);
    }
    partial-panel-resolver,
    ha-sidebar {
      /* allow a light tap highlight on the actual interface elements  */
      -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "home-assistant-main": HomeAssistantMain;
  }
}
