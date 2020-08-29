import { customElement, property } from "lit-element";
import { navigate } from "../../../../../common/navigate";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../../../layouts/hass-router-page";
import { HomeAssistant } from "../../../../../types";

@customElement("ozw-node-router")
class OZWNodeRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public ozwInstance!: number;

  @property() public nodeId!: number;

  private _configEntry = new URLSearchParams(window.location.search).get(
    "config_entry"
  );

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    showLoading: true,
    routes: {
      dashboard: {
        tag: "ozw-node-dashboard",
        load: () =>
          import(
            /* webpackChunkName: "ozw-node-dashboard" */ "./ozw-node-dashboard"
          ),
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
    el.nodeId = this.nodeId;

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
    "ozw-node-router": OZWNodeRouter;
  }
}
