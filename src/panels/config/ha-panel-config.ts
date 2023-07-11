import { ContextProvider } from "@lit-labs/context";
import {
  mdiAccount,
  mdiBackupRestore,
  mdiBadgeAccountHorizontal,
  mdiCellphoneCog,
  mdiCog,
  mdiDatabase,
  mdiDevices,
  mdiInformation,
  mdiInformationOutline,
  mdiLightningBolt,
  mdiMapMarkerRadius,
  mdiMathLog,
  mdiMemory,
  mdiMicrophone,
  mdiNetwork,
  mdiNfcVariant,
  mdiPalette,
  mdiPaletteSwatch,
  mdiPuzzle,
  mdiRobot,
  mdiScrewdriver,
  mdiScriptText,
  mdiShape,
  mdiSofa,
  mdiTools,
  mdiUpdate,
  mdiViewDashboard,
} from "@mdi/js";
import { PolymerElement } from "@polymer/polymer";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { listenMediaQuery } from "../../common/dom/media_query";
import { CloudStatus, fetchCloudStatus } from "../../data/cloud";
import { fullEntitiesContext } from "../../data/context";
import {
  entityRegistryByEntityId,
  entityRegistryById,
  subscribeEntityRegistry,
} from "../../data/entity_registry";
import { HassRouterPage, RouterOptions } from "../../layouts/hass-router-page";
import { PageNavigation } from "../../layouts/hass-tabs-subpage";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
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
      path: "/config/areas",
      translationKey: "areas",
      iconPath: mdiSofa,
      iconColor: "#E48629",
      components: ["zone"],
    },
    {
      path: "/hassio",
      translationKey: "supervisor",
      iconPath: mdiPuzzle,
      iconColor: "#F1C447",
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
      path: "/config/voice-assistants",
      translationKey: "voice_assistants",
      iconPath: mdiMicrophone,
      iconColor: "#3263C3",
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
      iconColor: "#5A87FA",
      components: ["person", "users"],
    },
    {
      path: "#external-app-configuration",
      translationKey: "companion",
      iconPath: mdiCellphoneCog,
      iconColor: "#8E24AA",
    },
    {
      path: "/config/system",
      translationKey: "system",
      iconPath: mdiCog,
      iconColor: "#301ABE",
      core: true,
    },
    {
      path: "/config/info",
      translationKey: "about",
      iconPath: mdiInformationOutline,
      iconColor: "#4A5963",
      core: true,
    },
  ],
  backup: [
    {
      path: "/config/backup",
      translationKey: "ui.panel.config.backup.caption",
      iconPath: mdiBackupRestore,
      iconColor: "#4084CD",
      component: "backup",
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
      component: "helpers",
      path: "/config/helpers",
      translationKey: "ui.panel.config.helpers.caption",
      iconPath: mdiTools,
      iconColor: "#4D2EA4",
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
  voice_assistants: [
    {
      path: "/config/voice-assistants",
      translationKey: "ui.panel.config.dashboard.voice_assistants.main",
      iconPath: mdiMicrophone,
      iconColor: "#3263C3",
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
      iconColor: "#5A87FA",
    },
    {
      component: "users",
      path: "/config/users",
      translationKey: "ui.panel.config.users.caption",
      iconPath: mdiBadgeAccountHorizontal,
      iconColor: "#5A87FA",
      core: true,
      advancedOnly: true,
    },
  ],
  areas: [
    {
      component: "areas",
      path: "/config/areas",
      translationKey: "ui.panel.config.areas.caption",
      iconPath: mdiSofa,
      iconColor: "#2D338F",
      core: true,
    },
    {
      component: "zone",
      path: "/config/zone",
      translationKey: "ui.panel.config.zone.caption",
      iconPath: mdiMapMarkerRadius,
      iconColor: "#E48629",
    },
  ],
  general: [
    {
      path: "/config/general",
      translationKey: "core",
      iconPath: mdiCog,
      iconColor: "#653249",
      core: true,
    },
    {
      path: "/config/updates",
      translationKey: "updates",
      iconPath: mdiUpdate,
      iconColor: "#3B808E",
    },
    {
      path: "/config/repairs",
      translationKey: "repairs",
      iconPath: mdiScrewdriver,
      iconColor: "#5c995c",
    },
    {
      component: "logs",
      path: "/config/logs",
      translationKey: "logs",
      iconPath: mdiMathLog,
      iconColor: "#C65326",
      core: true,
    },
    {
      path: "/config/backup",
      translationKey: "backup",
      iconPath: mdiBackupRestore,
      iconColor: "#0D47A1",
      component: "backup",
    },
    {
      path: "/hassio/backups",
      translationKey: "backup",
      iconPath: mdiBackupRestore,
      iconColor: "#0D47A1",
      component: "hassio",
    },
    {
      path: "/config/analytics",
      translationKey: "analytics",
      iconPath: mdiShape,
      iconColor: "#f1c447",
    },
    {
      path: "/config/network",
      translationKey: "network",
      iconPath: mdiNetwork,
      iconColor: "#B1345C",
    },
    {
      path: "/config/storage",
      translationKey: "storage",
      iconPath: mdiDatabase,
      iconColor: "#518C43",
      component: "hassio",
    },
    {
      path: "/config/hardware",
      translationKey: "hardware",
      iconPath: mdiMemory,
      iconColor: "#301A8E",
      components: ["hassio", "hardware"],
    },
  ],
  about: [
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
class HaPanelConfig extends SubscribeMixin(HassRouterPage) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  private _entitiesContext = new ContextProvider(this, {
    context: fullEntitiesContext,
    initialValue: [],
  });

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entitiesContext.setValue(entities);
      }),
    ];
  }

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    routes: {
      analytics: {
        tag: "ha-config-section-analytics",
        load: () => import("./core/ha-config-section-analytics"),
      },
      areas: {
        tag: "ha-config-areas",
        load: () => import("./areas/ha-config-areas"),
      },
      "voice-assistants": {
        tag: "ha-config-voice-assistants",
        load: () => import("./voice-assistants/ha-config-voice-assistants"),
      },
      automation: {
        tag: "ha-config-automation",
        load: () => import("./automation/ha-config-automation"),
      },
      backup: {
        tag: "ha-config-backup",
        load: () => import("./backup/ha-config-backup"),
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
      devices: {
        tag: "ha-config-devices",
        load: () => import("./devices/ha-config-devices"),
      },
      system: {
        tag: "ha-config-system-navigation",
        load: () => import("./core/ha-config-system-navigation"),
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
      hardware: {
        tag: "ha-config-hardware",
        load: () => import("./hardware/ha-config-hardware"),
      },
      integrations: {
        tag: "ha-config-integrations",
        load: () => import("./integrations/ha-config-integrations"),
      },
      lovelace: {
        tag: "ha-config-lovelace",
        load: () => import("./lovelace/ha-config-lovelace"),
      },
      network: {
        tag: "ha-config-section-network",
        load: () => import("./network/ha-config-section-network"),
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
      storage: {
        tag: "ha-config-section-storage",
        load: () => import("./storage/ha-config-section-storage"),
      },
      updates: {
        tag: "ha-config-section-updates",
        load: () => import("./core/ha-config-section-updates"),
      },
      repairs: {
        tag: "ha-config-repairs-dashboard",
        load: () => import("./repairs/ha-config-repairs-dashboard"),
      },
      users: {
        tag: "ha-config-users",
        load: () => import("./users/ha-config-users"),
      },
      zone: {
        tag: "ha-config-zone",
        load: () => import("./zone/ha-config-zone"),
      },
      general: {
        tag: "ha-config-section-general",
        load: () => import("./core/ha-config-section-general"),
      },
      zha: {
        tag: "zha-config-dashboard-router",
        load: () =>
          import(
            "./integrations/integration-panels/zha/zha-config-dashboard-router"
          ),
      },
      mqtt: {
        tag: "mqtt-config-panel",
        load: () =>
          import("./integrations/integration-panels/mqtt/mqtt-config-panel"),
      },
      zwave_js: {
        tag: "zwave_js-config-router",
        load: () =>
          import(
            "./integrations/integration-panels/zwave_js/zwave_js-config-router"
          ),
      },
      matter: {
        tag: "matter-config-panel",
        load: () =>
          import(
            "./integrations/integration-panels/matter/matter-config-panel"
          ),
      },
      thread: {
        tag: "thread-config-panel",
        load: () =>
          import(
            "./integrations/integration-panels/thread/thread-config-panel"
          ),
      },
      application_credentials: {
        tag: "ha-config-application-credentials",
        load: () =>
          import("./application_credentials/ha-config-application-credentials"),
      },
    },
  };

  @state() private _wideSidebar = false;

  @state() private _wide = false;

  @state() private _cloudStatus?: CloudStatus;

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
    entityRegistryByEntityId.clear();
    entityRegistryById.clear();
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("title");
    this.hass.loadBackendTranslation("services");
    if (isComponentLoaded(this.hass, "cloud")) {
      this._updateCloudStatus();
      this.addEventListener("connection-status", (ev) => {
        if (ev.detail === "connected") {
          this._updateCloudStatus();
        }
      });
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-config": HaPanelConfig;
  }
}
