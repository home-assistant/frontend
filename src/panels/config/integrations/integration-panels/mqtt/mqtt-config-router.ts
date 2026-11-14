import { customElement, property } from "lit/decorators";
import type { RouterOptions } from "../../../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../../../layouts/hass-router-page";
import type { HomeAssistant } from "../../../../../types";

@customElement("mqtt-config-router")
class MQTTConfigRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    showLoading: true,
    routes: {
      dashboard: {
        tag: "mqtt-config-panel",
        load: () => import("./mqtt-config-panel"),
      },
      visualization: {
        tag: "mqtt-network-visualization-page",
        load: () => import("./mqtt-network-visualization-page"),
      },
    },
  };

  protected updatePageEl(el): void {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.isWide = this.isWide;
    el.narrow = this.narrow;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-config-router": MQTTConfigRouter;
  }
}
