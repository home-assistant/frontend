import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import type { RouterOptions } from "../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../layouts/hass-router-page";
import type { HomeAssistant, Route } from "../../../types";

@customElement("ha-config-apps")
class HaConfigApps extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public route!: Route;

  protected routerOptions: RouterOptions = {
    defaultPage: "installed",
    beforeRender: () => {
      if (!isComponentLoaded(this.hass.config, "hassio")) {
        return "info";
      }
      return undefined;
    },
    routes: {
      installed: {
        tag: "ha-config-apps-installed",
        load: () => import("./ha-config-apps-installed"),
      },
      available: {
        tag: "ha-config-apps-available",
        load: () => import("./ha-config-apps-available"),
      },
      repositories: {
        tag: "ha-config-apps-repositories",
        load: () => import("./ha-config-apps-repositories"),
      },
      registries: {
        tag: "ha-config-apps-registries",
        load: () => import("./ha-config-apps-registries"),
      },
      info: {
        tag: "ha-config-apps-info",
        load: () => import("./ha-config-apps-info"),
      },
    },
  };

  protected updatePageEl(pageEl) {
    pageEl.hass = this.hass;
    pageEl.narrow = this.narrow;
    pageEl.isWide = this.isWide;
    pageEl.route = this.routeTail;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-apps": HaConfigApps;
  }
}
