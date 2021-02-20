import {
  mdiAccount,
  mdiBadgeAccountHorizontal,
  mdiDevices,
  mdiHomeAssistant,
  mdiInformation,
  mdiMapMarkerRadius,
  mdiMathLog,
  mdiNfcVariant,
  mdiPalette,
  mdiPaletteSwatch,
  mdiPencil,
  mdiPuzzle,
  mdiRobot,
  mdiScriptText,
  mdiServer,
  mdiShape,
  mdiSofa,
  mdiTools,
  mdiViewDashboard,
} from "@mdi/js";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { PolymerElement } from "@polymer/polymer";
import {
  customElement,
  internalProperty,
  property,
  PropertyValues,
} from "lit-element";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { listenMediaQuery } from "../../common/dom/media_query";
import { CloudStatus, fetchCloudStatus } from "../../data/cloud";
import "../../layouts/hass-loading-screen";
import { HassRouterPage, RouterOptions } from "../../layouts/hass-router-page";
import { PageNavigation } from "../../layouts/hass-tabs-subpage";
import { HomeAssistant, Route } from "../../types";

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
      iconPath: mdiPuzzle,
      core: true,
    },
    {
      component: "devices",
      path: "/config/devices",
      translationKey: "ui.panel.config.devices.caption",
      iconPath: mdiDevices,
      core: true,
    },
    {
      component: "entities",
      path: "/config/entities",
      translationKey: "ui.panel.config.entities.caption",
      iconPath: mdiShape,
      core: true,
    },
    {
      component: "areas",
      path: "/config/areas",
      translationKey: "ui.panel.config.areas.caption",
      iconPath: mdiSofa,
      core: true,
    },
  ],
  automation: [
    {
      component: "blueprint",
      path: "/config/blueprint",
      translationKey: "ui.panel.config.blueprint.caption",
      iconPath: mdiPaletteSwatch,
    },
    {
      component: "automation",
      path: "/config/automation",
      translationKey: "ui.panel.config.automation.caption",
      iconPath: mdiRobot,
    },
    {
      component: "scene",
      path: "/config/scene",
      translationKey: "ui.panel.config.scene.caption",
      iconPath: mdiPalette,
    },
    {
      component: "script",
      path: "/config/script",
      translationKey: "ui.panel.config.script.caption",
      iconPath: mdiScriptText,
    },
  ],
  helpers: [
    {
      component: "helpers",
      path: "/config/helpers",
      translationKey: "ui.panel.config.helpers.caption",
      iconPath: mdiTools,
      core: true,
    },
  ],
  experimental: [
    {
      component: "tags",
      path: "/config/tags",
      translationKey: "ui.panel.config.tags.caption",
      iconPath: mdiNfcVariant,
      core: true,
    },
  ],
  lovelace: [
    {
      component: "lovelace",
      path: "/config/lovelace/dashboards",
      translationKey: "ui.panel.config.lovelace.caption",
      iconPath: mdiViewDashboard,
    },
  ],
  persons: [
    {
      component: "person",
      path: "/config/person",
      translationKey: "ui.panel.config.person.caption",
      iconPath: mdiAccount,
    },
    {
      component: "zone",
      path: "/config/zone",
      translationKey: "ui.panel.config.zone.caption",
      iconPath: mdiMapMarkerRadius,
    },
    {
      component: "users",
      path: "/config/users",
      translationKey: "ui.panel.config.users.caption",
      iconPath: mdiBadgeAccountHorizontal,
      core: true,
      advancedOnly: true,
    },
  ],
  general: [
    {
      component: "core",
      path: "/config/core",
      translationKey: "ui.panel.config.core.caption",
      iconPath: mdiHomeAssistant,
      core: true,
    },
    {
      component: "server_control",
      path: "/config/server_control",
      translationKey: "ui.panel.config.server_control.caption",
      iconPath: mdiServer,
      core: true,
    },
    {
      component: "logs",
      path: "/config/logs",
      translationKey: "ui.panel.config.logs.caption",
      iconPath: mdiMathLog,
      core: true,
    },
    {
      component: "info",
      path: "/config/info",
      translationKey: "ui.panel.config.info.caption",
      iconPath: mdiInformation,
      core: true,
    },
  ],
  advanced: [
    {
      component: "customize",
      path: "/config/customize",
      translationKey: "ui.panel.config.customize.caption",
      iconPath: mdiPencil,
      core: true,
      advancedOnly: true,
    },
  ],
};

@customElement("ha-panel-config")
class HaPanelConfig extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    routes: {
      areas: {
        tag: "ha-config-areas",
        load: () => import("./areas/ha-config-areas"),
      },
      automation: {
        tag: "ha-config-automation",
        load: () => import("./automation/ha-config-automation"),
      },
      blueprint: {
        tag: "ha-config-blueprint",
        load: () => import("./blueprint/ha-config-blueprint"),
      },
      tags: {
        tag: "ha-config-tags",
        load: () => import("./tags/ha-config-tags"),
      },
      cloud: {
        tag: "ha-config-cloud",
        load: () => import("./cloud/ha-config-cloud"),
      },
      core: {
        tag: "ha-config-core",
        load: () => import("./core/ha-config-core"),
      },
      devices: {
        tag: "ha-config-devices",
        load: () => import("./devices/ha-config-devices"),
      },
      server_control: {
        tag: "ha-config-server-control",
        load: () => import("./server_control/ha-config-server-control"),
      },
      logs: {
        tag: "ha-config-logs",
        load: () => import("./logs/ha-config-logs"),
      },
      info: {
        tag: "ha-config-info",
        load: () => import("./info/ha-config-info"),
      },
      customize: {
        tag: "ha-config-customize",
        load: () => import("./customize/ha-config-customize"),
      },
      dashboard: {
        tag: "ha-config-dashboard",
        load: () => import("./dashboard/ha-config-dashboard"),
      },
      entities: {
        tag: "ha-config-entities",
        load: () => import("./entities/ha-config-entities"),
      },
      integrations: {
        tag: "ha-config-integrations",
        load: () => import("./integrations/ha-config-integrations"),
      },
      lovelace: {
        tag: "ha-config-lovelace",
        load: () => import("./lovelace/ha-config-lovelace"),
      },
      person: {
        tag: "ha-config-person",
        load: () => import("./person/ha-config-person"),
      },
      script: {
        tag: "ha-config-script",
        load: () => import("./script/ha-config-script"),
      },
      scene: {
        tag: "ha-config-scene",
        load: () => import("./scene/ha-config-scene"),
      },
      helpers: {
        tag: "ha-config-helpers",
        load: () => import("./helpers/ha-config-helpers"),
      },
      users: {
        tag: "ha-config-users",
        load: () => import("./users/ha-config-users"),
      },
      zone: {
        tag: "ha-config-zone",
        load: () => import("./zone/ha-config-zone"),
      },
      zha: {
        tag: "zha-config-dashboard-router",
        load: () =>
          import(
            "./integrations/integration-panels/zha/zha-config-dashboard-router"
          ),
      },
      zwave: {
        tag: "zwave-config-router",
        load: () =>
          import("./integrations/integration-panels/zwave/zwave-config-router"),
      },
      mqtt: {
        tag: "mqtt-config-panel",
        load: () =>
          import("./integrations/integration-panels/mqtt/mqtt-config-panel"),
      },
      ozw: {
        tag: "ozw-config-router",
        load: () =>
          import("./integrations/integration-panels/ozw/ozw-config-router"),
      },
      zwave_js: {
        tag: "zwave_js-config-router",
        load: () =>
          import(
            "./integrations/integration-panels/zwave_js/zwave_js-config-router"
          ),
      },
    },
  };

  @internalProperty() private _wideSidebar = false;

  @internalProperty() private _wide = false;

  @internalProperty() private _cloudStatus?: CloudStatus;

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
    this.hass.loadBackendTranslation("title");
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
