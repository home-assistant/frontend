import { property, customElement, PropertyValues } from "lit-element";
import { PolymerElement } from "@polymer/polymer";

import { HomeAssistant, Panels } from "../types";
import {
  HassRouterPage,
  RouterOptions,
  RouteOptions,
} from "./hass-router-page";
import { removeInitSkeleton } from "../util/init-skeleton";
import { deepEqual } from "../common/util/deep-equal";

const CACHE_URL_PATHS = ["lovelace", "developer-tools"];
const COMPONENTS = {
  calendar: () =>
    import(
      /* webpackChunkName: "panel-calendar" */ "../panels/calendar/ha-panel-calendar"
    ),
  config: () =>
    import(
      /* webpackChunkName: "panel-config" */ "../panels/config/ha-panel-config"
    ),
  custom: () =>
    import(
      /* webpackChunkName: "panel-custom" */ "../panels/custom/ha-panel-custom"
    ),
  "developer-tools": () =>
    import(
      /* webpackChunkName: "panel-developer-tools" */ "../panels/developer-tools/ha-panel-developer-tools"
    ),
  lovelace: () =>
    import(
      /* webpackChunkName: "panel-lovelace" */ "../panels/lovelace/ha-panel-lovelace"
    ),
  history: () =>
    import(
      /* webpackChunkName: "panel-history" */ "../panels/history/ha-panel-history"
    ),
  iframe: () =>
    import(
      /* webpackChunkName: "panel-iframe" */ "../panels/iframe/ha-panel-iframe"
    ),
  logbook: () =>
    import(
      /* webpackChunkName: "panel-logbook" */ "../panels/logbook/ha-panel-logbook"
    ),
  mailbox: () =>
    import(
      /* webpackChunkName: "panel-mailbox" */ "../panels/mailbox/ha-panel-mailbox"
    ),
  map: () =>
    import(/* webpackChunkName: "panel-map" */ "../panels/map/ha-panel-map"),
  profile: () =>
    import(
      /* webpackChunkName: "panel-profile" */ "../panels/profile/ha-panel-profile"
    ),
  "shopping-list": () =>
    import(
      /* webpackChunkName: "panel-shopping-list" */ "../panels/shopping-list/ha-panel-shopping-list"
    ),
};

const getRoutes = (panels: Panels): RouterOptions => {
  const routes: RouterOptions["routes"] = {};
  Object.values(panels).forEach((panel) => {
    const data: RouteOptions = {
      tag: `ha-panel-${panel.component_name}`,
      cache: CACHE_URL_PATHS.includes(panel.url_path),
    };
    if (panel.component_name in COMPONENTS) {
      data.load = COMPONENTS[panel.component_name];
    }
    routes[panel.url_path] = data;
  });

  return {
    showLoading: true,
    routes,
  };
};

@customElement("partial-panel-resolver")
class PartialPanelResolver extends HassRouterPage {
  @property() public hass!: HomeAssistant;
  @property() public narrow?: boolean;

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (!changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as this["hass"];

    if (this.hass.panels && (!oldHass || oldHass.panels !== this.hass.panels)) {
      this._updateRoutes(oldHass?.panels);
    }
  }

  protected createLoadingScreen() {
    const el = super.createLoadingScreen();
    el.rootnav = true;
    el.hass = this.hass;
    el.narrow = this.narrow;
    return el;
  }

  protected updatePageEl(el) {
    const hass = this.hass;

    if ("setProperties" in el) {
      // As long as we have Polymer panels
      (el as PolymerElement).setProperties({
        hass: this.hass,
        narrow: this.narrow,
        route: this.routeTail,
        panel: hass.panels[hass.panelUrl],
      });
    } else {
      el.hass = hass;
      el.narrow = this.narrow;
      el.route = this.routeTail;
      el.panel = hass.panels[hass.panelUrl];
    }
  }

  private async _updateRoutes(oldPanels?: HomeAssistant["panels"]) {
    this.routerOptions = getRoutes(this.hass.panels);

    if (
      !oldPanels ||
      !deepEqual(
        oldPanels[this._currentPage],
        this.hass.panels[this._currentPage]
      )
    ) {
      await this.rebuild();
      await this.pageRendered;
      removeInitSkeleton();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "partial-panel-resolver": PartialPanelResolver;
  }
}
