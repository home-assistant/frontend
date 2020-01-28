import {
  LitElement,
  property,
  TemplateResult,
  html,
  customElement,
  css,
  CSSResult,
  PropertyValues,
} from "lit-element";
import "../components/ha-menu-button";
import "../components/ha-paper-icon-button-arrow-prev";
import { classMap } from "lit-html/directives/class-map";
import { Route, HomeAssistant } from "../types";
import { navigate } from "../common/navigate";
import "@material/mwc-ripple";
import { isComponentLoaded } from "../common/config/is_component_loaded";

export interface PageNavigation {
  path: string;
  translationKey?: string;
  component?: string;
  name?: string;
  core?: boolean;
  exportOnly?: boolean;
  icon?: string;
  info?: any;
}

@customElement("hass-tabs-subpage")
class HassTabsSubpage extends LitElement {
  @property() public hass!: HomeAssistant;
  @property({ type: String, attribute: "back-path" }) public backPath?: string;
  @property() public backCallback?: () => void;
  @property({ type: Boolean }) public hassio = false;
  @property({ type: Boolean }) public showAdvanced = false;
  @property() public route!: Route;
  @property() public tabs!: PageNavigation[];
  @property({ type: Boolean, reflect: true }) public narrow = false;
  @property() private _activeTab: number = -1;

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has("route")) {
      this._activeTab = this.tabs.findIndex((tab) =>
        this.route.prefix.includes(tab.path)
      );
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="toolbar">
        <ha-paper-icon-button-arrow-prev
          aria-label="Back"
          .hassio=${this.hassio}
          @click=${this._backTapped}
        ></ha-paper-icon-button-arrow-prev>
        <div id="tabbar" class=${classMap({ "bottom-bar": this.narrow })}>
          ${this.tabs.map((page, index) =>
            (!page.component ||
              page.core ||
              isComponentLoaded(this.hass, page.component)) &&
            (!page.exportOnly || this.showAdvanced)
              ? html`
                  <div
                    class="tab ${classMap({
                      active: index === this._activeTab,
                    })}"
                    @click=${this._tabTapped}
                    .path=${page.path}
                  >
                    ${this.narrow
                      ? html`
                          <ha-icon .icon=${page.icon}></ha-icon>
                        `
                      : ""}
                    ${!this.narrow || index === this._activeTab
                      ? html`
                          <span class="name"
                            >${page.translationKey
                              ? this.hass.localize(page.translationKey)
                              : name}</span
                          >
                        `
                      : ""}
                    <mwc-ripple></mwc-ripple>
                  </div>
                `
              : ""
          )}
        </div>

        <div id="toolbar-icon">
          <slot name="toolbar-icon"></slot>
        </div>
      </div>
      <div class="content">
        <slot></slot>
      </div>
    `;
  }

  private _tabTapped(ev: MouseEvent): void {
    navigate(this, (ev.currentTarget as any).path, true);
  }

  private _backTapped(): void {
    if (this.backPath) {
      navigate(this, this.backPath);
      return;
    }
    if (this.backCallback) {
      this.backCallback();
      return;
    }
    history.back();
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        height: 100%;
        background-color: var(--primary-background-color);
      }

      .toolbar {
        display: flex;
        align-items: center;
        font-size: 20px;
        height: 64px;
        background-color: var(--sidebar-background-color);
        font-weight: 400;
        color: var(--sidebar-text-color);
        border-bottom: 1px solid var(--divider-color);
        padding: 0 16px;
        box-sizing: border-box;
      }

      :host([narrow]) .toolbar {
        background-color: var(--primary-background-color);
        border-bottom: none;
      }

      #tabbar {
        display: flex;
        font-size: 14px;
      }

      #tabbar.bottom-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        padding: 0 16px;
        box-sizing: border-box;
        background-color: var(--sidebar-background-color);
        border-top: 1px solid var(--divider-color);
        justify-content: space-between;
        z-index: 1;
        font-size: 12px;
        width: 100%;
      }

      #tabbar:not(.bottom-bar) {
        margin: auto;
        left: 50%;
        position: absolute;
        transform: translate(-50%, 0);
      }

      .tab {
        padding: 0 32px;
        display: flex;
        flex-direction: column;
        text-align: center;
        align-items: center;
        justify-content: center;
        height: 64px;
        cursor: pointer;
      }

      .name {
        white-space: nowrap;
      }

      .tab.active {
        color: var(--primary-color);
      }

      #tabbar:not(.bottom-bar) .tab.active {
        border-bottom: 2px solid var(--primary-color);
      }

      .bottom-bar .tab {
        padding: 0 16px;
        width: 20%;
        min-width: 0;
      }

      ha-menu-button,
      ha-paper-icon-button-arrow-prev,
      ::slotted([slot="toolbar-icon"]) {
        pointer-events: auto;
        color: var(--sidebar-icon-color);
      }

      [main-title] {
        margin: 0 0 0 24px;
        line-height: 20px;
        flex-grow: 1;
      }

      .content {
        position: relative;
        width: 100%;
        height: calc(100% - 64px);
        overflow-y: auto;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
      }

      #toolbar-icon {
        position: absolute;
        right: 16px;
      }

      :host([narrow]) .content {
        height: calc(100% - 128px);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hass-tabs-subpage": HassTabsSubpage;
  }
}
