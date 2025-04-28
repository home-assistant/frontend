import { mdiDotsVertical } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { ActionDetail } from "@material/mwc-list";
import { navigate } from "../../common/navigate";
import "../../components/ha-menu-button";
import "../../components/ha-button-menu";
import "../../components/ha-icon-button";
import "../../components/ha-list-item";
import "../../components/sl-tab-group";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, Route } from "../../types";
import "./developer-tools-router";

@customElement("ha-panel-developer-tools")
class PanelDeveloperTools extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("title");
  }

  protected render(): TemplateResult {
    const page = this._page;
    return html`
      <div class="header">
        <div class="toolbar">
          <ha-menu-button
            slot="navigationIcon"
            .hass=${this.hass}
            .narrow=${this.narrow}
          ></ha-menu-button>
          <div class="main-title">
            ${this.hass.localize("panel.developer_tools")}
          </div>
          <ha-button-menu slot="actionItems" @action=${this._handleMenuAction}>
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-list-item>
              ${this.hass.localize("ui.panel.developer-tools.tabs.debug.title")}
            </ha-list-item>
          </ha-button-menu>
        </div>
        <sl-tab-group @sl-tab-show=${this._handlePageSelected}>
          <sl-tab slot="nav" panel="yaml" .active=${page === "yaml"}>
            ${this.hass.localize("ui.panel.developer-tools.tabs.yaml.title")}
          </sl-tab>
          <sl-tab slot="nav" panel="state" .active=${page === "state"}>
            ${this.hass.localize("ui.panel.developer-tools.tabs.states.title")}
          </sl-tab>
          <sl-tab slot="nav" panel="action" .active=${page === "action"}>
            ${this.hass.localize("ui.panel.developer-tools.tabs.actions.title")}
          </sl-tab>
          <sl-tab slot="nav" panel="template" .active=${page === "template"}>
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.templates.title"
            )}
          </sl-tab>
          <sl-tab slot="nav" panel="event" .active=${page === "event"}>
            ${this.hass.localize("ui.panel.developer-tools.tabs.events.title")}
          </sl-tab>
          <sl-tab
            slot="nav"
            panel="statistics"
            .active=${page === "statistics"}
          >
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.statistics.title"
            )}
          </sl-tab>
          <sl-tab slot="nav" panel="assist" .active=${page === "assist"}
            >Assist</sl-tab
          >
        </sl-tab-group>
      </div>
      <developer-tools-router
        .route=${this.route}
        .narrow=${this.narrow}
        .hass=${this.hass}
      ></developer-tools-router>
    `;
  }

  private _handlePageSelected(ev: CustomEvent<{ name: string }>) {
    const newPage = ev.detail.name;
    if (!newPage) {
      return;
    }
    if (newPage !== this._page) {
      navigate(`/developer-tools/${newPage}`);
    } else {
      scrollTo({ behavior: "smooth", top: 0 });
    }
  }

  private async _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        navigate(`/developer-tools/debug`);
        break;
    }
  }

  private get _page() {
    return this.route.path.substr(1);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          color: var(--primary-text-color);
          display: flex;
          min-height: 100vh;
        }
        .header {
          position: fixed;
          top: 0;
          z-index: 4;
          background-color: var(--app-header-background-color);
          width: var(--mdc-top-app-bar-width, 100%);
          padding-top: env(safe-area-inset-top);
          color: var(--app-header-text-color, white);
          border-bottom: var(--app-header-border-bottom, none);
          -webkit-backdrop-filter: var(--app-header-backdrop-filter, none);
          backdrop-filter: var(--app-header-backdrop-filter, none);
        }
        .toolbar {
          height: var(--header-height);
          display: flex;
          align-items: center;
          font-size: var(--ha-font-size-xl);
          padding: 8px 12px;
          font-weight: var(--ha-font-weight-normal);
          box-sizing: border-box;
        }
        @media (max-width: 599px) {
          .toolbar {
            padding: 4px;
          }
        }
        .main-title {
          margin: var(--margin-title);
          line-height: var(--ha-line-height-normal);
          flex-grow: 1;
        }
        developer-tools-router {
          display: block;
          padding-top: calc(
            var(--header-height) + 48px + env(safe-area-inset-top)
          );
          padding-bottom: calc(env(safe-area-inset-bottom));
          flex: 1 1 100%;
          max-width: 100%;
        }
        sl-tab-group {
          --ha-tab-active-text-color: var(--app-header-text-color, white);
          --ha-tab-indicator-color: var(--app-header-text-color, white);
          --ha-tab-track-color: transparent;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-developer-tools": PanelDeveloperTools;
  }
}
