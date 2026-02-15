import { customElement, property } from "lit/decorators";
import type { RouterOptions } from "../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../layouts/hass-router-page";
import type { HomeAssistant, Route } from "../../../types";

@customElement("ha-config-apps")
class HaConfigApps extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public showAdvanced = false;

  @property({ attribute: false }) public route!: Route;

  protected routerOptions: RouterOptions = {
    defaultPage: "installed",
    routes: {
      installed: {
        tag: "ha-config-apps-installed",
        load: () => import("./ha-config-apps-installed"),
      },
      available: {
        tag: "ha-config-apps-available",
        load: () => import("./ha-config-apps-available"),
      },
    },
  };

  protected updatePageEl(pageEl) {
    pageEl.hass = this.hass;
    pageEl.narrow = this.narrow;
    pageEl.isWide = this.isWide;
    pageEl.showAdvanced = this.showAdvanced;
    pageEl.route = this.routeTail;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-apps": HaConfigApps;
  }
}
