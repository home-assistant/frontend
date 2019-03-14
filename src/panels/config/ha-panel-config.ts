import {
  UpdatingElement,
  property,
  PropertyValues,
  customElement,
} from "lit-element";
import "../../layouts/hass-loading-screen";
import isComponentLoaded from "../../common/config/is_component_loaded";
import { HomeAssistant, Route } from "../../types";
import { CloudStatus, fetchCloudStatus } from "../../data/cloud";
import { listenMediaQuery } from "../../common/dom/media_query";
import { navigate } from "../../common/navigate";

const extractPage = (path: string) => {
  if (path === "") {
    return "dashboard";
  }
  const subpathStart = path.indexOf("/", 1);
  return subpathStart === -1
    ? path.substr(1)
    : path.substr(1, subpathStart - 1);
};

const PAGES = {
  "area-registry": () =>
    import(/* webpackChunkName: "panel-config-area-registry" */ "./area_registry/ha-config-area-registry"),
  automation: () =>
    import(/* webpackChunkName: "panel-config-automation" */ "./automation/ha-config-automation"),
  cloud: () =>
    import(/* webpackChunkName: "panel-config-cloud" */ "./cloud/ha-config-cloud"),
  core: () =>
    import(/* webpackChunkName: "panel-config-core" */ "./core/ha-config-core"),
  customize: () =>
    import(/* webpackChunkName: "panel-config-customize" */ "./customize/ha-config-customize"),
  dashboard: () =>
    import(/* webpackChunkName: "panel-config-dashboard" */ "./dashboard/ha-config-dashboard"),
  "entity-registry": () =>
    import(/* webpackChunkName: "panel-config-entity-registry" */ "./entity_registry/ha-config-entity-registry"),
  integrations: () =>
    import(/* webpackChunkName: "panel-config-integrations" */ "./integrations/ha-config-integrations"),
  person: () =>
    import(/* webpackChunkName: "panel-config-person" */ "./person/ha-config-person"),
  script: () =>
    import(/* webpackChunkName: "panel-config-script" */ "./script/ha-config-script"),
  users: () =>
    import(/* webpackChunkName: "panel-config-users" */ "./users/ha-config-users"),
  zha: () =>
    import(/* webpackChunkName: "panel-config-zha" */ "./zha/ha-config-zha"),
  zwave: () =>
    import(/* webpackChunkName: "panel-config-zwave" */ "./zwave/ha-config-zwave"),
};

@customElement("ha-panel-config")
class HaPanelConfig extends UpdatingElement {
  @property() public route!: Route;
  @property() public hass!: HomeAssistant;
  @property() public showMenu: boolean = false;
  @property() public _wideSidebar: boolean = false;
  @property() public _wide: boolean = false;
  @property() private _cloudStatus?: CloudStatus;

  private _listeners: Array<() => void> = [];
  private _cache = {};

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

  protected update() {
    if (this.lastChild) {
      this._updateEl(this.lastChild);
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
    Object.values(PAGES).forEach((load) => load());
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (!changedProps.has("route")) {
      return;
    }

    const oldRoute = changedProps.get("route") as this["route"];
    const route = this.route;
    const newPath = route ? route.path : "";

    if (newPath === "") {
      navigate(this, "/config/dashboard", true);
    }

    const oldPage = oldRoute ? extractPage(oldRoute.path) : "";
    const newPage = extractPage(newPath);

    if (oldPage === newPage) {
      return;
    }

    const panel = newPage.replace("_", "-");

    let panelEl = this._cache[panel];

    if (!panelEl) {
      panelEl = this._cache[panel] = document.createElement(
        `ha-config-${panel}`
      );
    }

    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    this._updateEl(panelEl);
    this.appendChild(panelEl);
  }

  private _updateEl(el) {
    el.route = this.route;
    el.hass = this.hass;
    el.showMenu = this.showMenu;
    el.isWide = this.showMenu ? this._wideSidebar : this._wide;
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
