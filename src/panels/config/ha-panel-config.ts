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
  mdiHammer,
  mdiInformation,
  mdiInformationOutline,
  mdiLabel,
  mdiLightningBolt,
  mdiMapMarkerRadius,
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
  mdiTextBoxOutline,
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
      path: "/config/apps",
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
  dashboard_external_settings: [
    {
      path: "#external-app-configuration",
      translationKey: "companion",
      iconPath: mdiCellphoneCog,
      iconColor: "#8E24AA",
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
      iconPath:
        "M 3.9861338,14.261456 3.7267552,13.934877 6.3179131,11.306266 H 4.466374 l -2.6385205,2.68258 V 11.312882 H 0.00440574 L 0,17.679803 l 1.8278535,5.43e-4 v -1.818482 l 0.7225444,-0.732459 2.1373588,2.543782 2.1869324,-5.44e-4 M 24,17.680369 21.809238,17.669359 19.885559,15.375598 17.640262,17.68037 h -1.828407 l 3.236048,-3.302138 -2.574075,-3.067547 2.135161,0.0016 1.610309,1.87687 1.866403,-1.87687 h 1.828429 l -2.857742,2.87478 m -10.589867,-2.924898 2.829625,3.990552 -0.01489,-3.977887 1.811889,-0.0044 0.0011,6.357564 -2.093314,-5.44e-4 -2.922133,-3.947594 -0.0314,3.947594 H 8.2581097 V 11.261677 M 11.971203,6.3517488 c 0,0 2.800714,-0.093203 6.172001,1.0812045 3.462393,1.0898845 5.770926,3.4695627 5.770926,3.4695627 l -1.823898,-5.43e-4 C 22.088532,10.900273 20.577938,9.4271528 17.660223,8.5024618 15.139256,7.703366 12.723057,7.645835 12.111178,7.6449876 l -9.71e-4,0.0011 c 0,0 -0.0259,-6.4e-4 -0.07527,-9.714e-4 -0.04726,3.33e-4 -0.07201,9.714e-4 -0.07201,9.714e-4 v -0.00113 C 11.337007,7.6453728 8.8132091,7.7001736 6.2821829,8.5024618 3.3627914,9.4276738 1.8521646,10.901973 1.8521646,10.901973 l -1.82398708,5.43e-4 C 0.03128403,10.899322 2.339143,8.5221038 5.799224,7.4329533 9.170444,6.2585642 11.971203,6.3517488 11.971203,6.3517488 Z",
      iconColor: "#4EAA66",
      component: "knx",
      translationKey: "knx",
    },
    {
      path: "/config/thread",
      name: "Thread",
      iconPath:
        "m 17.126982,8.0730792 c 0,-0.7297242 -0.593746,-1.32357 -1.323637,-1.32357 -0.729454,0 -1.323199,0.5938458 -1.323199,1.32357 v 1.3234242 l 1.323199,1.458e-4 c 0.729891,0 1.323637,-0.5937006 1.323637,-1.32357 z M 11.999709,0 C 5.3829818,0 0,5.3838955 0,12.001455 0,18.574352 5.3105455,23.927406 11.865164,24 V 12.012075 l -3.9275642,-2.91e-4 c -1.1669814,0 -2.1169453,0.949979 -2.1169453,2.118323 0,1.16718 0.9499639,2.116868 2.1169453,2.116868 v 2.615717 c -2.6093089,0 -4.732218,-2.12327 -4.732218,-4.732585 0,-2.61048 2.1229091,-4.7343308 4.732218,-4.7343308 l 3.9275642,5.82e-4 v -1.323279 c 0,-2.172296 1.766691,-3.9395777 3.938181,-3.9395777 2.171928,0 3.9392,1.7672817 3.9392,3.9395777 0,2.1721498 -1.767272,3.9395768 -3.9392,3.9395768 l -1.323199,-1.45e-4 V 23.744102 C 19.911127,22.597726 24,17.768833 24,12.001455 24,5.3838955 18.616727,0 11.999709,0 Z",
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
        "m 12.001571,6.3842473 h 0.02973 c 3.652189,0 6.767389,-2.29456 7.987462,-5.5177193 L 15.389382,0 Z m 0,0 h -0.02972 c -3.6522186,0 -6.7673314,-2.2918546 -7.9874477,-5.5177193 h -0.00271 L 8.6111273,0 Z M 6.3840436,11.999287 v -0.02972 c 0,-3.6524074 -2.2944727,-6.7675928 -5.51754469,-7.9877383 L 0,8.6114473 Z m 0,0 v 0.02964 c 0,3.652378 -2.2917818,6.767578 -5.51754469,7.987796 v 0.0026 L 0,15.389818 Z M 24,8.6114473 23.133527,3.9818327 v 0.00269 C 19.907636,5.2046836 17.616,8.3198691 17.616,11.972276 v 0.02966 0.02972 0.0027 c 0,3.65232 2.2944,6.76752 5.517527,7.987738 L 24,15.392436 17.616,12.001935 Z M 20.018618,23.133527 15.389091,24 11.99872,17.615709 h 0.02964 c 3.652218,0 6.767418,2.291927 7.987491,5.517818 z M 11.99872,17.615709 8.6082618,24 3.9788364,23.133527 C 5.1989527,19.9104 8.3140655,17.615709 11.966284,17.615709 h 0.0027 z",
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
      path: "/config/system",
      translationKey: "system",
      iconPath: mdiCog,
      iconColor: "#301ABE",
      core: true,
    },
    {
      path: "/developer-tools",
      translationKey: "developer_tools",
      iconPath: mdiHammer,
      iconColor: "#7A5AA6",
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
      iconPath: mdiTextBoxOutline,
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
      apps: {
        tag: "ha-config-apps",
        load: () => import("./apps/ha-config-apps"),
      },
      app: {
        tag: "ha-config-app-dashboard",
        load: () => import("./apps/ha-config-app-dashboard"),
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
