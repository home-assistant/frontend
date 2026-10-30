import { customElement, property } from "lit/decorators";
import type { RouterOptions } from "../../../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../../../layouts/hass-router-page";
import type { HomeAssistant } from "../../../../../types";

@customElement("lorawan-router")
class LoRaWANRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Boolean }) public narrow = false;
  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  protected routerOptions: RouterOptions = {
    defaultPage: "overview",
    showLoading: true,
    routes: {
      overview: {
        tag: "lorawan-overview",
        load: () => import("./lorawan-overview"),
      },
      connections: {
        tag: "lorawan-connections",
        load: () => import("./lorawan-connections"),
      },
      devices: {
        tag: "lorawan-devices",
        load: () => import("./lorawan-devices"),
      },
      topology: {
        tag: "lorawan-topology",
        load: () => import("./lorawan-topology"),
      },
    },
  };

  protected updatePageEl(el): void {
    el.hass = this.hass;
    el.narrow = this.narrow;
    el.isWide = this.isWide;
    el.route = this.routeTail;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lorawan-router": LoRaWANRouter;
  }
}
