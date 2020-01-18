import {
  property,
  PropertyValues,
  customElement,
  LitElement,
  html,
  CSSResult,
  css,
} from "lit-element";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-item/paper-item";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "../../layouts/hass-loading-screen";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { HomeAssistant, Route } from "../../types";
import { CloudStatus, fetchCloudStatus } from "../../data/cloud";
import { listenMediaQuery } from "../../common/dom/media_query";
import {
  getOptimisticFrontendUserDataCollection,
  CoreFrontendUserData,
} from "../../data/frontend";
import "../../components/ha-menu-button";
import "./ha-config-router";
import "./dashboard/ha-config-navigation";
import { classMap } from "lit-html/directives/class-map";

declare global {
  // for fire event
  interface HASSDomEvents {
    "ha-refresh-cloud-status": undefined;
  }
}

@customElement("ha-panel-config")
class HaPanelConfig extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
  @property() public route!: Route;

  @property() private _wideSidebar: boolean = false;
  @property() private _wide: boolean = false;
  @property() private _coreUserData?: CoreFrontendUserData;
  @property() private _showAdvanced = false;
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
    this._listeners.push(
      getOptimisticFrontendUserDataCollection(
        this.hass.connection,
        "core"
      ).subscribe((coreUserData) => {
        this._coreUserData = coreUserData || {};
        this._showAdvanced = !!(
          this._coreUserData && this._coreUserData.showAdvanced
        );
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

  protected render() {
    const dividerPos = this.route.path.indexOf("/", 1);
    const curPage =
      dividerPos === -1
        ? this.route.path.substr(1)
        : this.route.path.substr(1, dividerPos - 1);

    const isWide =
      this.hass.dockedSidebar === "docked" ? this._wideSidebar : this._wide;

    return html`
      ${isWide
        ? html`
            <app-toolbar class="toolbar">
              <ha-menu-button
                .hass=${this.hass}
                .narrow=${this.narrow}
              ></ha-menu-button>
              <div main-title>${this.hass.localize("panel.config")}</div>
            </app-toolbar>
            <div class="side-bar">
              <div class="navigation">
                <ha-config-navigation
                  .hass=${this.hass}
                  .showAdvanced=${this._showAdvanced}
                  .curPage=${curPage}
                  .pages=${[
                    { page: "cloud", info: this._cloudStatus },
                    { page: "integrations", core: true },
                    { page: "devices", core: true },
                    { page: "entities", core: true },
                    { page: "automation" },
                    { page: "script" },
                    { page: "scene" },
                    { page: "core", core: true },
                    { page: "areas", core: true },
                    { page: "person" },
                    { page: "users", core: true },
                    { page: "server_control", core: true },
                    { page: "zha" },
                    { page: "zwave" },
                    { page: "customize", core: true, advanced: true },
                  ]}
                ></ha-config-navigation>
              </div>
            </div>
          `
        : ""}
      <ha-config-router
        .hass=${this.hass}
        .route=${this.route}
        .narrow=${this.narrow}
        .isWide=${isWide}
        .wide=${this._wide}
        .wideSidebar=${this._wideSidebar}
        .showAdvanced=${this._showAdvanced}
        .cloudStatus=${this._cloudStatus}
        class=${classMap({ "wide-config": isWide })}
      ></ha-config-router>
    `;
  }

  private async _updateCloudStatus() {
    this._cloudStatus = await fetchCloudStatus(this.hass);

    if (this._cloudStatus.cloud === "connecting") {
      setTimeout(() => this._updateCloudStatus(), 5000);
    }
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        height: 100%;
        background-color: var(--primary-background-color);
      }

      a {
        text-decoration: none;
        color: var(--primary-text-color);
      }

      .side-bar {
        border-right: 1px solid #e0e0e0;
        background: white;
        width: 320px;
        float: left;
        box-sizing: border-box;
        position: fixed;
      }

      .toolbar {
        height: 64px;
        padding: 0 16px 0 16px;
        width: 288px;
        pointer-events: none;
        border-bottom: 1px solid var(--divider-color);
        background-color: var(--primary-background-color);
        font-weight: 400;
        color: var(--app-header-text-color, white);
      }

      div[main-title],
      ha-menu-button {
        color: var(--primary-text-color);
      }

      .wide-config {
        float: right;
        width: calc(100% - 320px);
        height: 100%;
        margin-top: -65px;
      }

      .navigation {
        background-color: var(
          --paper-listbox-background-color,
          var(--primary-background-color)
        );
        height: calc(100vh - 64px);
        overflow: auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-config": HaPanelConfig;
  }
}
