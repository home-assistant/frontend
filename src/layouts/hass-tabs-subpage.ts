import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, eventOptions, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { canShowPage } from "../common/config/can_show_page";
import { restoreScroll } from "../common/decorators/restore-scroll";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-icon-button-arrow-prev";
import "../components/ha-menu-button";
import "../components/ha-svg-icon";
import "../components/ha-tab";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant, Route } from "../types";

export interface PageNavigation {
  path: string;
  translationKey?: string;
  component?: string | string[];
  name?: string;
  not_component?: string | string[];
  core?: boolean;
  advancedOnly?: boolean;
  iconPath?: string;
  description?: string;
  iconColor?: string;
  info?: any;
}

@customElement("hass-tabs-subpage")
class HassTabsSubpage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public supervisor = false;

  @property({ attribute: false }) public localizeFunc?: LocalizeFunc;

  @property({ type: String, attribute: "back-path" }) public backPath?: string;

  @property({ attribute: false }) public backCallback?: () => void;

  @property({ type: Boolean, attribute: "main-page" }) public mainPage = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public tabs!: PageNavigation[];

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ type: Boolean, reflect: true, attribute: "is-wide" })
  public isWide = false;

  @property({ type: Boolean }) public pane = false;

  /**
   * Do we need to add padding for a fab.
   * @type {Boolean}
   */
  @property({ type: Boolean, attribute: "has-fab" }) public hasFab = false;

  @state() private _activeTab?: PageNavigation;

  // @ts-ignore
  @restoreScroll(".content") private _savedScrollPos?: number;

  private _getTabs = memoizeOne(
    (
      tabs: PageNavigation[],
      activeTab: PageNavigation | undefined,
      _components,
      _language,
      _narrow,
      localizeFunc
    ) => {
      const shownTabs = tabs.filter((page) => canShowPage(this.hass, page));

      if (shownTabs.length < 2) {
        if (shownTabs.length === 1) {
          const page = shownTabs[0];
          return [
            page.translationKey ? localizeFunc(page.translationKey) : page.name,
          ];
        }
        return [""];
      }

      return shownTabs.map(
        (page) => html`
          <a href=${page.path}>
            <ha-tab
              .hass=${this.hass}
              .active=${page.path === activeTab?.path}
              .narrow=${this.narrow}
              .name=${page.translationKey
                ? localizeFunc(page.translationKey)
                : page.name}
            >
              ${page.iconPath
                ? html`<ha-svg-icon
                    slot="icon"
                    .path=${page.iconPath}
                  ></ha-svg-icon>`
                : ""}
            </ha-tab>
          </a>
        `
      );
    }
  );

  public willUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has("route")) {
      this._activeTab = this.tabs.find((tab) =>
        `${this.route.prefix}${this.route.path}`.includes(tab.path)
      );
    }
    super.willUpdate(changedProperties);
  }

  protected render(): TemplateResult {
    const tabs = this._getTabs(
      this.tabs,
      this._activeTab,
      this.hass.config.components,
      this.hass.language,
      this.narrow,
      this.localizeFunc || this.hass.localize
    );
    const showTabs = tabs.length > 1;
    return html`
      <div class="toolbar">
        <slot name="toolbar">
          <div class="toolbar-content">
            ${this.mainPage || (!this.backPath && history.state?.root)
              ? html`
                  <ha-menu-button
                    .hassio=${this.supervisor}
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                  ></ha-menu-button>
                `
              : this.backPath
                ? html`
                    <a href=${this.backPath}>
                      <ha-icon-button-arrow-prev
                        .hass=${this.hass}
                      ></ha-icon-button-arrow-prev>
                    </a>
                  `
                : html`
                    <ha-icon-button-arrow-prev
                      .hass=${this.hass}
                      @click=${this._backTapped}
                    ></ha-icon-button-arrow-prev>
                  `}
            ${this.narrow || !showTabs
              ? html`<div class="main-title">
                  <slot name="header">${!showTabs ? tabs[0] : ""}</slot>
                </div>`
              : ""}
            ${showTabs && !this.narrow
              ? html`<div id="tabbar">${tabs}</div>`
              : ""}
            <div id="toolbar-icon">
              <slot name="toolbar-icon"></slot>
            </div>
          </div>
        </slot>
        ${showTabs && this.narrow
          ? html`<div id="tabbar" class="bottom-bar">${tabs}</div>`
          : ""}
      </div>
      <div class="container">
        ${this.pane
          ? html`<div class="pane">
              <div class="shadow-container"></div>
              <div class="ha-scrollbar">
                <slot name="pane"></slot>
              </div>
            </div>`
          : nothing}
        <div
          class="content ha-scrollbar ${classMap({ tabs: showTabs })}"
          @scroll=${this._saveScrollPos}
        >
          <slot></slot>
          ${this.hasFab ? html`<div class="fab-bottom-space"></div>` : nothing}
        </div>
      </div>
      <div id="fab" class=${classMap({ tabs: showTabs })}>
        <slot name="fab"></slot>
      </div>
    `;
  }

  @eventOptions({ passive: true })
  private _saveScrollPos(e: Event) {
    this._savedScrollPos = (e.target as HTMLDivElement).scrollTop;
  }

  private _backTapped(): void {
    if (this.backCallback) {
      this.backCallback();
      return;
    }
    history.back();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        :host {
          display: block;
          height: 100%;
          background-color: var(--primary-background-color);
        }

        :host([narrow]) {
          width: 100%;
          position: fixed;
        }

        .container {
          display: flex;
          height: calc(100% - var(--header-height));
        }

        :host([narrow]) .container {
          height: 100%;
        }

        ha-menu-button {
          margin-right: 24px;
          margin-inline-end: 24px;
          margin-inline-start: initial;
        }

        .toolbar {
          font-size: var(--ha-font-size-xl);
          height: var(--header-height);
          background-color: var(--sidebar-background-color);
          font-weight: var(--ha-font-weight-normal);
          border-bottom: 1px solid var(--divider-color);
          box-sizing: border-box;
        }
        .toolbar-content {
          padding: 8px 12px;
          display: flex;
          align-items: center;
          height: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 599px) {
          .toolbar-content {
            padding: 4px;
          }
        }
        .toolbar a {
          color: var(--sidebar-text-color);
          text-decoration: none;
        }
        .bottom-bar a {
          width: 25%;
        }

        #tabbar {
          display: flex;
          font-size: var(--ha-font-size-m);
          overflow: hidden;
        }

        #tabbar > a {
          overflow: hidden;
          max-width: 45%;
        }

        #tabbar.bottom-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          padding: 0 16px;
          box-sizing: border-box;
          background-color: var(--sidebar-background-color);
          border-top: 1px solid var(--divider-color);
          justify-content: space-around;
          z-index: 2;
          font-size: var(--ha-font-size-s);
          width: 100%;
          padding-bottom: var(--safe-area-inset-bottom);
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
          display: flex;
          flex-shrink: 0;
          pointer-events: auto;
          color: var(--sidebar-icon-color);
        }

        .main-title {
          flex: 1;
          max-height: var(--header-height);
          line-height: var(--ha-line-height-normal);
          color: var(--sidebar-text-color);
          margin: var(--main-title-margin, var(--margin-title));
        }

        .content {
          position: relative;
          width: calc(
            100% - var(--safe-area-inset-left) - var(--safe-area-inset-right)
          );
          margin-left: var(--safe-area-inset-left);
          margin-right: var(--safe-area-inset-right);
          margin-inline-start: var(--safe-area-inset-left);
          margin-inline-end: var(--safe-area-inset-right);
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }

        :host([narrow]) .content {
          height: calc(100% - var(--header-height));
          height: calc(
            100% - var(--header-height) - var(--safe-area-inset-bottom)
          );
        }

        :host([narrow]) .content.tabs {
          height: calc(100% - 2 * var(--header-height));
          height: calc(
            100% - 2 * var(--header-height) - var(--safe-area-inset-bottom)
          );
        }

        .content .fab-bottom-space {
          height: calc(64px + var(--safe-area-inset-bottom));
        }

        :host([narrow]) .content.tabs .fab-bottom-space {
          height: calc(80px + var(--safe-area-inset-bottom));
        }

        #fab {
          position: fixed;
          right: calc(16px + var(--safe-area-inset-right));
          inset-inline-end: calc(16px + var(--safe-area-inset-right));
          inset-inline-start: initial;
          bottom: calc(16px + var(--safe-area-inset-bottom));
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }
        :host([narrow]) #fab.tabs {
          bottom: calc(84px + var(--safe-area-inset-bottom));
        }
        #fab[is-wide] {
          bottom: 24px;
          right: 24px;
          inset-inline-end: 24px;
          inset-inline-start: initial;
        }

        .pane {
          border-right: 1px solid var(--divider-color);
          border-inline-end: 1px solid var(--divider-color);
          border-inline-start: initial;
          box-sizing: border-box;
          display: flex;
          flex: 0 0 var(--sidepane-width, 250px);
          width: var(--sidepane-width, 250px);
          flex-direction: column;
          position: relative;
        }
        .pane .ha-scrollbar {
          flex: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hass-tabs-subpage": HassTabsSubpage;
  }
}
