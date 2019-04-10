import { customElement, PropertyValues, property } from "lit-element";
import { PolymerElement } from "@polymer/polymer";
import "@polymer/paper-icon-button";

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
  HassioSupervisorInfo,
  HassioHostInfo,
  HassioHomeAssistantInfo,
} from "../../src/data/hassio";
import { makeDialogManager } from "../../src/dialogs/make-dialog-manager";
import { ProvideHassLitMixin } from "../../src/mixins/provide-hass-lit-mixin";
// Don't codesplit it, that way the dashboard always loads fast.
import "./hassio-pages-with-tabs";

// The register callback of the IronA11yKeysBehavior inside paper-icon-button
// is not called, causing _keyBindings to be uninitiliazed for paper-icon-button,
// causing an exception when added to DOM. When transpiled to ES5, this will
// break the build.
customElements.get("paper-icon-button").prototype._keyBindings = {};

@customElement("hassio-main")
class HassioMain extends ProvideHassLitMixin(HassRouterPage) {
  @property() public hass!: HomeAssistant;

  protected routerOptions: RouterOptions = {
    // Hass.io has a page with tabs, so we route all non-matching routes to it.
    defaultPage: "dashboard",
    initialLoad: () => this._fetchData(),
    showLoading: true,
    routes: {
      dashboard: {
        tag: "hassio-pages-with-tabs",
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

  @property() private _supervisorInfo: HassioSupervisorInfo;
  @property() private _hostInfo: HassioHostInfo;
  @property() private _hassInfo: HassioHomeAssistantInfo;

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

    makeDialogManager(this, document.body);
  }

  protected updatePageEl(el) {
    // the tabs page does its own routing so needs full route.
    const route =
      el.nodeName === "HASSIO-PAGES-WITH-TABS" ? this.route : this.routeTail;

    if ("setProperties" in el) {
      // As long as we have Polymer pages
      (el as PolymerElement).setProperties({
        hass: this.hass,
        supervisorInfo: this._supervisorInfo,
        hostInfo: this._hostInfo,
        hassInfo: this._hassInfo,
        route,
      });
    } else {
      el.hass = this.hass;
      el.supervisorInfo = this._supervisorInfo;
      el.hostInfo = this._hostInfo;
      el.hassInfo = this._hassInfo;
      el.route = route;
    }
  }

  private async _fetchData() {
    const [supervisorInfo, hostInfo, hassInfo] = await Promise.all([
      fetchHassioSupervisorInfo(this.hass),
      fetchHassioHostInfo(this.hass),
      fetchHassioHomeAssistantInfo(this.hass),
    ]);
    this._supervisorInfo = supervisorInfo;
    this._hostInfo = hostInfo;
    this._hassInfo = hassInfo;
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
