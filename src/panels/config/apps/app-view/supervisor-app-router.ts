import { customElement, property } from "lit/decorators";
import type { HassioAddonDetails } from "../../../../data/hassio/addon";
import type { StoreAddonDetails } from "../../../../data/supervisor/store";
import type { RouterOptions } from "../../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../../layouts/hass-router-page";
import type { HomeAssistant } from "../../../../types";
import "./config/supervisor-app-config-tab";
import "./documentation/supervisor-app-documentation-tab";
// Don't codesplit the others, because it breaks the UI when pushed to a Pi
import "./info/supervisor-app-info-tab";
import "./log/supervisor-app-log-tab";

@customElement("supervisor-app-router")
class SupervisorAppRouter extends HassRouterPage {
  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public hass!: HomeAssistant;

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
        tag: "supervisor-app-info-tab",
      },
      documentation: {
        tag: "supervisor-app-documentation-tab",
      },
      config: {
        tag: "supervisor-app-config-tab",
      },
      logs: {
        tag: "supervisor-app-log-tab",
      },
    },
  };

  protected updatePageEl(el) {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.addon = this.addon;
    el.narrow = this.narrow;
    el.controlEnabled = this.controlEnabled;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-app-router": SupervisorAppRouter;
  }
}
