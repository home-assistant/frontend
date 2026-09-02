import { customElement, property, state } from "lit/decorators";
import { listenMediaQuery } from "../../common/dom/media_query";
import type { RouterOptions } from "../../layouts/hass-router-page";
import { HassRouterPage } from "../../layouts/hass-router-page";
import type { HomeAssistant, Route } from "../../types";

import type { StoreData } from "./data/store";

@customElement("ha-store-router")
class HaStoreRouter extends HassRouterPage {
  @property({ attribute: false }) public store!: StoreData;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _wideSidebar = false;

  @state() private _wide = false;

  private _listeners: (() => void)[] = [];

  public connectedCallback() {
    super.connectedCallback();
    this._listeners.push(
      listenMediaQuery("(min-width: 1040px)", (matches) => {
        this._wide = matches;
      })
    );
    this._listeners.push(
      listenMediaQuery("(min-width: 1296px)", (matches) => {
        this._wideSidebar = matches;
      })
    );

    this.style.setProperty(
      "--app-header-background-color",
      "var(--sidebar-background-color)"
    );
    this.style.setProperty(
      "--app-header-text-color",
      "var(--sidebar-text-color)"
    );
    this.style.setProperty(
      "--app-header-border-bottom",
      "1px solid var(--divider-color)"
    );
    this.style.setProperty(
      "--ha-card-border-radius",
      "var(--ha-config-card-border-radius, 12px)"
    );
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    while (this._listeners.length) {
      this._listeners.pop()!();
    }
  }

  protected updatePageEl(el) {
    const isWide =
      this.hass.dockedSidebar === "docked" ? this._wideSidebar : this._wide;
    el.hass = this.hass;
    el.store = this.store;
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
        tag: "ha-store-my-redirect",
        load: () => import("./ha-store-my-redirect"),
      },
      dashboard: {
        tag: "ha-store-dashboard",
        load: () => import("./dashboards/ha-store-dashboard"),
        cache: true,
      },
      repository: {
        tag: "ha-store-repository-dashboard",
        load: () => import("./dashboards/ha-store-repository-dashboard"),
      },
    },
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-store-router": HaStoreRouter;
  }
}
