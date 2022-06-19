import { customElement, property } from "lit/decorators";
import { HassioAddonDetails } from "../../../src/data/hassio/addon";
import { StoreAddonDetails } from "../../../src/data/supervisor/store";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../src/layouts/hass-router-page";
import { HomeAssistant } from "../../../src/types";
import "./config/hassio-addon-config-tab";
import "./documentation/hassio-addon-documentation-tab";
// Don't codesplit the others, because it breaks the UI when pushed to a Pi
import "./info/hassio-addon-info-tab";
import "./log/hassio-addon-log-tab";

@customElement("hassio-addon-router")
class HassioAddonRouter extends HassRouterPage {
  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public addon!:
    | HassioAddonDetails
    | StoreAddonDetails;

  protected routerOptions: RouterOptions = {
    defaultPage: "info",
    showLoading: true,
    routes: {
      info: {
        tag: "hassio-addon-info-tab",
      },
      documentation: {
        tag: "hassio-addon-documentation-tab",
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
    el.supervisor = this.supervisor;
    el.addon = this.addon;
    el.narrow = this.narrow;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-router": HassioAddonRouter;
  }
}
