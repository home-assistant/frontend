import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-tabs/paper-tab";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { navigate } from "../../common/navigate";
import "../../components/ha-menu-button";
import "../../components/ha-tabs";
import "../../layouts/ha-app-layout";
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
      <ha-app-layout>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>${this.hass.localize("panel.developer_tools")}</div>
          </app-toolbar>
          <ha-tabs
            scrollable
            attr-for-selected="page-name"
            .selected=${page}
            @iron-activate=${this.handlePageSelected}
          >
            <paper-tab page-name="yaml">
              ${this.hass.localize("ui.panel.developer-tools.tabs.yaml.title")}
            </paper-tab>
            <paper-tab page-name="state">
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.states.title"
              )}
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
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.events.title"
              )}
            </paper-tab>
            <paper-tab page-name="statistics">
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.statistics.title"
              )}
            </paper-tab>
          </ha-tabs>
        </app-header>
        <developer-tools-router
          .route=${this.route}
          .narrow=${this.narrow}
          .hass=${this.hass}
        ></developer-tools-router>
      </ha-app-layout>
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
          color: var(--primary-text-color);
          --paper-card-header-color: var(--primary-text-color);
        }
        developer-tools-router {
          display: block;
          height: calc(100vh - 104px);
        }
        ha-tabs {
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
