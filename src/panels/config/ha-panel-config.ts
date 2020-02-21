import { property, PropertyValues, customElement } from "lit-element";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-item/paper-item";
import "../../layouts/hass-loading-screen";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { HomeAssistant, Route } from "../../types";
import { CloudStatus, fetchCloudStatus } from "../../data/cloud";
import { listenMediaQuery } from "../../common/dom/media_query";
import {
  CoreFrontendUserData,
  subscribeFrontendUserData,
} from "../../data/frontend";
import { HassRouterPage, RouterOptions } from "../../layouts/hass-router-page";
import { PolymerElement } from "@polymer/polymer";
import { PageNavigation } from "../../layouts/hass-tabs-subpage";

declare global {
  // for fire event
  interface HASSDomEvents {
    "ha-refresh-cloud-status": undefined;
  }
}

export const configSections: { [name: string]: PageNavigation[] } = {
  integrations: [
    {
      component: "integrations",
      path: "/config/integrations",
      translationKey: "ui.panel.config.integrations.caption",
      icon: "hass:puzzle",
      core: true,
    },
    {
      component: "devices",
      path: "/config/devices",
      translationKey: "ui.panel.config.devices.caption",
      icon: "hass:devices",
      core: true,
    },
    {
      component: "entities",
      path: "/config/entities",
      translationKey: "ui.panel.config.entities.caption",
      icon: "hass:shape",
      core: true,
    },
    {
      component: "areas",
      path: "/config/areas",
      translationKey: "ui.panel.config.areas.caption",
      icon: "hass:sofa",
      core: true,
    },
  ],
  automation: [
    {
      component: "automation",
      path: "/config/automation",
      translationKey: "ui.panel.config.automation.caption",
      icon: "hass:robot",
    },
    {
      component: "scene",
      path: "/config/scene",
      translationKey: "ui.panel.config.scene.caption",
      icon: "hass:palette",
    },
    {
      component: "script",
      path: "/config/script",
      translationKey: "ui.panel.config.script.caption",
      icon: "hass:script-text",
    },
    {
      component: "helpers",
      path: "/config/helpers",
      translationKey: "ui.panel.config.helpers.caption",
      icon: "hass:tools",
      core: true,
    },
  ],
  persons: [
    {
      component: "person",
      path: "/config/person",
      translationKey: "ui.panel.config.person.caption",
      icon: "hass:account",
    },
    {
      component: "zone",
      path: "/config/zone",
      translationKey: "ui.panel.config.zone.caption",
      icon: "hass:map-marker-radius",
    },
    {
      component: "users",
      path: "/config/users",
      translationKey: "ui.panel.config.users.caption",
      icon: "hass:account-badge-horizontal",
      core: true,
    },
  ],
  general: [
    {
      component: "core",
      path: "/config/core",
      translationKey: "ui.panel.config.core.caption",
      icon: "hass:home-assistant",
      core: true,
    },
    {
      component: "server_control",
      path: "/config/server_control",
      translationKey: "ui.panel.config.server_control.caption",
      icon: "hass:server",
      core: true,
    },
    {
      component: "customize",
      path: "/config/customize",
      translationKey: "ui.panel.config.customize.caption",
      icon: "hass:pencil",
      core: true,
      exportOnly: true,
    },
  ],
  other: [
    {
      component: "zha",
      path: "/config/zha",
      translationKey: "ui.panel.config.zha.caption",
      icon: "hass:zigbee",
    },
    {
      component: "zwave",
      path: "/config/zwave",
      translationKey: "ui.panel.config.zwave.caption",
      icon: "hass:z-wave",
    },
  ],
};

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
      helpers: {
        tag: "ha-config-helpers",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-helpers" */ "./helpers/ha-config-helpers"
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
    this.addEventListener("ha-refresh-cloud-status", () =>
      this._updateCloudStatus()
    );
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
  }

  protected updatePageEl(el) {
    const isWide =
      this.hass.dockedSidebar === "docked" ? this._wideSidebar : this._wide;

    if ("setProperties" in el) {
      // As long as we have Polymer panels
      (el as PolymerElement).setProperties({
        route: this.routeTail,
        hass: this.hass,
        showAdvanced: Boolean(this.hass.userData?.showAdvanced),
        isWide,
        narrow: this.narrow,
        cloudStatus: this._cloudStatus,
      });
    } else {
      el.route = this.routeTail;
      el.hass = this.hass;
      el.showAdvanced = Boolean(this.hass.userData?.showAdvanced);
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
