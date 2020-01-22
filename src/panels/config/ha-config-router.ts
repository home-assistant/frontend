import { property, customElement } from "lit-element";
import "../../layouts/hass-loading-screen";
import { HomeAssistant } from "../../types";
import { CloudStatus } from "../../data/cloud";
import { HassRouterPage, RouterOptions } from "../../layouts/hass-router-page";
import { PolymerElement } from "@polymer/polymer";

declare global {
  // for fire event
  interface HASSDomEvents {
    "ha-refresh-cloud-status": undefined;
  }
}

@customElement("ha-config-router")
class HaConfigRouter extends HassRouterPage {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
  @property() public wideSidebar: boolean = false;
  @property() public wide: boolean = false;
  @property() public isWide: boolean = false;
  @property() public showAdvanced: boolean = false;
  @property() public cloudStatus?: CloudStatus;

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
  protected updatePageEl(el) {
    if ("setProperties" in el) {
      // As long as we have Polymer panels
      (el as PolymerElement).setProperties({
        route: this.routeTail,
        hass: this.hass,
        showAdvanced: this.showAdvanced,
        isWide: this.isWide,
        narrow: this.narrow,
        cloudStatus: this.cloudStatus,
      });
    } else {
      el.route = this.routeTail;
      el.hass = this.hass;
      el.showAdvanced = this.showAdvanced;
      el.isWide = this.isWide;
      el.narrow = this.narrow;
      el.cloudStatus = this.cloudStatus;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-router": HaConfigRouter;
  }
}
