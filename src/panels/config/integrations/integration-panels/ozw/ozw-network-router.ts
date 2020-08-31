import { customElement, property } from "lit-element";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../../../layouts/hass-router-page";
import { HomeAssistant } from "../../../../../types";

@customElement("ozw-network-router")
class OZWNetworkRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public ozwInstance!: number;

  private _configEntry = new URLSearchParams(window.location.search).get(
    "config_entry"
  );

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    showLoading: true,
    routes: {
      dashboard: {
        tag: "ozw-network-dashboard",
        load: () =>
          import(
            /* webpackChunkName: "ozw-network-dashboard" */ "./ozw-network-dashboard"
          ),
      },
      nodes: {
        tag: "ozw-network-nodes",
        load: () =>
          import(
            /* webpackChunkName: "ozw-network-nodes" */ "./ozw-network-nodes"
          ),
      },
      node: {
        tag: "ozw-config-node",
        load: () =>
          import(/* webpackChunkName: "ozw-config-node" */ "./ozw-config-node"),
      },
    },
  };

  protected updatePageEl(el): void {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.isWide = this.isWide;
    el.narrow = this.narrow;
    el.configEntryId = this._configEntry;
    el.ozwInstance = this.ozwInstance;
    if (this._currentPage === "node") {
      const path = this.routeTail.path.split("/");
      el.nodeId = path[1];
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ozw-network-router": OZWNetworkRouter;
  }
}
