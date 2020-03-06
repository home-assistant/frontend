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
    defaultPage: "dashboard",
    cacheAll: true,
    preloadAll: true,
    showLoading: true,
    routes: {
      dashboard: {
        tag: "zha-config-dashboard",
        load: () =>
          import(
            /* webpackChunkName: "zha-config-dashboard" */ "./zha-config-dashboard"
          ),
      },
      device: {
        tag: "zha-device-page",
        load: () =>
          import(
            /* webpackChunkName: "zha-devices-page" */ "./zha-device-page"
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
    } else if (this._currentPage === "device") {
      el.ieee = this.routeTail.path.substr(1);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-config-dashboard-router": ZHAConfigDashboardRouter;
  }
}
