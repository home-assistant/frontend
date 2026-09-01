import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { listenMediaQuery } from "../../common/dom/media_query";
import type { CloudStatus } from "../../data/cloud";
import { fetchCloudStatus, subscribeCloudEvents } from "../../data/cloud";
import {
  entityRegistryByEntityId,
  entityRegistryById,
} from "../../data/entity/entity_registry";
import type { RouterOptions } from "../../layouts/hass-router-page";
import { HassRouterPage } from "../../layouts/hass-router-page";
import type { HomeAssistant, Route } from "../../types";

declare global {
  // for fire event
  interface HASSDomEvents {
    "ha-refresh-cloud-status": undefined;
  }

  interface GlobalEventHandlersEventMap {
    "ha-refresh-cloud-status": HASSDomEvent<
      HASSDomEvents["ha-refresh-cloud-status"]
    >;
  }
}

@customElement("ha-panel-config")
class HaPanelConfig extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

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
      connectivity: {
        tag: "ha-config-connectivity",
        load: () => import("./connectivity/ha-config-connectivity"),
      },
      devices: {
        tag: "ha-config-devices",
        load: () => import("./devices/ha-config-devices"),
      },
      system: {
        tag: "ha-config-system-navigation",
        load: () => import("./core/ha-config-system-navigation"),
      },
      tools: {
        tag: "ha-panel-tools",
        load: () => import("./tools/ha-panel-tools"),
        cache: true,
      },
      logs: {
        tag: "ha-config-logs",
        load: () => import("./logs/ha-config-logs"),
      },
      info: {
        tag: "ha-config-info",
        load: () => import("./info/ha-config-info"),
        waitForReady: true,
      },
      // customize was removed in 2021.12, fallback to dashboard
      customize: "dashboard",
      dashboard: {
        tag: "ha-config-dashboard",
        load: () => import("./dashboard/ha-config-dashboard"),
        waitForReady: true,
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
        waitForReady: true,
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
      "radio-frequency": {
        tag: "radio-frequency-config-dashboard-router",
        load: () =>
          import("./integrations/integration-panels/radio_frequency/radio-frequency-config-dashboard-router"),
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
      "ai-tasks": {
        tag: "ha-config-section-ai-tasks",
        load: () => import("./core/ha-config-section-ai-tasks"),
      },
      "entity-id-format": {
        tag: "ha-config-section-entity-id-format",
        load: () => import("./core/ha-config-section-entity-id-format"),
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
      infrared: {
        tag: "infrared-config-dashboard-router",
        load: () =>
          import("./integrations/integration-panels/infrared/infrared-config-dashboard-router"),
      },
      serial: {
        tag: "serial-config-dashboard",
        load: () =>
          import("./integrations/integration-panels/serial/serial-config-dashboard"),
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

  private _unsubCloudEvents?: Promise<UnsubscribeFunc>;

  private _cloudStatusRequestId = 0;

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
    this._listenOnWindow("ha-refresh-cloud-status", () => {
      if (this._cloudLoaded()) {
        this._updateCloudStatus();
      }
    });
    this._listenOnWindow("connection-status", (ev) => {
      if (ev.detail === "connected" && this._cloudLoaded()) {
        this._updateCloudStatus();
        this._subscribeCloudEvents();
      }
    });

    if (this._cloudLoaded()) {
      this._subscribeCloudEvents();
      this._updateCloudStatus();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    while (this._listeners.length) {
      this._listeners.pop()!();
    }
    this._unsubCloudEvents?.then((unsub) => unsub()).catch(() => undefined);
    this._unsubCloudEvents = undefined;
    entityRegistryByEntityId.clear();
    entityRegistryById.clear();
  }

  private _cloudLoaded(): boolean {
    return !!this.hass && isComponentLoaded(this.hass.config, "cloud");
  }

  private _listenOnWindow<EventName extends keyof GlobalEventHandlersEventMap>(
    type: EventName,
    listener: (ev: GlobalEventHandlersEventMap[EventName]) => void
  ) {
    window.addEventListener(type, listener);
    this._listeners.push(() => window.removeEventListener(type, listener));
  }

  private _subscribeCloudEvents() {
    if (this._unsubCloudEvents || !this._cloudLoaded()) {
      return;
    }

    const subscription = subscribeCloudEvents(this.hass, () => {
      this._updateCloudStatus();
    });
    this._unsubCloudEvents = subscription;

    subscription.catch(() => {
      if (this._unsubCloudEvents === subscription) {
        this._unsubCloudEvents = undefined;
      }
    });
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("title");
    this.hass.loadBackendTranslation("services");
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
    el.isWide = isWide;
    el.narrow = this.narrow;
    el.cloudStatus = this._cloudStatus;
  }

  private async _updateCloudStatus() {
    const requestId = ++this._cloudStatusRequestId;
    const status = await fetchCloudStatus(this.hass);

    if (requestId !== this._cloudStatusRequestId) {
      return;
    }
    this._cloudStatus = status;

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
