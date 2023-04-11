import "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { navigate } from "../../common/navigate";
import "../../components/ha-menu-button";
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
        </div>
        <paper-tabs
          scrollable
          attr-for-selected="page-name"
          .selected=${page}
          @iron-activate=${this.handlePageSelected}
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
    const newPage = ev.detail.item.getAttribute("page-name");
    if (newPage !== this._page) {
      navigate(`/developer-tools/${newPage}`);
    } else {
      scrollTo(0, 0);
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
          display: block;
          height: 100%;
          color: var(--primary-text-color);
          --paper-card-header-color: var(--primary-text-color);
        }
        .header {
          background-color: var(--app-header-background-color);
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
          height: calc(100% - var(--header-height) - 48px);
          overflow: auto;
          overscroll-behavior: contain;
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
