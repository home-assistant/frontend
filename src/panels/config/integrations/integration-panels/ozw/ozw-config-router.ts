import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../../../layouts/hass-router-page";
import { HomeAssistant, Route } from "../../../../../types";

export const computeTail = memoizeOne((route: Route) => {
  const dividerPos = route.path.indexOf("/", 1);
  return dividerPos === -1
    ? {
        prefix: route.prefix + route.path,
        path: "",
      }
    : {
        prefix: route.prefix + route.path.substr(0, dividerPos),
        path: route.path.substr(dividerPos),
      };
});

@customElement("ozw-config-router")
class OZWConfigRouter extends HassRouterPage {
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
        tag: "ozw-config-dashboard",
        load: () => import("./ozw-config-dashboard"),
      },
      network: {
        tag: "ozw-network-router",
        load: () => import("./ozw-network-router"),
      },
    },
  };

  protected updatePageEl(el): void {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.isWide = this.isWide;
    el.narrow = this.narrow;
    el.configEntryId = this._configEntry;
    if (this._currentPage === "network") {
      const path = this.routeTail.path.split("/");
      el.ozwInstance = path[1];
      el.route = computeTail(this.routeTail);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ozw-config-router": OZWConfigRouter;
  }
}
