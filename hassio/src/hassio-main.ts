import { customElement, PropertyValues, property } from "lit-element";
import { PolymerElement } from "@polymer/polymer";

import "../../src/resources/ha-style";
import applyThemesOnElement from "../../src/common/dom/apply_themes_on_element";
import { fireEvent } from "../../src/common/dom/fire_event";
import {
  HassRouterPage,
  RouterOptions,
} from "../../src/layouts/hass-router-page";
import { HomeAssistant } from "../../src/types";
import {
  fetchHassioSupervisorInfo,
  fetchHassioHostInfo,
  fetchHassioHomeAssistantInfo,
} from "../../src/data/hassio";

@customElement("hassio-main")
class HassioMain extends HassRouterPage {
  @property() public hass!: HomeAssistant;

  protected routerOptions: RouterOptions = {
    // Hass.io has a page with tabs, so we route all non-matching routes to it.
    defaultPage: "dashboard",
    initialLoad: () => this._fetchData(),
    routes: {
      dashboard: {
        tag: "hassio-pages-with-tabs",
        load: () => import("./hassio-pages-with-tabs"),
        cache: true,
      },
      snapshots: "dashboard",
      store: "dashboard",
      system: "dashboard",
      addon: {
        tag: "hassio-addon-view",
        load: () => import("./addon-view/hassio-addon-view"),
      },
      ingress: {
        tag: "hassio-ingress-view",
        load: () => import("./ingress-view/hassio-ingress-view"),
      },
    },
  };

  @property() private supervisorInfo: any;
  @property() private hostInfo: any;
  @property() private hassInfo: any;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    applyThemesOnElement(this, this.hass.themes, this.hass.selectedTheme, true);
    this.addEventListener("hass-api-called", (ev) => this._apiCalled(ev));
    // Paulus - March 17, 2019
    // We went to a single hass-toggle-menu event in HA 0.90. However, the
    // supervisor UI can also run under older versions of Home Assistant.
    // So here we are going to translate toggle events into the appropriate
    // open and close events. These events are a no-op in newer versions of
    // Home Assistant.
    this.addEventListener("hass-toggle-menu", () => {
      fireEvent(
        (window.parent as any).customPanel,
        // @ts-ignore
        this.hass.dockedSidebar ? "hass-close-menu" : "hass-open-menu"
      );
    });
    // Paulus - March 19, 2019
    // We changed the navigate event to fire directly on the window, as that's
    // where we are listening for it. However, the older panel_custom will
    // listen on this element for navigation events, so we need to forward them.
    window.addEventListener("location-changed", (ev) =>
      // @ts-ignore
      fireEvent(this, ev.type, ev.detail, {
        bubbles: false,
      })
    );
  }

  protected updatePageEl(el) {
    if ("setProperties" in el) {
      // As long as we have Polymer pages
      (el as PolymerElement).setProperties({
        hass: this.hass,
        supervisorInfo: this.supervisorInfo,
        hostInfo: this.hostInfo,
        hassInfo: this.hassInfo,
        route: this.routeTail,
      });
    } else {
      el.hass = this.hass;
      el.supervisorInfo = this.supervisorInfo;
      el.hostInfo = this.hostInfo;
      el.hassInfo = this.hassInfo;
      el.route = this.routeTail;
    }
  }

  private async _fetchData() {
    const [supervisorInfo, hostInfo, hassInfo] = await Promise.all([
      fetchHassioSupervisorInfo(this.hass),
      fetchHassioHostInfo(this.hass),
      fetchHassioHomeAssistantInfo(this.hass),
    ]);
    this.supervisorInfo = supervisorInfo;
    this.hostInfo = hostInfo;
    this.hassInfo = hassInfo;
  }

  private _apiCalled(ev) {
    if (!ev.detail.success) {
      return;
    }

    let tries = 1;

    const tryUpdate = () => {
      this._fetchData().catch(() => {
        tries += 1;
        setTimeout(tryUpdate, Math.min(tries, 5) * 1000);
      });
    };

    tryUpdate();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-main": HassioMain;
  }
}
