import "../../../layouts/hass-loading-screen";

import { customElement, property } from "lit-element";

import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { HomeAssistant } from "../../../types";

@customElement("zha-config-panel")
class ZHAConfigPanel extends HassRouterPage {
  @property() public hass!: HomeAssistant;
  @property() public isWide!: boolean;

  protected routerOptions: RouterOptions = {
    defaultPage: "configuration",
    cacheAll: true,
    preloadAll: true,
    routes: {
      configuration: {
        tag: "ha-config-zha",
        load: () =>
          import(
            /* webpackChunkName: "zha-configuration-page" */ "./ha-config-zha"
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
          import(/* webpackChunkName: "zha-groups-dashboard" */ "./zha-groups-dashboard"),
      },
    },
  };

  protected updatePageEl(el): void {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.isWide = this.isWide;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-config-panel": ZHAConfigPanel;
  }
}
