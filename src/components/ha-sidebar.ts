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
import { HomeAssistant, PanelInfo } from "../types";
import { fireEvent } from "../common/dom/fire_event";
import { DEFAULT_PANEL } from "../common/const";
import {
  getExternalConfig,
  ExternalConfig,
} from "../external_app/external_config";
import {
  PersistentNotification,
  subscribeNotifications,
} from "../data/persistent_notification";
import computeDomain from "../common/entity/compute_domain";

const SHOW_AFTER_SPACER = ["config", "developer-tools"];

const computeUrl = (urlPath) => `/${urlPath}`;

const SORT_VALUE = {
  map: 1,
  logbook: 2,
  history: 3,
  "developer-tools": 9,
  configuration: 10,
};

const panelSorter = (a, b) => {
  const aBuiltIn = a.component_name in SORT_VALUE;
  const bBuiltIn = b.component_name in SORT_VALUE;

  if (aBuiltIn && bBuiltIn) {
    return SORT_VALUE[a.component_name] - SORT_VALUE[b.component_name];
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
};

const computePanels = (hass: HomeAssistant): [PanelInfo[], PanelInfo[]] => {
  const panels = hass.panels;
  if (!panels) {
    return [[], []];
  }

  const beforeSpacer: PanelInfo[] = [];
  const afterSpacer: PanelInfo[] = [];

  Object.values(panels).forEach((panel) => {
    if (!panel.title) {
      return;
    }
    (SHOW_AFTER_SPACER.includes(panel.component_name)
      ? afterSpacer
      : beforeSpacer
    ).push(panel);
  });

  beforeSpacer.sort(panelSorter);
  afterSpacer.sort(panelSorter);

  return [beforeSpacer, afterSpacer];
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
  @property() public hass!: HomeAssistant;

  @property({ type: Boolean }) public alwaysExpand = false;
  @property({ type: Boolean, reflect: true }) public expanded = false;
  @property() public _defaultPage?: string =
    localStorage.defaultPage || DEFAULT_PANEL;
  @property() private _externalConfig?: ExternalConfig;
  @property() private _notifications?: PersistentNotification[];

  protected render() {
    const hass = this.hass;

    if (!hass) {
      return html``;
    }

    const [beforeSpacer, afterSpacer] = computePanels(hass);

    let notificationCount = this._notifications
      ? this._notifications.length
      : 0;
    for (const entityId in hass.states) {
      if (computeDomain(entityId) === "configurator") {
        notificationCount++;
      }
    }

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

        ${beforeSpacer.map((panel) => renderPanel(hass, panel))}

        <div class="spacer" disabled></div>

        ${afterSpacer.map((panel) => renderPanel(hass, panel))}
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
                  <span class="item-text">
                    ${hass.localize("ui.sidebar.external_app_configuration")}
                  </span>
                </paper-icon-item>
              </a>
            `
          : ""}

        <div disabled class="divider sticky-el"></div>

        <paper-icon-item
          class="notifications sticky-el"
          aria-role="option"
          @click=${this._handleShowNotificationDrawer}
        >
          <ha-icon slot="item-icon" icon="hass:bell"></ha-icon>
          ${notificationCount > 0
            ? html`
                <span class="notification-badge" slot="item-icon">
                  ${notificationCount}
                </span>
              `
            : ""}
          <span class="item-text">
            ${hass.localize("ui.notification_drawer.title")}
          </span>
        </paper-icon-item>

        <a
          class="profile sticky-el"
          href="/profile"
          data-panel="panel"
          tabindex="-1"
          aria-role="option"
          aria-label=${hass.localize("panel.profile")}
        >
          <paper-icon-item>
            <ha-user-badge slot="item-icon" .user=${hass.user}></ha-user-badge>

            <span class="item-text">
              ${hass.user ? hass.user.name : ""}
            </span>
          </paper-icon-item>
        </a>
      </paper-listbox>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (
      changedProps.has("expanded") ||
      changedProps.has("alwaysExpand") ||
      changedProps.has("_externalConfig") ||
      changedProps.has("_notifications")
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
      hass.user !== oldHass.user ||
      hass.localize !== oldHass.localize ||
      hass.states !== oldHass.states
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
    subscribeNotifications(this.hass.connection, (notifications) => {
      this._notifications = notifications;
    });
    // Deal with configurator
    // private _updateNotifications(
    //   states: HassEntities,
    //   persistent: unknown[]
    // ): unknown[] {
    //   const configurator = computeNotifications(states);
    //   return persistent.concat(configurator);
    // }
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

  private _handleShowNotificationDrawer() {
    fireEvent(this, "hass-show-notifications");
  }

  private _handleExternalAppConfiguration(ev: Event) {
    ev.preventDefault();
    this.hass.auth.external!.fireMessage({
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
        transition-delay: 0.2s;
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

      paper-icon-item .item-text {
        display: none;
      }
      :host([expanded]) paper-icon-item .item-text {
        display: block;
      }

      .divider {
        bottom: 88px;
        padding: 10px 0;
      }

      .divider::before {
        content: " ";
        display: block;
        height: 1px;
        background-color: var(--divider-color);
      }

      .notifications {
        margin-top: 0;
        margin-bottom: 0;
        bottom: 48px;
        cursor: pointer;
      }
      .profile {
        bottom: 0;
      }
      .profile paper-icon-item {
        padding-left: 4px;
      }
      .profile .item-text {
        margin-left: 8px;
      }

      .sticky-el {
        position: sticky;
        background-color: var(
          --sidebar-background-color,
          var(--primary-background-color)
        );
      }

      .notification-badge {
        position: absolute;
        font-weight: 400;
        bottom: 14px;
        left: 26px;
        border-radius: 50%;
        background-color: var(--primary-color);
        height: 20px;
        line-height: 20px;
        text-align: center;
        padding: 0px 6px;
        font-size: 0.65em;
        color: var(--text-primary-color);
      }

      .spacer {
        flex: 1;
        pointer-events: none;
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
