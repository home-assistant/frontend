import { mdiDotsVertical } from "@mdi/js";
import type { CSSResultGroup, TemplateResult, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { isNavigationClick } from "../../../common/dom/is-navigation-click";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-arrow-prev";
import "../../../components/ha-tab-group";
import "../../../components/ha-tab-group-tab";
import "../../../components/ha-top-app-bar-fixed";
import type { HomeAssistant, Route } from "../../../types";
import "./tools-router";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";

const TOOLS_TABS = [
  {
    panel: "yaml",
    translationKey: "ui.panel.config.tools.tabs.yaml.title",
  },
  {
    panel: "state",
    translationKey: "ui.panel.config.tools.tabs.states.title",
  },
  {
    panel: "action",
    translationKey: "ui.panel.config.tools.tabs.actions.title",
  },
  {
    panel: "template",
    translationKey: "ui.panel.config.tools.tabs.templates.title",
  },
  {
    panel: "event",
    translationKey: "ui.panel.config.tools.tabs.events.title",
  },
  {
    panel: "statistics",
    translationKey: "ui.panel.config.tools.tabs.statistics.title",
  },
  {
    panel: "assist",
    translationKey: "ui.panel.config.tools.tabs.assist.tab",
  },
] as const;

@customElement("ha-panel-tools")
class PanelTools extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("title");
  }

  protected render(): TemplateResult {
    const page = this._page;
    return html`
      <ha-top-app-bar-fixed .narrow=${this.narrow}>
        <ha-icon-button-arrow-prev
          slot="navigationIcon"
          @click=${this._handleBack}
        ></ha-icon-button-arrow-prev>
        <div slot="title">
          ${this.hass.localize("ui.panel.config.dashboard.tools.main")}
        </div>
        <ha-dropdown slot="actionItems" @wa-select=${this._handleMenuAction}>
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <ha-dropdown-item value="debug">
            ${this.hass.localize("ui.panel.config.tools.tabs.debug.title")}
          </ha-dropdown-item>
        </ha-dropdown>
        <ha-tab-group @wa-tab-show=${this._handlePageSelected} slot="subRow">
          ${TOOLS_TABS.map(
            (tab) => html`
              <ha-tab-group-tab
                slot="nav"
                panel=${tab.panel}
                .active=${page === tab.panel}
              >
                <a
                  href="/config/tools/${tab.panel}"
                  @click=${this._handleTabAnchorClick}
                  >${this.hass.localize(tab.translationKey)}</a
                >
              </ha-tab-group-tab>
            `
          )}
        </ha-tab-group>
        <tools-router
          .route=${this.route}
          .narrow=${this.narrow}
          .hass=${this.hass}
        ></tools-router>
      </ha-top-app-bar-fixed>
    `;
  }

  private _handleTabAnchorClick(ev: MouseEvent) {
    ev.stopPropagation();
    const href = isNavigationClick(ev);
    if (href) {
      navigate(href);
    }
  }

  private _handlePageSelected(ev: CustomEvent<{ name: string }>) {
    const newPage = ev.detail.name;
    if (!newPage) {
      return;
    }
    if (newPage !== this._page) {
      navigate(`/config/tools/${newPage}`);
    } else {
      scrollTo({ behavior: "smooth", top: 0 });
    }
  }

  private async _handleMenuAction(ev: HaDropdownSelectEvent) {
    const action = ev.detail.item.value;
    if (action === "debug") {
      navigate(`/config/tools/debug`);
    }
  }

  private get _page() {
    return this.route.path.substr(1);
  }

  private _handleBack() {
    navigate("/config");
  }

  static readonly styles: CSSResultGroup = css`
    tools-router {
      display: block;
      height: 100%;
    }
    ha-tab-group {
      --ha-tab-active-text-color: var(--app-header-text-color, white);
      --ha-tab-indicator-color: var(--app-header-text-color, white);
      --ha-tab-track-color: transparent;
    }
    ha-tab-group-tab::part(base) {
      padding: 0;
    }
    ha-tab-group-tab a {
      color: inherit;
      text-decoration: none;
      display: flex;
      align-items: center;
      padding: 1em 1.5em;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-tools": PanelTools;
  }
}
