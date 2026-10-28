import { customElement, property, state } from "lit/decorators";
import { listenMediaQuery } from "../../common/dom/media_query";
import type { RouterOptions } from "../../layouts/hass-router-page";
import { HassRouterPage } from "../../layouts/hass-router-page";
import type { HomeAssistant, Route } from "../../types";

import type { MarketplaceData } from "../../data/marketplace/marketplace";
import type { MarketplaceTab } from "./dashboards/ha-marketplace-dashboard";

interface MarketplacePageElement extends HTMLElement {
  marketplace: MarketplaceData;
  route: Route;
  narrow: boolean;
  isWide?: boolean;
  tab?: MarketplaceTab;
}

// Each tab is the dashboard, showing its own part of the Marketplace. The
// router keeps a page per tab, not one for all of them.
const TABS: MarketplaceTab[] = ["discover", "browse", "installed"];

const dashboard = {
  tag: "ha-marketplace-dashboard",
  load: () => import("./dashboards/ha-marketplace-dashboard"),
  cache: true,
};

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
    el.marketplace = this.marketplace;
    el.route = this.routeTail;
    el.narrow = this.narrow;
    el.isWide = isWide;
    if (TABS.includes(this._currentPage as MarketplaceTab)) {
      el.tab = this._currentPage as MarketplaceTab;
    }
  }

  protected routerOptions: RouterOptions = {
    defaultPage: "browse",
    showLoading: true,
    beforeRender: (page: string) =>
      !["_my_redirect", "repository", "repositories", ...TABS].includes(page)
        ? "browse"
        : undefined,
    routes: {
      _my_redirect: {
        tag: "ha-marketplace-my-redirect",
        load: () => import("./ha-marketplace-my-redirect"),
      },
      discover: dashboard,
      browse: dashboard,
      installed: dashboard,
      repository: {
        tag: "ha-marketplace-repository-dashboard",
        load: () => import("./dashboards/ha-marketplace-repository-dashboard"),
      },
      repositories: {
        tag: "ha-marketplace-custom-repositories",
        load: () => import("./dashboards/ha-marketplace-custom-repositories"),
      },
    },
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-marketplace-router": HaMarketplaceRouter;
  }
}
