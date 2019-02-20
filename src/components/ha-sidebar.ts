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
import { HomeAssistant, Panel } from "../types";
import { fireEvent } from "../common/dom/fire_event";
import { DEFAULT_PANEL } from "../common/const";

const computeUrl = (urlPath) => `/${urlPath}`;

const computePanels = (hass: HomeAssistant) => {
  const panels = hass.panels;
  const sortValue = {
    map: 1,
    logbook: 2,
    history: 3,
  };
  const result: Panel[] = [];

  Object.keys(panels).forEach((key) => {
    if (panels[key].title) {
      result.push(panels[key]);
    }
  });

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

/*
 * @appliesMixin LocalizeMixin
 */
class HaSidebar extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public _defaultPage?: string =
    localStorage.defaultPage || DEFAULT_PANEL;

  protected render() {
    const hass = this.hass;

    if (!hass) {
      return html``;
    }

    return html`
      <app-toolbar>
        <div main-title>Home Assistant</div>
        ${hass.user
          ? html`
              <a href="/profile">
                <ha-user-badge .user=${hass.user}></ha-user-badge>
              </a>
            `
          : ""}
      </app-toolbar>

      <paper-listbox attr-for-selected="data-panel" .selected=${hass.panelUrl}>
        <a
          href="${computeUrl(this._defaultPage)}"
          data-panel=${this._defaultPage}
          tabindex="-1"
        >
          <paper-icon-item>
            <ha-icon slot="item-icon" icon="hass:apps"></ha-icon>
            <span class="item-text">${hass.localize("panel.states")}</span>
          </paper-icon-item>
        </a>

        ${computePanels(hass).map(
          (panel) => html`
            <a
              href="${computeUrl(panel.url_path)}"
              data-panel="${panel.url_path}"
              tabindex="-1"
            >
              <paper-icon-item>
                <ha-icon slot="item-icon" .icon="${panel.icon}"></ha-icon>
                <span class="item-text"
                  >${hass.localize(`panel.${panel.title}`) || panel.title}</span
                >
              </paper-icon-item>
            </a>
          `
        )}
        ${!hass.user
          ? html`
              <paper-icon-item @click=${this._handleLogOut} class="logout">
                <ha-icon slot="item-icon" icon="hass:exit-to-app"></ha-icon>
                <span class="item-text"
                  >${hass.localize("ui.sidebar.log_out")}</span
                >
              </paper-icon-item>
            `
          : html``}
      </paper-listbox>

      <div>
        <div class="divider"></div>

        <div class="subheader">
          ${hass.localize("ui.sidebar.developer_tools")}
        </div>

        <div class="dev-tools">
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
      </div>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
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

  private _handleLogOut() {
    fireEvent(this, "hass-logout");
  }

  static get styles(): CSSResult {
    return css`
      :host {
        height: 100%;
        display: block;
        overflow: auto;
        -ms-user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        border-right: 1px solid var(--divider-color);
        background-color: var(
          --sidebar-background-color,
          var(--primary-background-color)
        );
      }

      app-toolbar {
        font-weight: 400;
        color: var(--primary-text-color);
        border-bottom: 1px solid var(--divider-color);
        background-color: var(--primary-background-color);
      }

      app-toolbar a {
        color: var(--primary-text-color);
      }

      paper-listbox {
        padding: 0;
      }

      paper-listbox > a {
        color: var(--sidebar-text-color);
        font-weight: 500;
        font-size: 14px;
        text-decoration: none;
      }

      paper-icon-item {
        margin: 8px;
        padding-left: 9px;
        border-radius: 4px;
        --paper-item-min-height: 40px;
      }

      a ha-icon {
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

      paper-icon-item.logout {
        margin-top: 16px;
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
      }

      .dev-tools {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        padding: 0 8px;
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
