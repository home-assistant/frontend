import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { property, customElement } from "lit-element";
import { HomeAssistant } from "../../../types";

export const lovelaceTabs = [
  {
    component: "lovelace",
    path: "/config/lovelace/dashboards",
    translationKey: "ui.panel.config.lovelace.dashboards.caption",
    icon: "hass:view-dashboard",
  },
  {
    component: "lovelace",
    path: "/config/lovelace/resources",
    translationKey: "ui.panel.config.lovelace.resources.caption",
    icon: "hass:file-multiple",
    expertOnly: true,
  },
];

@customElement("ha-config-lovelace")
class HaConfigLovelace extends HassRouterPage {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
  @property() public isWide!: boolean;
  @property() public showAdvanced!: boolean;

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboards",
    routes: {
      dashboards: {
        tag: "ha-config-lovelace-dashboards",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-lovelace-dashboards" */ "./dashboards/ha-config-lovelace-dashboards"
          ),
        cache: true,
      },
      resources: {
        tag: "ha-config-lovelace-resources",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-lovelace-resources" */ "./resources/ha-config-lovelace-resources"
          ),
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
    "ha-config-lovelace": HaConfigLovelace;
  }
}
