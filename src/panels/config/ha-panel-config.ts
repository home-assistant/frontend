import { ContextProvider } from "@lit/context";
import {
  mdiAccount,
  mdiBackupRestore,
  mdiBadgeAccountHorizontal,
  mdiBluetooth,
  mdiCellphoneCog,
  mdiCog,
  mdiDatabase,
  mdiDevices,
  mdiFlask,
  mdiInformation,
  mdiInformationOutline,
  mdiLabel,
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
  mdiLan,
  mdiSofa,
  mdiTools,
  mdiUpdate,
  mdiViewDashboard,
  mdiZigbee,
  mdiZWave,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { listenMediaQuery } from "../../common/dom/media_query";
import type { CloudStatus } from "../../data/cloud";
import { fetchCloudStatus } from "../../data/cloud";
import { fullEntitiesContext, labelsContext } from "../../data/context";
import {
  entityRegistryByEntityId,
  entityRegistryById,
  subscribeEntityRegistry,
} from "../../data/entity/entity_registry";
import { subscribeLabelRegistry } from "../../data/label/label_registry";
import type { RouterOptions } from "../../layouts/hass-router-page";
import { HassRouterPage } from "../../layouts/hass-router-page";
import type { PageNavigation } from "../../layouts/hass-tabs-subpage";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import type { HomeAssistant, Route } from "../../types";

declare global {
  // for fire event
  interface HASSDomEvents {
    "ha-refresh-cloud-status": undefined;
    "ha-refresh-supervisor": undefined;
  }
}

export const configSections: Record<string, PageNavigation[]> = {
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
      component: "zone",
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
  ],
  dashboard_2: [
    {
      path: "/config/matter",
      name: "Matter",
      iconPath:
        "M7.228375 6.41685c0.98855 0.80195 2.16365 1.3412 3.416275 1.56765V1.30093l1.3612 -0.7854275 1.360125 0.7854275V7.9845c1.252875 -0.226675 2.4283 -0.765875 3.41735 -1.56765l2.471225 1.4293c-4.019075 3.976275 -10.490025 3.976275 -14.5091 0l2.482925 -1.4293Zm3.00335 17.067575c1.43325 -5.47035 -1.8052 -11.074775 -7.2604 -12.564675v2.859675c1.189125 0.455 2.244125 1.202875 3.0672 2.174275L0.25 19.2955v1.5719l1.3611925 0.781175L7.39865 18.3068c0.430175 1.19825 0.550625 2.48575 0.35015 3.743l2.482925 1.434625ZM21.034 10.91975c-5.452225 1.4932 -8.6871 7.09635 -7.254025 12.564675l2.47655 -1.43035c-0.200025 -1.257275 -0.079575 -2.544675 0.35015 -3.743025l5.7832 3.337525L23.75 20.86315V19.2955L17.961475 15.9537c0.8233 -0.97115 1.878225 -1.718975 3.0672 -2.174275l0.005325 -2.859675Z",
      iconColor: "#2458B3",
      component: "matter",
      translationKey: "matter",
    },
    {
      path: "/config/zha",
      name: "Zigbee",
      iconPath: mdiZigbee,
      iconColor: "#E74011",
      component: "zha",
      translationKey: "zha",
    },
    {
      path: "/config/zwave_js",
      name: "Z-Wave",
      iconPath: mdiZWave,
      iconColor: "#153163",
      component: "zwave_js",
      translationKey: "zwave_js",
    },
    {
      path: "/knx",
      name: "KNX",
      iconPath: mdiLan,
      iconColor: "#4EAA66",
      component: "knx",
      translationKey: "knx",
    },
    {
      path: "/config/thread",
      name: "Thread",
      iconPath:
        "M82.498,0C37.008,0,0,37.008,0,82.496c0,45.181,36.51,81.977,81.573,82.476V82.569l-27.002-0.002  c-8.023,0-14.554,6.53-14.554,14.561c0,8.023,6.531,14.551,14.554,14.551v17.98c-17.939,0-32.534-14.595-32.534-32.531  c0-17.944,14.595-32.543,32.534-32.543l27.002,0.004v-9.096c0-14.932,12.146-27.08,27.075-27.08  c14.932,0,27.082,12.148,27.082,27.08c0,14.931-12.15,27.08-27.082,27.08l-9.097-0.001v80.641  C136.889,155.333,165,122.14,165,82.496C165,37.008,127.99,0,82.498,0z",
      iconViewBox: "0 0 165 165",
      iconColor: "#ED7744",
      component: "thread",
      translationKey: "thread",
    },
    {
      path: "/config/bluetooth",
      name: "Bluetooth",
      iconPath: mdiBluetooth,
      iconColor: "#0082FC",
      component: "bluetooth",
      translationKey: "bluetooth",
    },
    {
      path: "/insteon",
      name: "Insteon",
      iconPath: mdiLan,
      iconColor: "#E4002C",
      component: "insteon",
      translationKey: "insteon",
    },
    {
      path: "/config/tags",
      translationKey: "tags",
      iconPath: mdiNfcVariant,
      iconColor: "#616161",
      component: "tag",
    },
  ],
  dashboard_3: [
    {
      path: "/config/person",
      translationKey: "people",
      iconPath: mdiAccount,
      iconColor: "#5A87FA",
      component: ["person", "users"],
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
      component: "labels",
      path: "/config/labels",
      translationKey: "ui.panel.config.labels.caption",
      iconPath: mdiLabel,
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
      path: "/config/analytics",
      translationKey: "analytics",
      iconPath: mdiShape,
      iconColor: "#f1c447",
    },
    {
      path: "/config/labs",
      translationKey: "labs",
      iconPath: mdiFlask,
      iconColor: "#b1b134",
      core: true,
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
      component: ["hassio", "hardware"],
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

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  private _entitiesContext = new ContextProvider(this, {
    context: fullEntitiesContext,
    initialValue: [],
  });

  private _labelsContext = new ContextProvider(this, {
    context: labelsContext,
    initialValue: [],
  });

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entitiesContext.setValue(entities);
      }),
      subscribeLabelRegistry(this.hass.connection!, (labels) => {
        this._labelsContext.setValue(labels);
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
      labels: {
        tag: "ha-config-labels",
        load: () => import("./labels/ha-config-labels"),
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
      labs: {
        tag: "ha-config-labs",
        load: () => import("./labs/ha-config-labs"),
      },
      zha: {
        tag: "zha-config-dashboard-router",
        load: () =>
          import("./integrations/integration-panels/zha/zha-config-dashboard-router"),
      },
      mqtt: {
        tag: "mqtt-config-panel",
        load: () =>
          import("./integrations/integration-panels/mqtt/mqtt-config-panel"),
      },
      zwave_js: {
        tag: "zwave_js-config-router",
        load: () =>
          import("./integrations/integration-panels/zwave_js/zwave_js-config-router"),
      },
      matter: {
        tag: "matter-config-panel",
        load: () =>
          import("./integrations/integration-panels/matter/matter-config-panel"),
      },
      thread: {
        tag: "thread-config-panel",
        load: () =>
          import("./integrations/integration-panels/thread/thread-config-panel"),
      },
      bluetooth: {
        tag: "bluetooth-config-dashboard-router",
        load: () =>
          import("./integrations/integration-panels/bluetooth/bluetooth-config-dashboard-router"),
      },
      dhcp: {
        tag: "dhcp-config-panel",
        load: () =>
          import("./integrations/integration-panels/dhcp/dhcp-config-panel"),
      },
      ssdp: {
        tag: "ssdp-config-panel",
        load: () =>
          import("./integrations/integration-panels/ssdp/ssdp-config-panel"),
      },
      zeroconf: {
        tag: "zeroconf-config-panel",
        load: () =>
          import("./integrations/integration-panels/zeroconf/zeroconf-config-panel"),
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

  private _listeners: (() => void)[] = [];

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

    el.route = this.routeTail;
    el.hass = this.hass;
    el.showAdvanced = Boolean(this.hass.userData?.showAdvanced);
    el.isWide = isWide;
    el.narrow = this.narrow;
    el.cloudStatus = this._cloudStatus;
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
