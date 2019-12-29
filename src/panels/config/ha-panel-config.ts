import { property, PropertyValues, customElement } from "lit-element";
import "../../layouts/hass-loading-screen";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { HomeAssistant } from "../../types";
import { CloudStatus, fetchCloudStatus } from "../../data/cloud";
import { listenMediaQuery } from "../../common/dom/media_query";
import { HassRouterPage, RouterOptions } from "../../layouts/hass-router-page";
import {
  CoreFrontendUserData,
  getOptimisticFrontendUserDataCollection,
} from "../../data/frontend";
import { PolymerElement } from "@polymer/polymer";

declare global {
  // for fire event
  interface HASSDomEvents {
    "ha-refresh-cloud-status": undefined;
  }
}

@customElement("ha-panel-config")
class HaPanelConfig extends HassRouterPage {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    cacheAll: true,
    preloadAll: true,
    routes: {
      area_registry: {
        tag: "ha-config-area-registry",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-area-registry" */ "./area_registry/ha-config-area-registry"
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
      entity_registry: {
        tag: "ha-config-entity-registry",
        load: () =>
          import(
            /* webpackChunkName: "panel-config-entity-registry" */ "./entity_registry/ha-config-entity-registry"
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
  }

  protected updatePageEl(el) {
    const showAdvanced = !!(
      this._coreUserData && this._coreUserData.showAdvanced
    );
    const isWide =
      this.hass.dockedSidebar === "docked" ? this._wideSidebar : this._wide;

    if ("setProperties" in el) {
      // As long as we have Polymer panels
      (el as PolymerElement).setProperties({
        route: this.routeTail,
        hass: this.hass,
        showAdvanced,
        isWide,
        narrow: this.narrow,
        cloudStatus: this._cloudStatus,
      });
    } else {
      el.route = this.routeTail;
      el.hass = this.hass;
      el.showAdvanced = showAdvanced;
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
