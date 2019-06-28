import {
  LitElement,
  html,
  CSSResult,
  css,
  PropertyValues,
  property,
} from "lit-element";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "./ha-icon";

import "../components/user/ha-user-badge";
import isComponentLoaded from "../common/config/is_component_loaded";
import { HomeAssistant, PanelInfo } from "../types";
import { fireEvent } from "../common/dom/fire_event";
import { DEFAULT_PANEL } from "../common/const";
import {
  getExternalConfig,
  ExternalConfig,
} from "../external_app/external_config";

const computeUrl = (urlPath) => `/${urlPath}`;

const computePanels = (hass: HomeAssistant) => {
  const panels = hass.panels;
  if (!panels) {
    return [];
  }

  const sortValue = {
    map: 1,
    logbook: 2,
    history: 3,
  };
  const result: PanelInfo[] = Object.values(panels).filter(
    (panel) => panel.title
  );

  result.sort((a, b) => {
    const aBuiltIn = a.component_name in sortValue;
    const bBuiltIn = b.component_name in sortValue;

    if (aBuiltIn && bBuiltIn) {
      return sortValue[a.component_name] - sortValue[b.component_name];
    }
    if (aBuiltIn) {
      return -1;
    }
    if (bBuiltIn) {
      return 1;
    }
    // both not built in, sort by title
    if (a.title! < b.title!) {
      return -1;
    }
    if (a.title! > b.title!) {
      return 1;
    }
    return 0;
  });

  return result;
};

const renderPanel = (hass, panel) => html`
  <a
    aria-role="option"
    href="${computeUrl(panel.url_path)}"
    data-panel="${panel.url_path}"
    tabindex="-1"
  >
    <paper-icon-item>
      <ha-icon slot="item-icon" .icon="${panel.icon}"></ha-icon>
      <span class="item-text">
        ${hass.localize(`panel.${panel.title}`) || panel.title}
      </span>
    </paper-icon-item>
  </a>
`;

/*
 * @appliesMixin LocalizeMixin
 */
class HaSidebar extends LitElement {
  @property() public hass?: HomeAssistant;
  @property({ type: Boolean }) public alwaysExpand = false;
  @property({ type: Boolean, reflect: true }) public expanded = false;
  @property() public _defaultPage?: string =
    localStorage.defaultPage || DEFAULT_PANEL;
  @property() private _externalConfig?: ExternalConfig;

  protected render() {
    const hass = this.hass;

    if (!hass) {
      return html``;
    }

    const panels = computePanels(hass);
    const configPanelIdx = panels.findIndex(
      (panel) => panel.component_name === "config"
    );
    const configPanel =
      configPanelIdx === -1 ? undefined : panels.splice(configPanelIdx, 1)[0];

    return html`
      ${this.expanded
        ? html`
            <app-toolbar>
              <div main-title>Home Assistant</div>
            </app-toolbar>
          `
        : html`
            <div class="logo">
              <img
                id="logo"
                src="/static/icons/favicon-192x192.png"
                alt="Home Assistant logo"
              />
            </div>
          `}

      <paper-listbox attr-for-selected="data-panel" .selected=${hass.panelUrl}>
        <a
          aria-role="option"
          href="${computeUrl(this._defaultPage)}"
          data-panel=${this._defaultPage}
          tabindex="-1"
        >
          <paper-icon-item>
            <ha-icon slot="item-icon" icon="hass:apps"></ha-icon>
            <span class="item-text">${hass.localize("panel.states")}</span>
          </paper-icon-item>
        </a>

        ${panels.map((panel) => renderPanel(hass, panel))}

        <div class="spacer" disabled></div>

        ${this.expanded && hass.user && hass.user.is_admin
          ? html`
              <div class="divider" disabled></div>

              <div class="subheader" disabled>
                ${hass.localize("ui.sidebar.developer_tools")}
              </div>

              <div class="dev-tools" disabled>
                <a href="/dev-service" tabindex="-1">
                  <paper-icon-button
                    icon="hass:remote"
                    alt="${hass.localize("panel.dev-services")}"
                    title="${hass.localize("panel.dev-services")}"
                  ></paper-icon-button>
                </a>
                <a href="/dev-state" tabindex="-1">
                  <paper-icon-button
                    icon="hass:code-tags"
                    alt="${hass.localize("panel.dev-states")}"
                    title="${hass.localize("panel.dev-states")}"
                  ></paper-icon-button>
                </a>
                <a href="/dev-event" tabindex="-1">
                  <paper-icon-button
                    icon="hass:radio-tower"
                    alt="${hass.localize("panel.dev-events")}"
                    title="${hass.localize("panel.dev-events")}"
                  ></paper-icon-button>
                </a>
                <a href="/dev-template" tabindex="-1">
                  <paper-icon-button
                    icon="hass:file-xml"
                    alt="${hass.localize("panel.dev-templates")}"
                    title="${hass.localize("panel.dev-templates")}"
                  ></paper-icon-button>
                </a>
                ${isComponentLoaded(hass, "mqtt")
                  ? html`
                      <a href="/dev-mqtt" tabindex="-1">
                        <paper-icon-button
                          icon="hass:altimeter"
                          alt="${hass.localize("panel.dev-mqtt")}"
                          title="${hass.localize("panel.dev-mqtt")}"
                        ></paper-icon-button>
                      </a>
                    `
                  : html``}
                <a href="/dev-info" tabindex="-1">
                  <paper-icon-button
                    icon="hass:information-outline"
                    alt="${hass.localize("panel.dev-info")}"
                    title="${hass.localize("panel.dev-info")}"
                  ></paper-icon-button>
                </a>
              </div>
              <div class="divider" disabled></div>
            `
          : ""}
        ${this._externalConfig && this._externalConfig.hasSettingsScreen
          ? html`
              <a
                aria-role="option"
                aria-label="App Configuration"
                href="#external-app-configuration"
                tabindex="-1"
                @click=${this._handleExternalAppConfiguration}
              >
                <paper-icon-item>
                  <ha-icon
                    slot="item-icon"
                    icon="hass:cellphone-settings-variant"
                  ></ha-icon>
                  <span class="item-text"
                    >${hass.localize(
                      "ui.sidebar.external_app_configuration"
                    )}</span
                  >
                </paper-icon-item>
              </a>
            `
          : ""}
        ${configPanel ? renderPanel(hass, configPanel) : ""}
        ${hass.user
          ? html`
              <a
                href="/profile"
                data-panel="panel"
                tabindex="-1"
                aria-role="option"
                aria-label=${hass.localize("panel.profile")}
              >
                <paper-icon-item class="profile">
                  <ha-user-badge
                    slot="item-icon"
                    .user=${hass.user}
                  ></ha-user-badge>

                  <span class="item-text">
                    ${hass.user.name}
                  </span>
                </paper-icon-item>
              </a>
            `
          : html`
              <paper-icon-item
                @click=${this._handleLogOut}
                class="logout"
                aria-role="option"
              >
                <ha-icon slot="item-icon" icon="hass:exit-to-app"></ha-icon>
                <span class="item-text"
                  >${hass.localize("ui.sidebar.log_out")}</span
                >
              </paper-icon-item>
            `}
      </paper-listbox>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (
      changedProps.has("_externalConfig") ||
      changedProps.has("expanded") ||
      changedProps.has("alwaysExpand")
    ) {
      return true;
    }
    if (!this.hass || !changedProps.has("hass")) {
      return false;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant;
    if (!oldHass) {
      return true;
    }
    const hass = this.hass;
    return (
      hass.panels !== oldHass.panels ||
      hass.panelUrl !== oldHass.panelUrl ||
      hass.config.components !== oldHass.config.components ||
      hass.user !== oldHass.user ||
      hass.localize !== oldHass.localize
    );
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (this.hass && this.hass.auth.external) {
      getExternalConfig(this.hass.auth.external).then((conf) => {
        this._externalConfig = conf;
      });
    }
    this.shadowRoot!.querySelector("paper-listbox")!.addEventListener(
      "mouseenter",
      () => {
        this.expanded = true;
      }
    );
    this.addEventListener("mouseleave", () => {
      this._contract();
    });
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("alwaysExpand")) {
      this.expanded = this.alwaysExpand;
    }
  }

  private _contract() {
    this.expanded = this.alwaysExpand || false;
  }

  private _handleLogOut() {
    fireEvent(this, "hass-logout");
  }

  private _handleExternalAppConfiguration(ev: Event) {
    ev.preventDefault();
    this.hass!.auth.external!.fireMessage({
      type: "config_screen/show",
    });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        height: 100%;
        display: block;
        overflow: hidden auto;
        -ms-user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        border-right: 1px solid var(--divider-color);
        background-color: var(
          --sidebar-background-color,
          var(--primary-background-color)
        );
        width: 64px;
        transition: width 0.2s ease-in;
        will-change: width;
        contain: strict;
      }
      :host([expanded]) {
        width: 256px;
      }

      .logo {
        height: 65px;
        box-sizing: border-box;
        padding: 8px;
        border-bottom: 1px solid transparent;
      }
      .logo img {
        width: 48px;
      }

      app-toolbar {
        white-space: nowrap;
        font-weight: 400;
        color: var(--primary-text-color);
        border-bottom: 1px solid var(--divider-color);
        background-color: var(--primary-background-color);
      }

      app-toolbar a {
        color: var(--primary-text-color);
      }

      paper-listbox {
        padding: 4px 0;
        height: calc(100% - 65px);
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
      }

      paper-listbox > a {
        color: var(--sidebar-text-color);
        font-weight: 500;
        font-size: 14px;
        text-decoration: none;
      }

      paper-icon-item {
        box-sizing: border-box;
        margin: 4px 8px;
        padding-left: 12px;
        border-radius: 4px;
        --paper-item-min-height: 40px;
        width: 48px;
      }
      :host([expanded]) paper-icon-item {
        width: 240px;
      }

      ha-icon[slot="item-icon"] {
        color: var(--sidebar-icon-color);
      }

      .iron-selected paper-icon-item:before {
        border-radius: 4px;
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        pointer-events: none;
        content: "";
        background-color: var(--sidebar-selected-icon-color);
        opacity: 0.12;
        transition: opacity 15ms linear;
        will-change: opacity;
      }

      .iron-selected paper-icon-item[pressed]:before {
        opacity: 0.37;
      }

      paper-icon-item span {
        color: var(--sidebar-text-color);
        font-weight: 500;
        font-size: 14px;
      }

      a.iron-selected paper-icon-item ha-icon {
        color: var(--sidebar-selected-icon-color);
      }

      a.iron-selected .item-text {
        color: var(--sidebar-selected-text-color);
      }

      a .item-text {
        display: none;
      }
      :host([expanded]) a .item-text {
        display: block;
      }

      paper-icon-item.logout {
        margin-top: 16px;
      }

      paper-icon-item.profile {
        padding-left: 4px;
      }
      .profile .item-text {
        margin-left: 8px;
      }

      .spacer {
        flex: 1;
        pointer-events: none;
      }

      .divider {
        height: 1px;
        background-color: var(--divider-color);
        margin: 4px 0;
      }

      .subheader {
        color: var(--sidebar-text-color);
        font-weight: 500;
        font-size: 14px;
        padding: 16px;
        white-space: nowrap;
      }

      .dev-tools {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        padding: 0 8px;
        width: 256px;
        box-sizing: border-box;
      }

      .dev-tools a {
        color: var(--sidebar-icon-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sidebar": HaSidebar;
  }
}

customElements.define("ha-sidebar", HaSidebar);
