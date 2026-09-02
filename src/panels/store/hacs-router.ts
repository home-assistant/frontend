import { customElement, property, state } from "lit/decorators";
import { listenMediaQuery } from "../homeassistant-frontend/src/common/dom/media_query";
import {
  HassRouterPage,
  RouterOptions,
} from "../homeassistant-frontend/src/layouts/hass-router-page";
import type { HomeAssistant, Route } from "../homeassistant-frontend/src/types";

import type { Hacs } from "./data/hacs";

@customElement("hacs-router")
class HacsRouter extends HassRouterPage {
  @property({ attribute: false }) public hacs!: Hacs;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _wideSidebar = false;

  @state() private _wide = false;

  private _listeners: Array<() => void> = [];

  public connectedCallback() {
    super.connectedCallback();
    this._listeners.push(
      listenMediaQuery("(min-width: 1040px)", (matches) => {
        this._wide = matches;
      }),
    );
    this._listeners.push(
      listenMediaQuery("(min-width: 1296px)", (matches) => {
        this._wideSidebar = matches;
      }),
    );

    this.style.setProperty("--app-header-background-color", "var(--sidebar-background-color)");
    this.style.setProperty("--app-header-text-color", "var(--sidebar-text-color)");
    this.style.setProperty("--app-header-border-bottom", "1px solid var(--divider-color)");
    this.style.setProperty("--ha-card-border-radius", "var(--ha-config-card-border-radius, 12px)");
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    while (this._listeners.length) {
      this._listeners.pop()!();
    }
  }

  protected updatePageEl(el) {
    const isWide = this.hass.dockedSidebar === "docked" ? this._wideSidebar : this._wide;
    el.hass = this.hass;
    el.hacs = this.hacs;
    el.route = this.route;
    el.narrow = this.narrow;
    el.isWide = isWide;
  }

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    showLoading: true,
    beforeRender: (page: string) =>
      !["_my_redirect", "repository"].includes(page) ? "dashboard" : undefined,
    routes: {
      _my_redirect: {
        tag: "hacs-my-redirect",
        load: () => import("./hacs-my-redirect"),
      },
      dashboard: {
        tag: "hacs-dashboard",
        load: () => import("./dashboards/hacs-dashboard"),
        cache: true,
      },
      repository: {
        tag: "hacs-repository-dashboard",
        load: () => import("./dashboards/hacs-repository-dashboard"),
      },
    },
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hacs-router": HacsRouter;
  }
}
