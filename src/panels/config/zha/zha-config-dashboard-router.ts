import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { customElement, property } from "lit-element";
import { HomeAssistant } from "../../../types";

@customElement("zha-config-dashboard-router")
class ZHAConfigDashboardRouter extends HassRouterPage {
  @property() public hass!: HomeAssistant;
  @property() public isWide!: boolean;
  @property() public narrow!: boolean;

  protected routerOptions: RouterOptions = {
    defaultPage: "devices",
    cacheAll: true,
    preloadAll: true,
    showLoading: true,
    routes: {
      network: {
        tag: "zha-network",
        load: () =>
          import(/* webpackChunkName: "zha-network-page" */ "./zha-network"),
      },
      devices: {
        tag: "zha-devices-page",
        load: () =>
          import(
            /* webpackChunkName: "zha-devices-page" */ "./zha-devices-page"
          ),
      },
      add: {
        tag: "zha-add-devices-page",
        load: () =>
          import(
            /* webpackChunkName: "zha-add-devices-page" */ "./zha-add-devices-page"
          ),
      },
      groups: {
        tag: "zha-groups-dashboard",
        load: () =>
          import(
            /* webpackChunkName: "zha-groups-dashboard" */ "./zha-groups-dashboard"
          ),
      },
      group: {
        tag: "zha-group-page",
        load: () =>
          import(/* webpackChunkName: "zha-group-page" */ "./zha-group-page"),
      },
      "group-add": {
        tag: "zha-add-group-page",
        load: () =>
          import(
            /* webpackChunkName: "zha-add-group-page" */ "./zha-add-group-page"
          ),
      },
    },
  };

  protected updatePageEl(el): void {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.isWide = this.isWide;
    el.narrow = this.narrow;
    if (this._currentPage === "group") {
      el.groupId = this.routeTail.path.substr(1);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-config-dashboard-router": ZHAConfigDashboardRouter;
  }
}
