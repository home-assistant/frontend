import type { ContextType } from "@lit/context";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import {
  customElement,
  eventOptions,
  property,
  query,
  state,
} from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { consume } from "../common/decorators/consume";
import { canShowPage } from "../common/config/can_show_page";
import { restoreScroll } from "../common/decorators/restore-scroll";
import type { HASSDomTargetEvent } from "../common/dom/fire_event";
import { isNavigationClick } from "../common/dom/is-navigation-click";
import { getHistoryState, navigate } from "../common/navigate";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../common/translations/localize";
import { sanitizeNavigationPath } from "../common/url/sanitize-navigation-path";
import { handleBackClick } from "./back-navigation";
import "../components/ha-icon-button-arrow-prev";
import "../components/ha-menu-button";
import "../components/ha-svg-icon";
import "../components/ha-tab";
import "../components/ha-tab-group";
import "../components/ha-tab-group-tab";
import {
  configContext,
  entitiesContext,
  internationalizationContext,
  narrowViewportContext,
} from "../data/context";
import type { PageNavigation } from "../data/page_navigation";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant, Route } from "../types";

const normalizePathname = (pathname: string): string =>
  pathname.endsWith("/") && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;

@customElement("hass-tabs-subpage")
export class HassTabsSubpage extends LitElement {
  // Unread, kept for callers that still pass it until they move to contexts
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public localizeFunc?: LocalizeFunc;

  @property({ type: String, attribute: "back-path" }) public backPath?: string;

  @property({ attribute: false }) public backCallback?: () => void;

  @property({ type: Boolean, attribute: "main-page" }) public mainPage = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public tabs!: PageNavigation[];

  @state()
  @consume({ context: narrowViewportContext, subscribe: true })
  private _narrow = false;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _hassConfig!: ContextType<typeof configContext>;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @property({ type: Boolean, reflect: true, attribute: "is-wide" })
  public isWide = false;

  @property({ type: Boolean }) public pane = false;

  /**
   * Do we need to add padding for a fab.
   * @type {Boolean}
   */
  @property({ type: Boolean, attribute: "has-fab" }) public hasFab = false;

  /**
   * Whether tabs are shown (2 or more tabs visible).
   * @type {Boolean}
   */
  @property({ type: Boolean, attribute: "show-tabs", reflect: true })
  public showTabs = false;

  @state() private _activeTab?: PageNavigation;

  @query(".content") private _content?: HTMLDivElement;

  // @ts-ignore
  @restoreScroll(".content") private _savedScrollPos?: number;

  private _shownTabs = memoizeOne(
    (
      tabs: PageNavigation[],
      _components,
      _userData,
      entities: ContextType<typeof entitiesContext>
    ) =>
      tabs.filter((page) =>
        canShowPage({ ...this._hassConfig, entities }, page)
      )
  );

  private _renderTabs = memoizeOne(
    (
      shownTabs: PageNavigation[],
      activeTab: PageNavigation | undefined,
      localizeFunc: LocalizeFunc
    ) =>
      shownTabs.map(
        (page) => html`
          <a href=${page.path} @click=${this._tabClicked}>
            <ha-tab
              .active=${page.path === activeTab?.path}
              .badge=${page.badge}
              .name=${this._tabName(page, localizeFunc)}
            >
              ${
                page.iconPath
                  ? html`<ha-svg-icon
                      slot="icon"
                      .path=${page.iconPath}
                    ></ha-svg-icon>`
                  : ""
              }
            </ha-tab>
          </a>
        `
      )
  );

  private _renderTabRow = memoizeOne(
    (
      shownTabs: PageNavigation[],
      activeTab: PageNavigation | undefined,
      localizeFunc: LocalizeFunc
    ) => html`
      <ha-tab-group
        class="tab-row"
        activation="manual"
        without-scroll-controls
        @wa-tab-show=${this._tabShown}
      >
        ${shownTabs.map(
          (page) => html`
            <ha-tab-group-tab
              slot="nav"
              .panel=${page.path}
              .active=${page.path === activeTab?.path}
            >
              <a href=${page.path} tabindex="-1" @click=${this._tabRowClicked}>
                ${this._tabName(page, localizeFunc)}
                ${
                  page.badge
                    ? html`<span class="badge">${page.badge}</span>`
                    : nothing
                }
              </a>
            </ha-tab-group-tab>
          `
        )}
      </ha-tab-group>
    `
  );

  private _tabName(page: PageNavigation, localizeFunc: LocalizeFunc) {
    return page.translationKey
      ? localizeFunc(page.translationKey as LocalizeKeys)
      : page.name;
  }

  private _getShownTabs() {
    return this._shownTabs(
      this.tabs,
      this._hassConfig.config.components,
      this._hassConfig.userData,
      this._entities
    );
  }

  public willUpdate(changedProperties: PropertyValues<this>) {
    this.toggleAttribute("narrow", this._narrow);

    if (changedProperties.has("route") || changedProperties.has("tabs")) {
      const currentPath = `${this.route.prefix}${this.route.path}`;
      this._activeTab = this.tabs.find((tab) =>
        this._isActiveTabPath(tab.path, currentPath)
      );
    }
    this.showTabs = this._getShownTabs().length > 1;
    super.willUpdate(changedProperties);
  }

  protected render(): TemplateResult {
    const localizeFunc = this.localizeFunc || this._i18n.localize;
    const shownTabs = this._getShownTabs();
    const titleTab = this.showTabs ? this._activeTab : shownTabs[0];
    const title = titleTab ? this._tabName(titleTab, localizeFunc) : "";
    const tabRow = this.showTabs && this._narrow;
    const backPath = sanitizeNavigationPath(this.backPath);

    return html`
      <div
        class="toolbar ${classMap({ narrow: this._narrow, "has-tab-row": tabRow })}"
      >
        <slot name="toolbar">
          <div class="toolbar-content">
            ${
              this.mainPage || (!backPath && getHistoryState()?.root)
                ? html`<ha-menu-button></ha-menu-button>`
                : html`
                    <ha-icon-button-arrow-prev
                      .href=${backPath}
                      @click=${this._backTapped}
                    ></ha-icon-button-arrow-prev>
                  `
            }
            ${
              this._narrow || !this.showTabs
                ? html`<div class="main-title">
                    <slot name="header">${title}</slot>
                  </div>`
                : ""
            }
            ${
              this.showTabs && !this._narrow
                ? html`<div id="tabbar">
                    ${this._renderTabs(
                      shownTabs,
                      this._activeTab,
                      localizeFunc
                    )}
                  </div>`
                : ""
            }
            <div id="toolbar-icon">
              <slot name="toolbar-icon"></slot>
            </div>
          </div>
        </slot>
      </div>
      ${
        tabRow
          ? this._renderTabRow(shownTabs, this._activeTab, localizeFunc)
          : nothing
      }
      <div class="container">
        ${
          this.pane
            ? html`<div class="pane">
                <div class="shadow-container"></div>
                <div class="ha-scrollbar">
                  <slot name="pane"></slot>
                </div>
              </div>`
            : nothing
        }
        <div class="content ha-scrollbar" @scroll=${this._saveScrollPos}>
          <slot></slot>
          ${this.hasFab ? html`<div class="fab-bottom-space"></div>` : nothing}
        </div>
      </div>
      <div id="fab">
        <slot name="fab"></slot>
      </div>
    `;
  }

  @eventOptions({ passive: true })
  private _saveScrollPos(e: HASSDomTargetEvent<HTMLDivElement>) {
    this._savedScrollPos = (e.target as HTMLDivElement).scrollTop;
  }

  public focusContentScroller() {
    if (!this._content) {
      return;
    }

    this._content.style.outline = "none";
    this._content.focus({ preventScroll: true });
  }

  private _backTapped(ev: MouseEvent): void {
    handleBackClick(ev, this.backPath, this.backCallback);
  }

  private _isActiveTabPath(tabPath: string, currentPath: string): boolean {
    try {
      const tabUrl = new URL(tabPath, window.location.origin);
      const currentUrl = new URL(currentPath, window.location.origin);

      const tabPathname = normalizePathname(tabUrl.pathname);
      const currentPathname = normalizePathname(currentUrl.pathname);

      if (
        currentPathname === tabPathname ||
        currentPathname.startsWith(`${tabPathname}/`)
      ) {
        return true;
      }

      return false;
    } catch (_err) {
      return currentPath === tabPath || currentPath.startsWith(`${tabPath}/`);
    }
  }

  private async _tabClicked(ev: MouseEvent): Promise<void> {
    const href = isNavigationClick(ev);
    if (!href) {
      return;
    }

    await navigate(href, { replace: true });
  }

  // Plain clicks are left to the tab group, which ignores the click that ends a
  // drag scroll. Other clicks keep the browser's link behavior.
  private _tabRowClicked(ev: MouseEvent): void {
    const href = isNavigationClick(ev);
    if (!href) {
      ev.stopPropagation();
      return;
    }
    // Without a matching tab the group marks the first tab active, so it
    // would not fire wa-tab-show for it.
    if (!this._activeTab) {
      ev.stopPropagation();
      navigate(href, { replace: true });
    }
  }

  // Click and keyboard activation in the tab row
  private _tabShown(ev: CustomEvent<{ name: string }>) {
    const path = ev.detail.name;
    if (path && path !== this._activeTab?.path) {
      navigate(path, { replace: true });
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: var(--primary-background-color);
        }

        :host([narrow]) {
          width: 100%;
          position: fixed;
        }

        .container {
          display: flex;
          flex: 1;
          min-height: 0;
        }

        ha-menu-button {
          margin-right: 24px;
          margin-inline-end: 24px;
          margin-inline-start: initial;
        }

        .toolbar {
          font-size: var(--ha-font-size-xl);
          height: calc(
            var(--header-height, 0px) + var(--safe-area-inset-top, 0px)
          );
          padding-top: var(--safe-area-inset-top);
          padding-right: var(--safe-area-inset-right);
          background-color: var(--sidebar-background-color);
          font-weight: var(--ha-font-weight-normal);
          border-bottom: 1px solid var(--divider-color);
          box-sizing: border-box;
          flex-shrink: 0;
        }
        .toolbar.has-tab-row {
          border-bottom: none;
        }
        :host([narrow]) .toolbar {
          padding-left: var(--safe-area-inset-left);
        }
        .toolbar-content {
          padding: 8px 12px;
          display: flex;
          align-items: center;
          height: 100%;
          box-sizing: border-box;
        }
        :host([narrow]) .toolbar-content {
          padding: 4px;
        }
        .toolbar a {
          color: var(--sidebar-text-color);
          text-decoration: none;
        }
        #tabbar {
          display: flex;
          flex: 1;
          justify-content: center;
          font-size: var(--ha-font-size-m);
          overflow: hidden;
        }

        #tabbar > a {
          overflow: hidden;
          max-width: 45%;
        }

        .tab-row {
          flex-shrink: 0;
          padding-left: var(--safe-area-inset-left, 0px);
          padding-right: var(--safe-area-inset-right, 0px);
          color: var(--sidebar-text-color);
          background-color: var(--sidebar-background-color);
          border-bottom: 1px solid var(--divider-color);
          --ha-tab-track-color: transparent;
        }
        .tab-row ha-tab-group-tab::part(base) {
          padding: 0;
        }
        .tab-row a {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          padding: var(--ha-space-3) var(--ha-space-4);
          color: inherit;
          text-decoration: none;
          white-space: nowrap;
        }
        .badge {
          padding: 0 var(--ha-space-2);
          border-radius: var(--ha-border-radius-pill);
          font-size: var(--ha-font-size-s);
          line-height: var(--ha-line-height-normal);
          white-space: nowrap;
          color: var(--text-primary-color);
          background-color: var(--warning-color);
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
          min-width: 0;
          flex: 1;
          max-height: var(--header-height);
          line-height: var(--ha-line-height-normal);
          color: var(--sidebar-text-color);
          margin-inline-start: var(--main-title-margin, var(--ha-space-6));
        }
        .narrow .main-title {
          margin-inline-start: var(--main-title-margin, var(--ha-space-2));
        }

        .content {
          position: relative;
          width: 100%;
          box-sizing: border-box;
          padding-right: var(--safe-area-inset-right);
          overflow: auto;
          -webkit-overflow-scrolling: touch;
          margin-bottom: var(--ha-bottom-bar-height, 0px);
        }
        :host([narrow]) .content {
          padding-left: var(--safe-area-inset-left);
        }
        /* The fab spacer already clears the safe area. Pages that clear it
           themselves, like data tables, set the variable to 0px. */
        :host([narrow]:not([has-fab])) .content {
          padding-bottom: var(
            --tabs-subpage-content-padding-bottom,
            max(
              0px,
              var(--safe-area-inset-bottom, 0px) - var(
                  --ha-bottom-bar-height,
                  0px
                )
            )
          );
        }

        .content .fab-bottom-space {
          height: calc(
            64px +
              max(
                0px,
                var(--safe-area-inset-bottom, 0px) - var(
                    --ha-bottom-bar-height,
                    0px
                  )
              )
          );
        }

        #fab {
          position: fixed;
          right: calc(16px + var(--safe-area-inset-right, 0px));
          inset-inline-end: calc(16px + var(--safe-area-inset-right));
          inset-inline-start: initial;
          bottom: calc(
            16px +
              max(
                var(--safe-area-inset-bottom, 0px),
                var(--ha-bottom-bar-height, 0px)
              )
          );
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: var(--ha-space-2);
          --ha-button-box-shadow: var(--ha-box-shadow-l);
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
