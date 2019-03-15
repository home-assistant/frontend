import { property, customElement } from "lit-element";
import { PolymerElement } from "@polymer/polymer";

import { HomeAssistant } from "../types";
import { HassRouterPage, RouterOptions } from "./hass-router-page";

@customElement("partial-panel-resolver")
class PartialPanelResolver extends HassRouterPage {
  protected static routerOptions: RouterOptions = {
    isRoot: true,
    showLoading: true,
    routes: {
      calendar: {
        tag: "ha-panel-calendar",
        load: () =>
          import(/* webpackChunkName: "panel-calendar" */ "../panels/calendar/ha-panel-calendar"),
      },
      config: {
        tag: "ha-panel-config",
        load: () =>
          import(/* webpackChunkName: "panel-config" */ "../panels/config/ha-panel-config"),
      },
      custom: {
        tag: "ha-panel-custom",
        load: () =>
          import(/* webpackChunkName: "panel-custom" */ "../panels/custom/ha-panel-custom"),
      },
      "dev-event": {
        tag: "ha-panel-dev-event",
        load: () =>
          import(/* webpackChunkName: "panel-dev-event" */ "../panels/dev-event/ha-panel-dev-event"),
      },
      "dev-info": {
        tag: "ha-panel-dev-info",
        load: () =>
          import(/* webpackChunkName: "panel-dev-info" */ "../panels/dev-info/ha-panel-dev-info"),
      },
      "dev-mqtt": {
        tag: "ha-panel-dev-mqtt",
        load: () =>
          import(/* webpackChunkName: "panel-dev-mqtt" */ "../panels/dev-mqtt/ha-panel-dev-mqtt"),
      },
      "dev-service": {
        tag: "ha-panel-dev-service",
        load: () =>
          import(/* webpackChunkName: "panel-dev-service" */ "../panels/dev-service/ha-panel-dev-service"),
      },
      "dev-state": {
        tag: "ha-panel-dev-state",
        load: () =>
          import(/* webpackChunkName: "panel-dev-state" */ "../panels/dev-state/ha-panel-dev-state"),
      },
      "dev-template": {
        tag: "ha-panel-dev-template",
        load: () =>
          import(/* webpackChunkName: "panel-dev-template" */ "../panels/dev-template/ha-panel-dev-template"),
      },
      lovelace: {
        cache: true,
        tag: "ha-panel-lovelace",
        load: () =>
          import(/* webpackChunkName: "panel-lovelace" */ "../panels/lovelace/ha-panel-lovelace"),
      },
      states: {
        cache: true,
        tag: "ha-panel-states",
        load: () =>
          import(/* webpackChunkName: "panel-states" */ "../panels/states/ha-panel-states"),
      },
      history: {
        tag: "ha-panel-history",
        load: () =>
          import(/* webpackChunkName: "panel-history" */ "../panels/history/ha-panel-history"),
      },
      iframe: {
        tag: "ha-panel-iframe",
        load: () =>
          import(/* webpackChunkName: "panel-iframe" */ "../panels/iframe/ha-panel-iframe"),
      },
      kiosk: {
        tag: "ha-panel-kiosk",
        load: () =>
          import(/* webpackChunkName: "panel-kiosk" */ "../panels/kiosk/ha-panel-kiosk"),
      },
      logbook: {
        tag: "ha-panel-logbook",
        load: () =>
          import(/* webpackChunkName: "panel-logbook" */ "../panels/logbook/ha-panel-logbook"),
      },
      mailbox: {
        tag: "ha-panel-mailbox",
        load: () =>
          import(/* webpackChunkName: "panel-mailbox" */ "../panels/mailbox/ha-panel-mailbox"),
      },
      map: {
        tag: "ha-panel-map",
        load: () =>
          import(/* webpackChunkName: "panel-map" */ "../panels/map/ha-panel-map"),
      },
      profile: {
        tag: "ha-panel-profile",
        load: () =>
          import(/* webpackChunkName: "panel-profile" */ "../panels/profile/ha-panel-profile"),
      },
      "shopping-list": {
        tag: "ha-panel-shopping-list",
        load: () =>
          import(/* webpackChunkName: "panel-shopping-list" */ "../panels/shopping-list/ha-panel-shopping-list"),
      },
    },
  };
  @property() public hass?: HomeAssistant;
  @property() public narrow?: boolean;

  protected _updatePageEl(el) {
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
}

declare global {
  interface HTMLElementTagNameMap {
    "partial-panel-resolver": PartialPanelResolver;
  }
}
