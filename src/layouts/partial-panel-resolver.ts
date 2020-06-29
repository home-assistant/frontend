import { PolymerElement } from "@polymer/polymer";
import { customElement, property, PropertyValues } from "lit-element";
import { deepEqual } from "../common/util/deep-equal";
import { HomeAssistant, Panels } from "../types";
import { removeInitSkeleton } from "../util/init-skeleton";
import {
  HassRouterPage,
  RouteOptions,
  RouterOptions,
} from "./hass-router-page";
import {
  STATE_STARTING,
  STATE_NOT_RUNNING,
  STATE_RUNNING,
} from "home-assistant-js-websocket";
import { CustomPanelInfo } from "../data/panel_custom";
import { deepActiveElement } from "../common/dom/deep-active-element";

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

  private _waitForStart = false;

  private _disconnectedPanel?: HTMLElement;

  private _disconnectedActiveElement?: HTMLElement;

  private _hiddenTimeout?: number;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    // Attach listeners for visibility
    document.addEventListener(
      "visibilitychange",
      () => this._checkVisibility(),
      false
    );
    document.addEventListener("resume", () => this._checkVisibility());
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (!changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as this["hass"];

    if (
      this._waitForStart &&
      (this.hass.config.state === STATE_STARTING ||
        this.hass.config.state === STATE_RUNNING)
    ) {
      this._waitForStart = false;
      this.rebuild();
    }

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
        panel: hass.panels[this._currentPage],
      });
    } else {
      el.hass = hass;
      el.narrow = this.narrow;
      el.route = this.routeTail;
      el.panel = hass.panels[this._currentPage];
    }
  }

  private _checkVisibility() {
    if (document.hidden) {
      this._onHidden();
    } else {
      this._onVisible();
    }
  }

  private _onHidden() {
    this._hiddenTimeout = window.setTimeout(() => {
      this._hiddenTimeout = undefined;
      // setTimeout can be delayed in the background and only fire
      // when we switch to the tab or app again (Hey Android!)
      if (!document.hidden) {
        return;
      }
      const curPanel = this.hass.panels[this._currentPage];
      if (
        this.lastChild &&
        // iFrames will lose their state when disconnected
        // Do not disconnect any iframe panel
        curPanel.component_name !== "iframe" &&
        // Do not disconnect any custom panel that embeds into iframe (ie hassio)
        (curPanel.component_name !== "custom" ||
          !(curPanel.config as CustomPanelInfo).config._panel_custom
            .embed_iframe)
      ) {
        this._disconnectedPanel = this.lastChild as HTMLElement;
        const activeEl = deepActiveElement(
          this._disconnectedPanel.shadowRoot || undefined
        );
        if (activeEl instanceof HTMLElement) {
          this._disconnectedActiveElement = activeEl;
        }
        this.removeChild(this.lastChild);
      }
    }, 300000);
    window.addEventListener("focus", () => this._onVisible(), { once: true });
  }

  private _onVisible() {
    if (this._hiddenTimeout) {
      clearTimeout(this._hiddenTimeout);
      this._hiddenTimeout = undefined;
    }
    if (this._disconnectedPanel) {
      this.appendChild(this._disconnectedPanel);
      this._disconnectedPanel = undefined;
    }
    if (this._disconnectedActiveElement) {
      this._disconnectedActiveElement.focus();
      this._disconnectedActiveElement = undefined;
    }
  }

  private async _updateRoutes(oldPanels?: HomeAssistant["panels"]) {
    this.routerOptions = getRoutes(this.hass.panels);

    if (
      !this._waitForStart &&
      this._currentPage &&
      !this.hass.panels[this._currentPage]
    ) {
      if (this.hass.config.state !== STATE_NOT_RUNNING) {
        this._waitForStart = true;
        if (this.lastChild) {
          this.removeChild(this.lastChild);
        }
        this.appendChild(this.createLoadingScreen());
        return;
      }
    }

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
