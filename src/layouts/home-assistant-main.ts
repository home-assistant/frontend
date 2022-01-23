/* eslint-disable lit/prefer-static-styles */
import "@polymer/app-layout/app-drawer-layout/app-drawer-layout";
import type { AppDrawerLayoutElement } from "@polymer/app-layout/app-drawer-layout/app-drawer-layout";
import "@polymer/app-layout/app-drawer/app-drawer";
import type { AppDrawerElement } from "@polymer/app-layout/app-drawer/app-drawer";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent, HASSDomEvent } from "../common/dom/fire_event";
import { listenMediaQuery } from "../common/dom/media_query";
import { toggleAttribute } from "../common/dom/toggle_attribute";
import { showNotificationDrawer } from "../dialogs/notifications/show-notification-drawer";
import type { HomeAssistant, Route } from "../types";
import "./partial-panel-resolver";

const NON_SWIPABLE_PANELS = ["map"];

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-toggle-menu": undefined;
    "hass-edit-sidebar": EditSideBarEvent;
    "hass-show-notifications": undefined;
  }
  interface HTMLElementEventMap {
    "hass-edit-sidebar": HASSDomEvent<EditSideBarEvent>;
  }
}

interface EditSideBarEvent {
  editMode: boolean;
}

@customElement("home-assistant-main")
export class HomeAssistantMain extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public route?: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _sidebarEditMode = false;

  @state() private _externalSidebar = false;

  constructor() {
    super();
    listenMediaQuery("(max-width: 870px)", (matches) => {
      this.narrow = matches;
    });
  }

  protected render(): TemplateResult {
    const hass = this.hass;
    const sidebarNarrow = this._sidebarNarrow || this._externalSidebar;
    const disableSwipe =
      this._sidebarEditMode ||
      !sidebarNarrow ||
      NON_SWIPABLE_PANELS.indexOf(hass.panelUrl) !== -1 ||
      this._externalSidebar;

    // Style block in render because of the mixin that is not supported
    return html`
      <style>
        app-drawer {
          --app-drawer-content-container: {
            background-color: var(--primary-background-color, #fff);
          }
        }
      </style>
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
            .route=${this.route}
            .editMode=${this._sidebarEditMode}
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
    import(/* webpackPreload: true */ "../components/ha-sidebar");

    if (this.hass.auth.external) {
      this._externalSidebar =
        this.hass.auth.external.config.hasSidebar === true;
      import("../external_app/external_app_entrypoint").then((mod) =>
        mod.attachExternalToApp(this)
      );
    }

    this.addEventListener(
      "hass-edit-sidebar",
      (ev: HASSDomEvent<EditSideBarEvent>) => {
        this._sidebarEditMode = ev.detail.editMode;

        if (this._sidebarEditMode) {
          if (this._sidebarNarrow) {
            this.drawer.open();
          } else {
            fireEvent(this, "hass-dock-sidebar", {
              dock: "docked",
            });
            setTimeout(() => this.appLayout.resetLayout());
          }
        }
      }
    );

    this.addEventListener("hass-toggle-menu", () => {
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
        narrow: this.narrow,
      });
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

  static get styles(): CSSResultGroup {
    return css`
      :host {
        color: var(--primary-text-color);
        /* remove the grey tap highlights in iOS on the fullscreen touch targets */
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
        --app-drawer-width: 56px;
      }
      :host([expanded]) {
        --app-drawer-width: calc(256px + env(safe-area-inset-left));
      }
      partial-panel-resolver,
      ha-sidebar {
        /* allow a light tap highlight on the actual interface elements  */
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-assistant-main": HomeAssistantMain;
  }
}
