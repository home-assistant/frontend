import "@material/mwc-ripple";
import {
  css,
  CSSResult,
  customElement,
  eventOptions,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { restoreScroll } from "../common/decorators/restore-scroll";
import { navigate } from "../common/navigate";
import { computeRTL } from "../common/util/compute_rtl";
import "../components/ha-icon";
import "../components/ha-icon-button-arrow-prev";
import "../components/ha-menu-button";
import "../components/ha-svg-icon";
import "../components/ha-tab";
import { HomeAssistant, Route } from "../types";

export interface PageNavigation {
  path: string;
  translationKey?: string;
  component?: string;
  name?: string;
  core?: boolean;
  advancedOnly?: boolean;
  icon?: string;
  iconPath?: string;
  info?: any;
}

@customElement("hass-tabs-subpage")
class HassTabsSubpage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public hassio = false;

  @property({ type: String, attribute: "back-path" }) public backPath?: string;

  @property() public backCallback?: () => void;

  @property({ type: Boolean, attribute: "main-page" }) public mainPage = false;

  @property() public route!: Route;

  @property() public tabs!: PageNavigation[];

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ type: Boolean, reflect: true, attribute: "is-wide" })
  public isWide = false;

  @property({ type: Boolean, reflect: true }) public rtl = false;

  @internalProperty() private _activeTab?: PageNavigation;

  // @ts-ignore
  @restoreScroll(".content") private _savedScrollPos?: number;

  private _getTabs = memoizeOne(
    (
      tabs: PageNavigation[],
      activeTab: PageNavigation | undefined,
      showAdvanced: boolean | undefined,
      _components,
      _language,
      _narrow
    ) => {
      const shownTabs = tabs.filter(
        (page) =>
          (!page.component ||
            page.core ||
            isComponentLoaded(this.hass, page.component)) &&
          (!page.advancedOnly || showAdvanced)
      );

      return shownTabs.map(
        (page) =>
          html`
            <ha-tab
              .hass=${this.hass}
              @click=${this._tabTapped}
              .path=${page.path}
              .active=${page === activeTab}
              .narrow=${this.narrow}
              .name=${page.translationKey
                ? this.hass.localize(page.translationKey)
                : page.name}
            >
              ${page.iconPath
                ? html`<ha-svg-icon
                    slot="icon"
                    .path=${page.iconPath}
                  ></ha-svg-icon>`
                : html`<ha-icon slot="icon" .icon=${page.icon}></ha-icon>`}
            </ha-tab>
          `
      );
    }
  );

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has("route")) {
      this._activeTab = this.tabs.find((tab) =>
        `${this.route.prefix}${this.route.path}`.includes(tab.path)
      );
    }
    if (changedProperties.has("hass")) {
      const oldHass = changedProperties.get("hass") as
        | HomeAssistant
        | undefined;
      if (!oldHass || oldHass.language !== this.hass.language) {
        this.rtl = computeRTL(this.hass);
      }
    }
  }

  protected render(): TemplateResult {
    const tabs = this._getTabs(
      this.tabs,
      this._activeTab,
      this.hass.userData?.showAdvanced,
      this.hass.config.components,
      this.hass.language,
      this.narrow
    );
    const showTabs = tabs.length > 1 || !this.narrow;
    return html`
      <div class="toolbar">
        ${this.mainPage
          ? html`
              <ha-menu-button
                .hassio=${this.hassio}
                .hass=${this.hass}
                .narrow=${this.narrow}
              ></ha-menu-button>
            `
          : html`
              <ha-icon-button-arrow-prev
                aria-label="Back"
                @click=${this._backTapped}
              ></ha-icon-button-arrow-prev>
            `}
        ${this.narrow
          ? html` <div class="main-title"><slot name="header"></slot></div> `
          : ""}
        ${showTabs
          ? html`
              <div id="tabbar" class=${classMap({ "bottom-bar": this.narrow })}>
                ${tabs}
              </div>
            `
          : ""}
        <div id="toolbar-icon">
          <slot name="toolbar-icon"></slot>
        </div>
      </div>
      <div
        class="content ${classMap({ tabs: showTabs })}"
        @scroll=${this._saveScrollPos}
      >
        <slot></slot>
      </div>
      <div id="fab" class="${classMap({ tabs: showTabs })}">
        <slot name="fab"></slot>
      </div>
    `;
  }

  @eventOptions({ passive: true })
  private _saveScrollPos(e: Event) {
    this._savedScrollPos = (e.target as HTMLDivElement).scrollTop;
  }

  private _tabTapped(ev: Event): void {
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

      :host([narrow]) {
        width: 100%;
        position: fixed;
      }

      ha-menu-button {
        margin-right: 24px;
      }

      .toolbar {
        display: flex;
        align-items: center;
        font-size: 20px;
        height: 65px;
        background-color: var(--sidebar-background-color);
        font-weight: 400;
        color: var(--sidebar-text-color);
        border-bottom: 1px solid var(--divider-color);
        padding: 0 16px;
        box-sizing: border-box;
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
        z-index: 2;
        font-size: 12px;
        width: 100%;
        padding-bottom: env(safe-area-inset-bottom);
      }

      #tabbar:not(.bottom-bar) {
        flex: 1;
        justify-content: center;
      }

      :host(:not([narrow])) #toolbar-icon {
        min-width: 40px;
      }

      ha-menu-button,
      ha-icon-button-arrow-prev,
      ::slotted([slot="toolbar-icon"]) {
        flex-shrink: 0;
        pointer-events: auto;
        color: var(--sidebar-icon-color);
      }

      .main-title {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        max-height: 58px;
        line-height: 20px;
      }

      .content {
        position: relative;
        width: calc(
          100% - env(safe-area-inset-left) - env(safe-area-inset-right)
        );
        margin-left: env(safe-area-inset-left);
        margin-right: env(safe-area-inset-right);
        height: calc(100% - 65px);
        height: calc(100% - 65px - env(safe-area-inset-bottom));
        overflow-y: auto;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
      }

      :host([narrow]) .content.tabs {
        height: calc(100% - 128px);
        height: calc(100% - 128px - env(safe-area-inset-bottom));
      }

      #fab {
        position: fixed;
        right: calc(16px + env(safe-area-inset-right));
        bottom: calc(16px + env(safe-area-inset-bottom));
        z-index: 1;
      }
      :host([narrow]) #fab.tabs {
        bottom: calc(84px + env(safe-area-inset-bottom));
      }
      #fab[is-wide] {
        bottom: 24px;
        right: 24px;
      }
      :host([rtl]) #fab {
        right: auto;
        left: calc(16px + env(safe-area-inset-left));
      }
      :host([rtl][is-wide]) #fab {
        bottom: 24px;
        left: 24px;
        right: auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hass-tabs-subpage": HassTabsSubpage;
  }
}
