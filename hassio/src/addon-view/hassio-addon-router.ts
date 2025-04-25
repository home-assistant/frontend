import { customElement, property } from "lit/decorators";
import type { HassioAddonDetails } from "../../../src/data/hassio/addon";
import type { StoreAddonDetails } from "../../../src/data/supervisor/store";
import type { Supervisor } from "../../../src/data/supervisor/supervisor";
import type { RouterOptions } from "../../../src/layouts/hass-router-page";
import { HassRouterPage } from "../../../src/layouts/hass-router-page";
import type { HomeAssistant } from "../../../src/types";
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

  @property({ type: Boolean, attribute: "control-enabled" })
  public controlEnabled = false;

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
    el.controlEnabled = this.controlEnabled;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-router": HassioAddonRouter;
  }
}
