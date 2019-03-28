import { property, PropertyValues, customElement } from "lit-element";
import "../../layouts/hass-loading-screen";
import isComponentLoaded from "../../common/config/is_component_loaded";
import { HomeAssistant } from "../../types";
import { CloudStatus, fetchCloudStatus } from "../../data/cloud";
import { listenMediaQuery } from "../../common/dom/media_query";
import { HassRouterPage, RouterOptions } from "../../layouts/hass-router-page";

@customElement("ha-panel-config")
class HaPanelConfig extends HassRouterPage {
  @property() public hass!: HomeAssistant;
  @property() public _wideSidebar: boolean = false;
  @property() public _wide: boolean = false;

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    cacheAll: true,
    preloadAll: true,
    routes: {
      area_registry: {
        tag: "ha-config-area-registry",
        load: () =>
          import(/* webpackChunkName: "panel-config-area-registry" */ "./area_registry/ha-config-area-registry"),
      },
      automation: {
        tag: "ha-config-automation",
        load: () =>
          import(/* webpackChunkName: "panel-config-automation" */ "./automation/ha-config-automation"),
      },
      cloud: {
        tag: "ha-config-cloud",
        load: () =>
          import(/* webpackChunkName: "panel-config-cloud" */ "./cloud/ha-config-cloud"),
      },
      core: {
        tag: "ha-config-core",
        load: () =>
          import(/* webpackChunkName: "panel-config-core" */ "./core/ha-config-core"),
      },
      customize: {
        tag: "ha-config-customize",
        load: () =>
          import(/* webpackChunkName: "panel-config-customize" */ "./customize/ha-config-customize"),
      },
      dashboard: {
        tag: "ha-config-dashboard",
        load: () =>
          import(/* webpackChunkName: "panel-config-dashboard" */ "./dashboard/ha-config-dashboard"),
      },
      entity_registry: {
        tag: "ha-config-entity-registry",
        load: () =>
          import(/* webpackChunkName: "panel-config-entity-registry" */ "./entity_registry/ha-config-entity-registry"),
      },
      integrations: {
        tag: "ha-config-integrations",
        load: () =>
          import(/* webpackChunkName: "panel-config-integrations" */ "./integrations/ha-config-integrations"),
      },
      person: {
        tag: "ha-config-person",
        load: () =>
          import(/* webpackChunkName: "panel-config-person" */ "./person/ha-config-person"),
      },
      script: {
        tag: "ha-config-script",
        load: () =>
          import(/* webpackChunkName: "panel-config-script" */ "./script/ha-config-script"),
      },
      users: {
        tag: "ha-config-users",
        load: () =>
          import(/* webpackChunkName: "panel-config-users" */ "./users/ha-config-users"),
      },
      zha: {
        tag: "zha-config-panel",
        load: () =>
          import(/* webpackChunkName: "panel-config-zha" */ "./zha/zha-config-panel"),
      },
      zwave: {
        tag: "ha-config-zwave",
        load: () =>
          import(/* webpackChunkName: "panel-config-zwave" */ "./zwave/ha-config-zwave"),
      },
    },
  };

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
  }

  protected updatePageEl(el) {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.isWide = this.hass.dockedSidebar ? this._wideSidebar : this._wide;
    el.cloudStatus = this._cloudStatus;
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
