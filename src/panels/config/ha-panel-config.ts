import { property, PropertyValues, customElement } from "lit-element";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-item/paper-item";
import "../../layouts/hass-loading-screen";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { HomeAssistant, Route } from "../../types";
import { CloudStatus, fetchCloudStatus } from "../../data/cloud";
import { listenMediaQuery } from "../../common/dom/media_query";
import {
  getOptimisticFrontendUserDataCollection,
  CoreFrontendUserData,
} from "../../data/frontend";
import { HassRouterPage, RouterOptions } from "../../layouts/hass-router-page";
import { PolymerElement } from "@polymer/polymer";
import { ConfigPageNavigation } from "./dashboard/ha-config-navigation";

declare global {
  // for fire event
  interface HASSDomEvents {
    "ha-refresh-cloud-status": undefined;
  }
}

export const configSections: ConfigPageNavigation[][] = [
  [
    { page: "integrations", icon: "hass:home-assistant", core: true },
    { page: "devices", icon: "hass:home-assistant", core: true },
    { page: "entities", icon: "hass:home-assistant", core: true },
    { page: "areas", icon: "hass:home-assistant", core: true },
  ],
  [
    { page: "automation", icon: "hass:home-assistant" },
    { page: "scene", icon: "hass:home-assistant" },
    { page: "script", icon: "hass:home-assistant" },
  ],
  [
    { page: "person", icon: "hass:home-assistant" },
    { page: "zone", icon: "hass:home-assistant", core: true },
    { page: "users", icon: "hass:home-assistant", core: true },
  ],
  [
    { page: "core", icon: "hass:home-assistant", core: true },
    { page: "server_control", icon: "hass:home-assistant", core: true },
    {
      page: "customize",
      icon: "hass:home-assistant",
      core: true,
      advanced: true,
    },
    { page: "zha" },
    { page: "zwave" },
  ],
];

@customElement("ha-panel-config")
class HaPanelConfig extends HassRouterPage {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
  @property() public route!: Route;

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    cacheAll: true,
    preloadAll: true,
    routes: {
      areas: {
        tag: "ha-config-areas",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-areas" */ "./areas/ha-config-areas"
          ),
      },
      automation: {
        tag: "ha-config-automation",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-automation" */ "./automation/ha-config-automation"
          ),
      },
      cloud: {
        tag: "ha-config-cloud",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-cloud" */ "./cloud/ha-config-cloud"
          ),
      },
      core: {
        tag: "ha-config-core",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-core" */ "./core/ha-config-core"
          ),
      },
      devices: {
        tag: "ha-config-devices",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-devices" */ "./devices/ha-config-devices"
          ),
      },
      server_control: {
        tag: "ha-config-server-control",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-server-control" */ "./server_control/ha-config-server-control"
          ),
      },
      customize: {
        tag: "ha-config-customize",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-customize" */ "./customize/ha-config-customize"
          ),
      },
      dashboard: {
        tag: "ha-config-dashboard",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-dashboard" */ "./dashboard/ha-config-dashboard"
          ),
      },
      entities: {
        tag: "ha-config-entities",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-entities" */ "./entities/ha-config-entities"
          ),
      },
      integrations: {
        tag: "ha-config-integrations",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-integrations" */ "./integrations/ha-config-integrations"
          ),
      },
      person: {
        tag: "ha-config-person",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-person" */ "./person/ha-config-person"
          ),
      },
      script: {
        tag: "ha-config-script",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-script" */ "./script/ha-config-script"
          ),
      },
      scene: {
        tag: "ha-config-scene",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-scene" */ "./scene/ha-config-scene"
          ),
      },
      users: {
        tag: "ha-config-users",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-users" */ "./users/ha-config-users"
          ),
      },
      zone: {
        tag: "ha-config-zone",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-zone" */ "./zone/ha-config-zone"
          ),
      },
      zha: {
        tag: "zha-config-dashboard-router",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-zha" */ "./zha/zha-config-dashboard-router"
          ),
      },
      zwave: {
        tag: "ha-config-zwave",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-zwave" */ "./zwave/ha-config-zwave"
          ),
      },
    },
  };

  @property() private _wideSidebar: boolean = false;
  @property() private _wide: boolean = false;
  @property() private _coreUserData?: CoreFrontendUserData;
  @property() private _showAdvanced = false;
  @property() private _cloudStatus?: CloudStatus;

  private _listeners: Array<() => void> = [];

  public connectedCallback() {
    super.connectedCallback();
    this._listeners.push(
      listenMediaQuery("(min-width: 1040px)", (matches) => {
        this._wide = matches;
      })
    );
    this._listeners.push(
      listenMediaQuery("(min-width: 1296px)", (matches) => {
        this._wideSidebar = matches;
      })
    );
    this._listeners.push(
      getOptimisticFrontendUserDataCollection(
        this.hass.connection,
        "core"
      ).subscribe((coreUserData) => {
        this._coreUserData = coreUserData || {};
        this._showAdvanced = !!(
          this._coreUserData && this._coreUserData.showAdvanced
        );
      })
    );
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    while (this._listeners.length) {
      this._listeners.pop()!();
    }
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (isComponentLoaded(this.hass, "cloud")) {
      this._updateCloudStatus();
    }
    this.style.setProperty(
      "--app-header-background-color",
      "var(--sidebar-background-color)"
    );
    this.style.setProperty(
      "--app-header-text-color",
      "var(--sidebar-text-color)"
    );
    this.style.setProperty(
      "--app-header-border-bottom",
      "1px solid var(--divider-color)"
    );
    this.addEventListener("ha-refresh-cloud-status", () =>
      this._updateCloudStatus()
    );
  }

  protected updatePageEl(el) {
    const isWide =
      this.hass.dockedSidebar === "docked" ? this._wideSidebar : this._wide;

    if ("setProperties" in el) {
      // As long as we have Polymer panels
      (el as PolymerElement).setProperties({
        route: this.routeTail,
        hass: this.hass,
        showAdvanced: this._showAdvanced,
        isWide,
        narrow: this.narrow,
        cloudStatus: this._cloudStatus,
      });
    } else {
      el.route = this.routeTail;
      el.hass = this.hass;
      el.showAdvanced = this._showAdvanced;
      el.isWide = isWide;
      el.narrow = this.narrow;
      el.cloudStatus = this._cloudStatus;
    }
  }

  private async _updateCloudStatus() {
    this._cloudStatus = await fetchCloudStatus(this.hass);

    if (this._cloudStatus.cloud === "connecting") {
      setTimeout(() => this._updateCloudStatus(), 5000);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-config": HaPanelConfig;
  }
}
