import {
  mdiAccount,
  mdiBadgeAccountHorizontal,
  mdiCellphoneCog,
  mdiCog,
  mdiDevices,
  mdiHomeAssistant,
  mdiInformation,
  mdiLightningBolt,
  mdiMapMarkerRadius,
  mdiMathLog,
  mdiNfcVariant,
  mdiPalette,
  mdiPaletteSwatch,
  mdiPuzzle,
  mdiRobot,
  mdiScriptText,
  mdiServer,
  mdiShape,
  mdiSofa,
  mdiTools,
  mdiViewDashboard,
} from "@mdi/js";
import { PolymerElement } from "@polymer/polymer";
import { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { listenMediaQuery } from "../../common/dom/media_query";
import { CloudStatus, fetchCloudStatus } from "../../data/cloud";
import {
  fetchSupervisorAvailableUpdates,
  SupervisorAvailableUpdates,
} from "../../data/supervisor/root";
import "../../layouts/hass-loading-screen";
import { HassRouterPage, RouterOptions } from "../../layouts/hass-router-page";
import { PageNavigation } from "../../layouts/hass-tabs-subpage";
import { HomeAssistant, Route } from "../../types";

declare global {
  // for fire event
  interface HASSDomEvents {
    "ha-refresh-cloud-status": undefined;
    "ha-refresh-supervisor": undefined;
  }
}

export const configSections: { [name: string]: PageNavigation[] } = {
  dashboard: [
    {
      path: "/config/integrations",
      translationKey: "devices",
      iconPath: mdiDevices,
      iconColor: "#0D47A1",
      core: true,
    },
    {
      path: "/config/automation",
      translationKey: "automations",
      iconPath: mdiRobot,
      iconColor: "#518C43",
      core: true,
    },
    {
      path: "/config/blueprint",
      translationKey: "blueprints",
      iconPath: mdiPaletteSwatch,
      iconColor: "#64B5F6",
      component: "blueprint",
    },
    {
      path: "/hassio",
      translationKey: "supervisor",
      iconPath: mdiHomeAssistant,
      iconColor: "#4084CD",
      component: "hassio",
    },
    {
      path: "/config/lovelace/dashboards",
      translationKey: "dashboards",
      iconPath: mdiViewDashboard,
      iconColor: "#B1345C",
      component: "lovelace",
    },
    {
      path: "/config/tags",
      translationKey: "tags",
      iconPath: mdiNfcVariant,
      iconColor: "#616161",
      component: "tag",
    },
    {
      path: "/config/person",
      translationKey: "people",
      iconPath: mdiAccount,
      iconColor: "#E48629",
      components: ["person", "zone", "users"],
    },
    {
      path: "#external-app-configuration",
      translationKey: "companion",
      iconPath: mdiCellphoneCog,
      iconColor: "#8E24AA",
    },
    {
      path: "/config/server_control",
      translationKey: "settings",
      iconPath: mdiCog,
      iconColor: "#4A5963",
      core: true,
    },
  ],
  devices: [
    {
      component: "integrations",
      path: "/config/integrations",
      translationKey: "ui.panel.config.integrations.caption",
      iconPath: mdiPuzzle,
      iconColor: "#2D338F",
      core: true,
    },
    {
      component: "devices",
      path: "/config/devices",
      translationKey: "ui.panel.config.devices.caption",
      iconPath: mdiDevices,
      iconColor: "#2D338F",
      core: true,
    },
    {
      component: "entities",
      path: "/config/entities",
      translationKey: "ui.panel.config.entities.caption",
      iconPath: mdiShape,
      iconColor: "#2D338F",
      core: true,
    },
    {
      component: "areas",
      path: "/config/areas",
      translationKey: "ui.panel.config.areas.caption",
      iconPath: mdiSofa,
      iconColor: "#2D338F",
      core: true,
    },
  ],
  automations: [
    {
      component: "automation",
      path: "/config/automation",
      translationKey: "ui.panel.config.automation.caption",
      iconPath: mdiRobot,
      iconColor: "#518C43",
    },
    {
      component: "scene",
      path: "/config/scene",
      translationKey: "ui.panel.config.scene.caption",
      iconPath: mdiPalette,
      iconColor: "#518C43",
    },
    {
      component: "script",
      path: "/config/script",
      translationKey: "ui.panel.config.script.caption",
      iconPath: mdiScriptText,
      iconColor: "#518C43",
    },
    {
      component: "helpers",
      path: "/config/helpers",
      translationKey: "ui.panel.config.helpers.caption",
      iconPath: mdiTools,
      iconColor: "#4D2EA4",
      core: true,
    },
  ],
  blueprints: [
    {
      component: "blueprint",
      path: "/config/blueprint",
      translationKey: "ui.panel.config.blueprint.caption",
      iconPath: mdiPaletteSwatch,
      iconColor: "#518C43",
    },
  ],
  tags: [
    {
      component: "tag",
      path: "/config/tags",
      translationKey: "ui.panel.config.tag.caption",
      iconPath: mdiNfcVariant,
      iconColor: "#616161",
    },
  ],
  // Not used as a tab, but this way it will stay in the quick bar
  energy: [
    {
      component: "energy",
      path: "/config/energy",
      translationKey: "ui.panel.config.energy.caption",
      iconPath: mdiLightningBolt,
      iconColor: "#F1C447",
    },
  ],
  lovelace: [
    {
      component: "lovelace",
      path: "/config/lovelace/dashboards",
      translationKey: "ui.panel.config.lovelace.caption",
      iconPath: mdiViewDashboard,
      iconColor: "#B1345C",
    },
  ],
  persons: [
    {
      component: "person",
      path: "/config/person",
      translationKey: "ui.panel.config.person.caption",
      iconPath: mdiAccount,
      iconColor: "#E48629",
    },
    {
      component: "zone",
      path: "/config/zone",
      translationKey: "ui.panel.config.zone.caption",
      iconPath: mdiMapMarkerRadius,
      iconColor: "#E48629",
    },
    {
      component: "users",
      path: "/config/users",
      translationKey: "ui.panel.config.users.caption",
      iconPath: mdiBadgeAccountHorizontal,
      iconColor: "#E48629",
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
      iconColor: "#4A5963",
      core: true,
    },
    {
      component: "server_control",
      path: "/config/server_control",
      translationKey: "ui.panel.config.server_control.caption",
      iconPath: mdiServer,
      iconColor: "#4A5963",
      core: true,
    },
    {
      component: "logs",
      path: "/config/logs",
      translationKey: "ui.panel.config.logs.caption",
      iconPath: mdiMathLog,
      iconColor: "#4A5963",
      core: true,
    },
    {
      component: "info",
      path: "/config/info",
      translationKey: "ui.panel.config.info.caption",
      iconPath: mdiInformation,
      iconColor: "#4A5963",
      core: true,
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
      // customize was removed in 2021.12, fallback to dashboard
      customize: "dashboard",
      dashboard: {
        tag: "ha-config-dashboard",
        load: () => import("./dashboard/ha-config-dashboard"),
      },
      entities: {
        tag: "ha-config-entities",
        load: () => import("./entities/ha-config-entities"),
      },
      energy: {
        tag: "ha-config-energy",
        load: () => import("./energy/ha-config-energy"),
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

  @state() private _wideSidebar = false;

  @state() private _wide = false;

  @state() private _cloudStatus?: CloudStatus;

  @state() private _supervisorUpdates?: SupervisorAvailableUpdates[] | null;

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
      this.addEventListener("connection-status", (ev) => {
        if (ev.detail === "connected") {
          this._updateCloudStatus();
        }
      });
    }
    if (isComponentLoaded(this.hass, "hassio")) {
      this._loadSupervisorUpdates();
      this.addEventListener("ha-refresh-supervisor", () => {
        this._loadSupervisorUpdates();
      });
      this.addEventListener("connection-status", (ev) => {
        if (ev.detail === "connected") {
          this._loadSupervisorUpdates();
        }
      });
    } else {
      this._supervisorUpdates = null;
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
        supervisorUpdates: this._supervisorUpdates,
      });
    } else {
      el.route = this.routeTail;
      el.hass = this.hass;
      el.showAdvanced = Boolean(this.hass.userData?.showAdvanced);
      el.isWide = isWide;
      el.narrow = this.narrow;
      el.cloudStatus = this._cloudStatus;
      el.supervisorUpdates = this._supervisorUpdates;
    }
  }

  private async _updateCloudStatus() {
    this._cloudStatus = await fetchCloudStatus(this.hass);

    if (
      // Relayer connecting
      this._cloudStatus.cloud === "connecting" ||
      // Remote connecting
      (this._cloudStatus.logged_in &&
        this._cloudStatus.prefs.remote_enabled &&
        !this._cloudStatus.remote_connected)
    ) {
      setTimeout(() => this._updateCloudStatus(), 5000);
    }
  }

  private async _loadSupervisorUpdates(): Promise<void> {
    try {
      this._supervisorUpdates = await fetchSupervisorAvailableUpdates(
        this.hass
      );
    } catch (err) {
      this._supervisorUpdates = null;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-config": HaPanelConfig;
  }
}
