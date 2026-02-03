import { mdiDotsVertical } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-arrow-prev";
import "../../../components/ha-menu-button";
import "../../../components/ha-tab-group";
import "../../../components/ha-tab-group-tab";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import "./developer-tools-router";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";

@customElement("ha-panel-developer-tools")
class PanelDeveloperTools extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("title");
  }

  protected render(): TemplateResult {
    const page = this._page;
    return html`
      <div class="header ${classMap({ narrow: this.narrow })}">
        <div class="toolbar">
          <ha-icon-button-arrow-prev
            slot="navigationIcon"
            .hass=${this.hass}
            @click=${this._handleBack}
          ></ha-icon-button-arrow-prev>
          <div class="main-title">
            ${this.hass.localize(
              "ui.panel.config.dashboard.developer_tools.main"
            )}
          </div>
          <ha-dropdown slot="actionItems" @wa-select=${this._handleMenuAction}>
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-dropdown-item value="debug">
              ${this.hass.localize(
                "ui.panel.config.developer-tools.tabs.debug.title"
              )}
            </ha-dropdown-item>
          </ha-dropdown>
        </div>
        <ha-tab-group @wa-tab-show=${this._handlePageSelected}>
          <ha-tab-group-tab slot="nav" panel="yaml" .active=${page === "yaml"}>
            ${this.hass.localize(
              "ui.panel.config.developer-tools.tabs.yaml.title"
            )}
          </ha-tab-group-tab>
          <ha-tab-group-tab
            slot="nav"
            panel="state"
            .active=${page === "state"}
          >
            ${this.hass.localize(
              "ui.panel.config.developer-tools.tabs.states.title"
            )}
          </ha-tab-group-tab>
          <ha-tab-group-tab
            slot="nav"
            panel="action"
            .active=${page === "action"}
          >
            ${this.hass.localize(
              "ui.panel.config.developer-tools.tabs.actions.title"
            )}
          </ha-tab-group-tab>
          <ha-tab-group-tab
            slot="nav"
            panel="template"
            .active=${page === "template"}
          >
            ${this.hass.localize(
              "ui.panel.config.developer-tools.tabs.templates.title"
            )}
          </ha-tab-group-tab>
          <ha-tab-group-tab
            slot="nav"
            panel="event"
            .active=${page === "event"}
          >
            ${this.hass.localize(
              "ui.panel.config.developer-tools.tabs.events.title"
            )}
          </ha-tab-group-tab>
          <ha-tab-group-tab
            slot="nav"
            panel="statistics"
            .active=${page === "statistics"}
          >
            ${this.hass.localize(
              "ui.panel.config.developer-tools.tabs.statistics.title"
            )}
          </ha-tab-group-tab>
          <ha-tab-group-tab
            slot="nav"
            panel="assist"
            .active=${page === "assist"}
            >Assist</ha-tab-group-tab
          >
        </ha-tab-group>
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
      navigate(`/config/developer-tools/${newPage}`);
    } else {
      scrollTo({ behavior: "smooth", top: 0 });
    }
  }

  private async _handleMenuAction(ev: HaDropdownSelectEvent) {
    const action = ev.detail.item.value;
    if (action === "debug") {
      navigate(`/config/developer-tools/debug`);
    }
  }

  private get _page() {
    return this.route.path.substr(1);
  }

  private _handleBack() {
    navigate("/config");
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
          width: calc(
            var(--mdc-top-app-bar-width, 100%) - var(
                --safe-area-inset-right,
                0px
              )
          );
          padding-top: var(--safe-area-inset-top);
          padding-right: var(--safe-area-inset-right);
          color: var(--app-header-text-color, white);
          -webkit-backdrop-filter: var(--app-header-backdrop-filter, none);
          backdrop-filter: var(--app-header-backdrop-filter, none);
        }
        :host([narrow]) .header {
          width: calc(
            var(--mdc-top-app-bar-width, 100%) - var(
                --safe-area-inset-left,
                0px
              ) - var(--safe-area-inset-right, 0px)
          );
          padding-left: var(--safe-area-inset-left);
        }

        .toolbar {
          height: var(--header-height);
          display: flex;
          align-items: center;
          font-size: var(--ha-font-size-xl);
          padding: var(--ha-space-2) var(--ha-space-3);
          font-weight: var(--ha-font-weight-normal);
          box-sizing: border-box;
        }
        :host([narrow]) .toolbar {
          padding: var(--ha-space-1);
        }
        .main-title {
          margin-inline-start: var(--ha-space-6);
          line-height: var(--ha-line-height-normal);
          flex-grow: 1;
        }
        .narrow .main-title {
          margin-inline-start: var(--ha-space-2);
        }
        developer-tools-router {
          display: block;
          padding-top: calc(
            var(--header-height) + 52px + var(--safe-area-inset-top, 0px)
          );
          padding-bottom: var(--safe-area-inset-bottom);
          padding-right: var(--safe-area-inset-right);
          flex: 1 1 100%;
          max-width: calc(100% - var(--safe-area-inset-right, 0px));
        }
        :host([narrow]) developer-tools-router {
          padding-left: var(--safe-area-inset-left);
          max-width: calc(
            100% - var(--safe-area-inset-left, 0px) - var(
                --safe-area-inset-right,
                0px
              )
          );
        }
        ha-tab-group {
          --ha-tab-active-text-color: var(--app-header-text-color, white);
          --ha-tab-indicator-color: var(--app-header-text-color, white);
          --ha-tab-track-color: transparent;
          border-bottom: var(--app-header-border-bottom, none);
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
