import { customElement, property, state } from "lit/decorators";
import { listenMediaQuery } from "../../common/dom/media_query";
import type { RouterOptions } from "../../layouts/hass-router-page";
import { HassRouterPage } from "../../layouts/hass-router-page";
import type { HomeAssistant, Route } from "../../types";

import type { MarketplaceData } from "../../data/marketplace/marketplace";

interface MarketplacePageElement extends HTMLElement {
  hass: HomeAssistant;
  marketplace: MarketplaceData;
  route: Route;
  narrow: boolean;
  isWide?: boolean;
}

@customElement("ha-marketplace-router")
class HaMarketplaceRouter extends HassRouterPage {
  @property({ attribute: false }) public marketplace!: MarketplaceData;

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
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    while (this._listeners.length) {
      this._listeners.pop()!();
    }
  }

  protected updatePageEl(el: MarketplacePageElement) {
    const isWide =
      this.hass.dockedSidebar === "docked" ? this._wideSidebar : this._wide;
    el.hass = this.hass;
    el.marketplace = this.marketplace;
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
        tag: "ha-marketplace-my-redirect",
        load: () => import("./ha-marketplace-my-redirect"),
      },
      dashboard: {
        tag: "ha-marketplace-dashboard",
        load: () => import("./dashboards/ha-marketplace-dashboard"),
        cache: true,
      },
      repository: {
        tag: "ha-marketplace-repository-dashboard",
        load: () => import("./dashboards/ha-marketplace-repository-dashboard"),
      },
    },
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-marketplace-router": HaMarketplaceRouter;
  }
}
