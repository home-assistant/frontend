import { PolymerElement } from "@polymer/polymer";
import { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { listenMediaQuery } from "../../../common/dom/media_query";
import { CloudStatus, fetchCloudStatus } from "../../../data/cloud";
import "../../../layouts/hass-loading-screen";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import type { HomeAssistant, Route } from "../../../types";

@customElement("ha-panel-system-config")
class HaPanelSystemConfig extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  protected routerOptions: RouterOptions = {
    defaultPage: "system",
    routes: {
      analytics: {
        tag: "ha-config-section-analytics",
        load: () => import("./ha-config-section-analytics"),
      },
      backup: {
        tag: "ha-config-backup",
        load: () => import("../backup/ha-config-backup"),
      },
      core: {
        tag: "ha-config-core",
        load: () => import("./ha-config-core"),
      },
      server_control: {
        tag: "ha-config-server-control",
        load: () => import("../server_control/ha-config-server-control"),
      },
      logs: {
        tag: "ha-config-logs",
        load: () => import("../logs/ha-config-logs"),
      },
      system: {
        tag: "ha-config-system",
        load: () => import("./ha-config-system-navigation"),
      },
      network: {
        tag: "ha-config-section-network",
        load: () => import("./ha-config-section-network"),
      },
      storage: {
        tag: "ha-config-section-storage",
        load: () => import("./ha-config-section-storage"),
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
    "ha-panel-system-config": HaPanelSystemConfig;
  }
}
