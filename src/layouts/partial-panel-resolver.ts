import { property, customElement, PropertyValues } from "lit-element";
import { PolymerElement } from "@polymer/polymer";

import { HomeAssistant, Panels } from "../types";
import {
  HassRouterPage,
  RouterOptions,
  RouteOptions,
} from "./hass-router-page";
import { removeInitSkeleton } from "../util/init-skeleton";

const CACHE_COMPONENTS = ["lovelace", "states"];
const COMPONENTS = {
  calendar: () =>
    import(/* webpackChunkName: "panel-calendar" */ "../panels/calendar/ha-panel-calendar"),
  config: () =>
    import(/* webpackChunkName: "panel-config" */ "../panels/config/ha-panel-config"),
  custom: () =>
    import(/* webpackChunkName: "panel-custom" */ "../panels/custom/ha-panel-custom"),
  "dev-event": () =>
    import(/* webpackChunkName: "panel-dev-event" */ "../panels/dev-event/ha-panel-dev-event"),
  "dev-info": () =>
    import(/* webpackChunkName: "panel-dev-info" */ "../panels/dev-info/ha-panel-dev-info"),
  "dev-mqtt": () =>
    import(/* webpackChunkName: "panel-dev-mqtt" */ "../panels/dev-mqtt/ha-panel-dev-mqtt"),
  "dev-service": () =>
    import(/* webpackChunkName: "panel-dev-service" */ "../panels/dev-service/ha-panel-dev-service"),
  "dev-state": () =>
    import(/* webpackChunkName: "panel-dev-state" */ "../panels/dev-state/ha-panel-dev-state"),
  "dev-template": () =>
    import(/* webpackChunkName: "panel-dev-template" */ "../panels/dev-template/ha-panel-dev-template"),
  lovelace: () =>
    import(/* webpackChunkName: "panel-lovelace" */ "../panels/lovelace/ha-panel-lovelace"),
  states: () =>
    import(/* webpackChunkName: "panel-states" */ "../panels/states/ha-panel-states"),
  history: () =>
    import(/* webpackChunkName: "panel-history" */ "../panels/history/ha-panel-history"),
  iframe: () =>
    import(/* webpackChunkName: "panel-iframe" */ "../panels/iframe/ha-panel-iframe"),
  kiosk: () =>
    import(/* webpackChunkName: "panel-kiosk" */ "../panels/kiosk/ha-panel-kiosk"),
  logbook: () =>
    import(/* webpackChunkName: "panel-logbook" */ "../panels/logbook/ha-panel-logbook"),
  mailbox: () =>
    import(/* webpackChunkName: "panel-mailbox" */ "../panels/mailbox/ha-panel-mailbox"),
  map: () =>
    import(/* webpackChunkName: "panel-map" */ "../panels/map/ha-panel-map"),
  profile: () =>
    import(/* webpackChunkName: "panel-profile" */ "../panels/profile/ha-panel-profile"),
  "shopping-list": () =>
    import(/* webpackChunkName: "panel-shopping-list" */ "../panels/shopping-list/ha-panel-shopping-list"),
};

const getRoutes = (panels: Panels): RouterOptions => {
  const routes: { [route: string]: RouteOptions } = {};

  Object.values(panels).forEach((panel) => {
    routes[panel.url_path] = {
      load: COMPONENTS[panel.component_name],
      tag: `ha-panel-${panel.component_name}`,
      cache: CACHE_COMPONENTS.includes(panel.component_name),
    };
  });

  return {
    showLoading: true,
    routes,
  };
};

@customElement("partial-panel-resolver")
class PartialPanelResolver extends HassRouterPage {
  @property() public hass?: HomeAssistant;
  @property() public narrow?: boolean;

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (!changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as this["hass"];

    if (
      this.hass!.panels &&
      (!oldHass || oldHass.panels !== this.hass!.panels)
    ) {
      this._updateRoutes();
    }
  }

  protected createLoadingScreen() {
    const el = super.createLoadingScreen();
    el.rootnav = true;
    return el;
  }

  protected updatePageEl(el) {
    const hass = this.hass!;

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

  private async _updateRoutes() {
    this.routerOptions = getRoutes(this.hass!.panels);
    await this.rebuild();
    await this.pageRendered;
    removeInitSkeleton();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "partial-panel-resolver": PartialPanelResolver;
  }
}
