import { customElement, property } from "lit-element";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../../../layouts/hass-router-page";
import { HomeAssistant } from "../../../../../types";
import { navigate } from "../../../../../common/navigate";

@customElement("zha-config-dashboard-router")
class ZHAConfigDashboardRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  private _configEntry = new URLSearchParams(window.location.search).get(
    "config_entry"
  );

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
    el.configEntryId = this._configEntry;
    if (this._currentPage === "group") {
      el.groupId = this.routeTail.path.substr(1);
    } else if (this._currentPage === "device") {
      el.ieee = this.routeTail.path.substr(1);
    }

    const searchParams = new URLSearchParams(window.location.search);
    if (this._configEntry && !searchParams.has("config_entry")) {
      searchParams.append("config_entry", this._configEntry);
      navigate(
        this,
        `${this.routeTail.prefix}${
          this.routeTail.path
        }?${searchParams.toString()}`,
        true
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-config-dashboard-router": ZHAConfigDashboardRouter;
  }
}
