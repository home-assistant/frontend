import { mdiDotsVertical } from "@mdi/js";
import "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import type { ActionDetail } from "@material/mwc-list";
import { navigate } from "../../common/navigate";
import "../../components/ha-menu-button";
import "../../components/ha-button-menu";
import "../../components/ha-icon-button";
import "../../components/ha-list-item";
import { haStyle } from "../../resources/styles";
import { HomeAssistant, Route } from "../../types";
import "./developer-tools-router";

@customElement("ha-panel-developer-tools")
class PanelDeveloperTools extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public route!: Route;

  @property() public narrow!: boolean;

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
        <paper-tabs
          scrollable
          attr-for-selected="page-name"
          .selected=${page}
          @selected-changed=${this.handlePageSelected}
        >
          <paper-tab page-name="yaml">
            ${this.hass.localize("ui.panel.developer-tools.tabs.yaml.title")}
          </paper-tab>
          <paper-tab page-name="state">
            ${this.hass.localize("ui.panel.developer-tools.tabs.states.title")}
          </paper-tab>
          <paper-tab page-name="service">
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.services.title"
            )}
          </paper-tab>
          <paper-tab page-name="template">
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.templates.title"
            )}
          </paper-tab>
          <paper-tab page-name="event">
            ${this.hass.localize("ui.panel.developer-tools.tabs.events.title")}
          </paper-tab>
          <paper-tab page-name="statistics">
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.statistics.title"
            )}
          </paper-tab>
          <paper-tab page-name="assist">Assist</paper-tab>
        </paper-tabs>
      </div>
      <developer-tools-router
        .route=${this.route}
        .narrow=${this.narrow}
        .hass=${this.hass}
      ></developer-tools-router>
    `;
  }

  private handlePageSelected(ev) {
    const newPage = ev.detail.value;
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
          --paper-card-header-color: var(--primary-text-color);
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
        }
        .toolbar {
          height: var(--header-height);
          display: flex;
          align-items: center;
          font-size: 20px;
          padding: 8px 12px;
          font-weight: 400;
          box-sizing: border-box;
        }
        @media (max-width: 599px) {
          .toolbar {
            padding: 4px;
          }
        }
        .main-title {
          margin: 0 0 0 24px;
          line-height: 20px;
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
        paper-tabs {
          margin-left: max(env(safe-area-inset-left), 24px);
          margin-right: max(env(safe-area-inset-right), 24px);
          --paper-tabs-selection-bar-color: var(
            --app-header-selection-bar-color,
            var(--app-header-text-color, #fff)
          );
          text-transform: uppercase;
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
