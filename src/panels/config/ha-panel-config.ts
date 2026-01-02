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
      iconSecondaryPath:
        "M117.748 55.493C117.748 50.477 113.666 46.395 108.648 46.395C103.633 46.395 99.551 50.477 99.551 55.493V64.59L108.648 64.591C113.666 64.591 117.748 60.51 117.748 55.493Z",
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
      iconPath:
        "M82.5108 43.8917H82.7152C107.824 43.8917 129.241 28.1166 137.629 5.95738L105.802 0L82.5108 43.8917ZM82.5108 43.8917H82.3065C57.1975 43.8917 35.7811 28.1352 27.3928 5.95738H27.3742L59.2015 0L82.5108 43.8917ZM43.8903 82.4951V82.2908C43.8903 57.1805 28.1158 35.7636 5.95718 27.3751L0 59.2037L43.8903 82.4951ZM43.8903 82.4951V82.6989C43.8903 107.809 28.1343 129.226 5.95718 137.615V137.633L0 105.805L43.8903 82.4951ZM165 59.2037L159.043 27.3751V27.3936C136.865 35.7822 121.11 57.1991 121.11 82.3094V82.5133V82.7176V82.7363C121.11 107.846 136.884 129.263 159.043 137.652L165 105.823L121.11 82.5133L165 59.2037ZM137.628 159.043L105.8 165L82.4912 121.108H82.695C107.804 121.108 129.221 136.865 137.609 159.043H137.628ZM82.4912 121.108L59.1818 165L27.3545 159.043C35.7428 136.884 57.1592 121.108 82.2682 121.108H82.2868H82.4912Z",
      iconViewBox: "0 0 165 165",
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
