import { customElement, property } from "lit/decorators";
import type { RouterOptions } from "../../../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../../../layouts/hass-router-page";
import type { HomeAssistant } from "../../../../../types";

@customElement("zha-config-dashboard-router")
class ZHAConfigDashboardRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    showLoading: true,
    routes: {
      dashboard: {
        tag: "zha-config-dashboard",
        load: () => import("./zha-config-dashboard"),
      },
      add: {
        tag: "zha-add-devices-page",
        load: () => import("./zha-add-devices-page"),
      },
      groups: {
        tag: "zha-groups-dashboard",
        load: () => import("./zha-groups-dashboard"),
      },
      group: {
        tag: "zha-group-page",
        load: () => import("./zha-group-page"),
      },
      "group-add": {
        tag: "zha-add-group-page",
        load: () => import("./zha-add-group-page"),
      },
      visualization: {
        tag: "zha-network-visualization-page",
        load: () => import("./zha-network-visualization-page"),
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
    } else if (this._currentPage === "visualization") {
      el.zoomedDeviceIdFromURL = this.routeTail.path.substr(1);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-config-dashboard-router": ZHAConfigDashboardRouter;
  }
}
