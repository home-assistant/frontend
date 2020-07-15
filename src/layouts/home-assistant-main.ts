import "@polymer/app-layout/app-drawer-layout/app-drawer-layout";
import type { AppDrawerLayoutElement } from "@polymer/app-layout/app-drawer-layout/app-drawer-layout";
import "@polymer/app-layout/app-drawer/app-drawer";
import type { AppDrawerElement } from "@polymer/app-layout/app-drawer/app-drawer";
import {
  css,
  CSSResult,
  html,
  LitElement,
  property,
  customElement,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { listenMediaQuery } from "../common/dom/media_query";
import { fireEvent } from "../common/dom/fire_event";
import { toggleAttribute } from "../common/dom/toggle_attribute";
import { showNotificationDrawer } from "../dialogs/notifications/show-notification-drawer";
import type { HomeAssistant, Route } from "../types";
import "./partial-panel-resolver";

const NON_SWIPABLE_PANELS = ["map"];

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-toggle-menu": undefined;
    "hass-show-notifications": undefined;
  }
}

@customElement("home-assistant-main")
class HomeAssistantMain extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public route?: Route;

  @property({ type: Boolean }) private narrow?: boolean;

  protected render(): TemplateResult {
    const hass = this.hass;

    if (!hass) {
      return html``;
    }

    const sidebarNarrow = this._sidebarNarrow;

    const disableSwipe =
      !sidebarNarrow || NON_SWIPABLE_PANELS.indexOf(hass.panelUrl) !== -1;

    return html`
      <app-drawer-layout
        fullbleed
        .forceNarrow=${sidebarNarrow}
        responsive-width="0"
      >
        <app-drawer
          id="drawer"
          align="start"
          slot="drawer"
          .disableSwipe=${disableSwipe}
          .swipeOpen=${!disableSwipe}
          .persistent=${!this.narrow &&
          this.hass.dockedSidebar !== "always_hidden"}
        >
          <ha-sidebar
            .hass=${hass}
            .narrow=${sidebarNarrow}
            .alwaysExpand=${sidebarNarrow ||
            this.hass.dockedSidebar === "docked"}
          ></ha-sidebar>
        </app-drawer>

        <partial-panel-resolver
          .narrow=${this.narrow}
          .hass=${hass}
          .route=${this.route}
        ></partial-panel-resolver>
      </app-drawer-layout>
    `;
  }

  protected firstUpdated() {
    import(/* webpackChunkName: "ha-sidebar" */ "../components/ha-sidebar");

    this.addEventListener("hass-toggle-menu", () => {
      if (this._sidebarNarrow) {
        if (this.drawer.opened) {
          this.drawer.close();
        } else {
          this.drawer.open();
        }
      } else {
        fireEvent(this, "hass-dock-sidebar", {
          dock: this.hass.dockedSidebar === "auto" ? "docked" : "auto",
        });
        setTimeout(() => this.appLayout.resetLayout());
      }
    });

    this.addEventListener("hass-show-notifications", () => {
      showNotificationDrawer(this, {
        narrow: this.narrow!,
      });
    });

    listenMediaQuery("(max-width: 870px)", (matches) => {
      this.narrow = matches;
    });
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    toggleAttribute(
      this,
      "expanded",
      this.narrow || this.hass.dockedSidebar !== "auto"
    );

    if (changedProps.has("route") && this._sidebarNarrow) {
      this.drawer.close();
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    // Make app-drawer adjust to a potential LTR/RTL change
    if (oldHass && oldHass.language !== this.hass!.language) {
      this.drawer._resetPosition();
    }
  }

  private get _sidebarNarrow() {
    return this.narrow || this.hass.dockedSidebar === "always_hidden";
  }

  private get drawer(): AppDrawerElement {
    return this.shadowRoot!.querySelector("app-drawer")!;
  }

  private get appLayout(): AppDrawerLayoutElement {
    return this.shadowRoot!.querySelector("app-drawer-layout")!;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        color: var(--primary-text-color);
        /* remove the grey tap highlights in iOS on the fullscreen touch targets */
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
        --app-drawer-width: 64px;
      }
      :host([expanded]) {
        --app-drawer-width: 256px;
      }
      partial-panel-resolver,
      ha-sidebar {
        /* allow a light tap highlight on the actual interface elements  */
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
      }
      partial-panel-resolver {
        height: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-assistant-main": HomeAssistantMain;
  }
}
