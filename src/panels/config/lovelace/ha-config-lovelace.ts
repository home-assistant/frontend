import { mdiViewDashboard } from "@mdi/js";
import { customElement, property } from "lit/decorators";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { HomeAssistant } from "../../../types";

export const lovelaceTabs = [
  {
    component: "lovelace",
    path: "/config/lovelace/dashboards",
    translationKey: "ui.panel.config.lovelace.dashboards.caption",
    iconPath: mdiViewDashboard,
  },
];

@customElement("ha-config-lovelace")
class HaConfigLovelace extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboards",
    routes: {
      dashboards: {
        tag: "ha-config-lovelace-dashboards",
        load: () => import("./dashboards/ha-config-lovelace-dashboards"),
        cache: true,
      },
      resources: {
        tag: "ha-config-lovelace-resources",
        load: () => import("./resources/ha-config-lovelace-resources"),
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
    "ha-config-lovelace": HaConfigLovelace;
  }
}
