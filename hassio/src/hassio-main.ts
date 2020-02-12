import { customElement, PropertyValues, property } from "lit-element";
import { PolymerElement } from "@polymer/polymer";
import "@polymer/paper-icon-button";

import "../../src/resources/ha-style";
import { applyThemesOnElement } from "../../src/common/dom/apply_themes_on_element";
import { fireEvent } from "../../src/common/dom/fire_event";
import {
  HassRouterPage,
  RouterOptions,
} from "../../src/layouts/hass-router-page";
import { HomeAssistant } from "../../src/types";
import {
  fetchHassioSupervisorInfo,
  fetchHassioHomeAssistantInfo,
  HassioSupervisorInfo,
  HassioHomeAssistantInfo,
  createHassioSession,
  HassioPanelInfo,
} from "../../src/data/hassio/supervisor";
import {
  fetchHassioHostInfo,
  fetchHassioHassOsInfo,
  HassioHostInfo,
  HassioHassOSInfo,
} from "../../src/data/hassio/host";
import { fetchHassioAddonInfo } from "../../src/data/hassio/addon";
import { makeDialogManager } from "../../src/dialogs/make-dialog-manager";
import { ProvideHassLitMixin } from "../../src/mixins/provide-hass-lit-mixin";
// Don't codesplit it, that way the dashboard always loads fast.
import "./hassio-pages-with-tabs";
import { navigate } from "../../src/common/navigate";
import {
  showAlertDialog,
  AlertDialogParams,
} from "../../src/dialogs/generic/show-dialog-box";

// The register callback of the IronA11yKeysBehavior inside paper-icon-button
// is not called, causing _keyBindings to be uninitiliazed for paper-icon-button,
// causing an exception when added to DOM. When transpiled to ES5, this will
// break the build.
customElements.get("paper-icon-button").prototype._keyBindings = {};

@customElement("hassio-main")
class HassioMain extends ProvideHassLitMixin(HassRouterPage) {
  @property() public hass!: HomeAssistant;
  @property() public panel!: HassioPanelInfo;
  @property() public narrow!: boolean;

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
        load: () =>
          import(
            /* webpackChunkName: "hassio-addon-view" */ "./addon-view/hassio-addon-view"
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
  @property() private _supervisorInfo: HassioSupervisorInfo;
  @property() private _hostInfo: HassioHostInfo;
  @property() private _hassOsInfo?: HassioHassOSInfo;
  @property() private _hassInfo: HassioHomeAssistantInfo;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    applyThemesOnElement(
      this.parentElement,
      this.hass.themes,
      this.hass.selectedTheme,
      true
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
        narrow: this.narrow,
        supervisorInfo: this._supervisorInfo,
        hostInfo: this._hostInfo,
        hassInfo: this._hassInfo,
        hassOsInfo: this._hassOsInfo,
        route,
      });
    } else {
      el.hass = this.hass;
      el.narrow = this.narrow;
      el.supervisorInfo = this._supervisorInfo;
      el.hostInfo = this._hostInfo;
      el.hassInfo = this._hassInfo;
      el.hassOsInfo = this._hassOsInfo;
      el.route = route;
    }
  }

  private async _fetchData() {
    if (this.panel.config && this.panel.config.ingress) {
      await this._redirectIngress(this.panel.config.ingress);
      return;
    }

    const [supervisorInfo, hostInfo, hassInfo] = await Promise.all([
      fetchHassioSupervisorInfo(this.hass),
      fetchHassioHostInfo(this.hass),
      fetchHassioHomeAssistantInfo(this.hass),
    ]);
    this._supervisorInfo = supervisorInfo;
    this._hostInfo = hostInfo;
    this._hassInfo = hassInfo;

    if (this._hostInfo.features && this._hostInfo.features.includes("hassos")) {
      this._hassOsInfo = await fetchHassioHassOsInfo(this.hass);
    }
  }

  private async _redirectIngress(addonSlug: string) {
    // When we trigger a navigation, we sleep to make sure we don't
    // show the hassio dashboard before navigating away.
    const awaitAlert = async (
      alertParams: AlertDialogParams,
      action: () => void
    ) => {
      await new Promise((resolve) => {
        alertParams.confirm = resolve;
        showAlertDialog(this, alertParams);
      });
      action();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    };

    const createSessionPromise = createHassioSession(this.hass).then(
      () => true,
      () => false
    );

    let addon;

    try {
      addon = await fetchHassioAddonInfo(this.hass, addonSlug);
    } catch (err) {
      await awaitAlert(
        {
          text: "Unable to fetch add-on info to start Ingress",
          title: "Hass.io",
        },
        () => history.back()
      );

      return;
    }

    if (!addon.ingress_url) {
      await awaitAlert(
        {
          text: "Add-on does not support Ingress",
          title: addon.name,
        },
        () => history.back()
      );

      return;
    }

    if (addon.state !== "started") {
      await awaitAlert(
        {
          text: "Add-on is not running. Please start it first",
          title: addon.name,
        },
        () => navigate(this, `/hassio/addon/${addon.slug}`, true)
      );

      return;
    }

    if (!(await createSessionPromise)) {
      await awaitAlert(
        {
          text: "Unable to create an Ingress session",
          title: addon.name,
        },
        () => history.back()
      );

      return;
    }

    location.assign(addon.ingress_url);
    // await a promise that doesn't resolve, so we show the loading screen
    // while we load the next page.
    await new Promise(() => undefined);
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
