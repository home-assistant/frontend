import { PolymerElement } from "@polymer/polymer";
import {
  customElement,
  property,
  internalProperty,
  PropertyValues,
} from "lit-element";
import { applyThemesOnElement } from "../../src/common/dom/apply_themes_on_element";
import { fireEvent } from "../../src/common/dom/fire_event";
import {
  fetchHassioHassOsInfo,
  fetchHassioHostInfo,
  HassioHassOSInfo,
  HassioHostInfo,
} from "../../src/data/hassio/host";
import {
  fetchHassioHomeAssistantInfo,
  fetchHassioSupervisorInfo,
  fetchHassioInfo,
  HassioHomeAssistantInfo,
  HassioInfo,
  HassioPanelInfo,
  HassioSupervisorInfo,
} from "../../src/data/hassio/supervisor";
import { makeDialogManager } from "../../src/dialogs/make-dialog-manager";
import {
  HassRouterPage,
  RouterOptions,
} from "../../src/layouts/hass-router-page";
import { ProvideHassLitMixin } from "../../src/mixins/provide-hass-lit-mixin";
import "../../src/resources/ha-style";
import { HomeAssistant } from "../../src/types";
// Don't codesplit it, that way the dashboard always loads fast.
import "./hassio-panel";
import { urlSyncMixin } from "../../src/state/url-sync-mixin";

@customElement("hassio-main")
class HassioMain extends urlSyncMixin(ProvideHassLitMixin(HassRouterPage)) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public panel!: HassioPanelInfo;

  @property() public narrow!: boolean;

  protected routerOptions: RouterOptions = {
    // Hass.io has a page with tabs, so we route all non-matching routes to it.
    defaultPage: "dashboard",
    initialLoad: () => this._fetchData(),
    showLoading: true,
    routes: {
      dashboard: {
        tag: "hassio-panel",
        cache: true,
      },
      snapshots: "dashboard",
      store: "dashboard",
      system: "dashboard",
      addon: {
        tag: "hassio-addon-dashboard",
        load: () =>
          import(
            /* webpackChunkName: "hassio-addon-dashboard" */ "./addon-view/hassio-addon-dashboard"
          ),
      },
      ingress: {
        tag: "hassio-ingress-view",
        load: () =>
          import(
            /* webpackChunkName: "hassio-ingress-view" */ "./ingress-view/hassio-ingress-view"
          ),
      },
    },
  };

  @internalProperty() private _supervisorInfo: HassioSupervisorInfo;

  @internalProperty() private _hostInfo: HassioHostInfo;

  @internalProperty() private _hassioInfo?: HassioInfo;

  @internalProperty() private _hassOsInfo?: HassioHassOSInfo;

  @internalProperty() private _hassInfo: HassioHomeAssistantInfo;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    applyThemesOnElement(
      this.parentElement,
      this.hass.themes,
      this.hass.selectedTheme || this.hass.themes.default_theme
    );

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

    // Forward haptic events to parent window.
    window.addEventListener("haptic", (ev) => {
      // @ts-ignore
      fireEvent(window.parent, ev.type, ev.detail, {
        bubbles: false,
      });
    });

    makeDialogManager(this, this);
  }

  protected updatePageEl(el) {
    // the tabs page does its own routing so needs full route.
    const route = el.nodeName === "HASSIO-PANEL" ? this.route : this.routeTail;

    if ("setProperties" in el) {
      // As long as we have Polymer pages
      (el as PolymerElement).setProperties({
        hass: this.hass,
        narrow: this.narrow,
        supervisorInfo: this._supervisorInfo,
        hassioInfo: this._hassioInfo,
        hostInfo: this._hostInfo,
        hassInfo: this._hassInfo,
        hassOsInfo: this._hassOsInfo,
        route,
      });
    } else {
      el.hass = this.hass;
      el.narrow = this.narrow;
      el.supervisorInfo = this._supervisorInfo;
      el.hassioInfo = this._hassioInfo;
      el.hostInfo = this._hostInfo;
      el.hassInfo = this._hassInfo;
      el.hassOsInfo = this._hassOsInfo;
      el.route = route;
    }
  }

  private async _fetchData() {
    if (this.panel.config && this.panel.config.ingress) {
      this._redirectIngress(this.panel.config.ingress);
      return;
    }

    const [supervisorInfo, hostInfo, hassInfo, hassioInfo] = await Promise.all([
      fetchHassioSupervisorInfo(this.hass),
      fetchHassioHostInfo(this.hass),
      fetchHassioHomeAssistantInfo(this.hass),
      fetchHassioInfo(this.hass),
    ]);
    this._supervisorInfo = supervisorInfo;
    this._hassioInfo = hassioInfo;
    this._hostInfo = hostInfo;
    this._hassInfo = hassInfo;

    if (this._hostInfo.features && this._hostInfo.features.includes("hassos")) {
      this._hassOsInfo = await fetchHassioHassOsInfo(this.hass);
    }
  }

  private _redirectIngress(addonSlug: string) {
    this.route = { prefix: "/hassio", path: `/ingress/${addonSlug}` };
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
