import {
  HassRouterPage,
  RouterOptions,
} from "../../../src/layouts/hass-router-page";
import { customElement, property } from "lit-element";
import { HomeAssistant } from "../../../src/types";
// Don't codesplit the others, because it breaks the UI when pushed to a Pi
import "./info/hassio-addon-info-tab";
import "./config/hassio-addon-config-tab";
import "./log/hassio-addon-log-tab";
import { HassioAddonDetails } from "../../../src/data/hassio/addon";

@customElement("hassio-addon-router")
class HassioAddonRouter extends HassRouterPage {
  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  protected routerOptions: RouterOptions = {
    defaultPage: "info",
    showLoading: true,
    routes: {
      info: {
        tag: "hassio-addon-info-tab",
      },
      config: {
        tag: "hassio-addon-config-tab",
      },
      logs: {
        tag: "hassio-addon-log-tab",
      },
    },
  };

  protected updatePageEl(el) {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.addon = this.addon;
    el.narrow = this.narrow;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-router": HassioAddonRouter;
  }
}
