import {
  HassRouterPage,
  RouterOptions,
} from "../../../src/layouts/hass-router-page";
import { customElement, property } from "lit-element";
import { HomeAssistant } from "../../../src/types";
// Don't codesplit the others, because it breaks the UI when pushed to a Pi
import "./info/hassio-addon-info-dashboard";
import "./config/hassio-addon-config-dashboard";
import "./log/hassio-addon-log-dashboard";
import { HassioAddonDetails } from "../../../src/data/hassio/addon";

@customElement("hassio-addon-router")
class HassioAddonRouter extends HassRouterPage {
  @property() public hass!: HomeAssistant;
  @property() public addon!: HassioAddonDetails;

  protected routerOptions: RouterOptions = {
    defaultPage: "info",
    showLoading: true,
    routes: {
      info: {
        tag: "hassio-addon-info-dashboard",
      },
      config: {
        tag: "hassio-addon-config-dashboard",
      },
      logs: {
        tag: "hassio-addon-log-dashboard",
      },
    },
  };

  protected updatePageEl(el) {
    el.hass = this.hass;
    el.addon = this.addon;
    el.route = this.routeTail;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-router": HassioAddonRouter;
  }
}
