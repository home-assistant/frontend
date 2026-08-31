import { ContextProvider } from "@lit/context";
import { mdiCog, mdiMenu } from "@mdi/js";
import type { Connection } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { applyThemesOnElement } from "../../src/common/dom/apply_themes_on_element";
import { dynamicElement } from "../../src/common/dom/dynamic-element-directive";
import type { HASSDomEvent } from "../../src/common/dom/fire_event";
import { setDirectionStyles } from "../../src/common/util/compute_rtl";
import "../../src/components/ha-button";
import "../../src/components/ha-drawer";
import { HaExpansionPanel } from "../../src/components/ha-expansion-panel";
import "../../src/components/ha-icon-button";
import "../../src/components/ha-sidebar";
import "../../src/components/item/ha-list-item-button";
import "../../src/components/ha-svg-icon";
import "../../src/components/ha-top-app-bar-fixed";
import "../../src/managers/notification-manager";
import { haStyle } from "../../src/resources/styles";
import {
  apiContext,
  areasContext,
  configContext,
  connectionContext,
  devicesContext,
  entitiesContext,
  floorsContext,
  formattersContext,
  internationalizationContext,
  registriesContext,
  servicesContext,
  statesContext,
  uiContext,
} from "../../src/data/context";
import { updateHassGroups } from "../../src/data/context/updateContext";
import type { HomeAssistant, ThemeSettings } from "../../src/types";
import { PAGES, SIDEBAR } from "../build/import-pages";
import {
  GALLERY_THEME_STORAGE_KEY,
  loadGalleryThemeSettings,
} from "./common/theme";
import "./components/gallery-settings";
import "./components/page-description";

const RTL_STORAGE_KEY = "gallery-rtl";
const SETTINGS_PAGE = "settings";

const GITHUB_DEMO_URL =
  "https://github.com/home-assistant/frontend/blob/dev/gallery/src/pages/";

interface GalleryPage {
  metadata: Record<string, unknown>;
  description?: unknown;
  demo?: unknown;
}

interface GallerySidebarSubsection {
  header: string;
  pages: string[];
}

interface GallerySidebarGroup {
  category: string;
  header?: string;
  icon?: string;
  pages?: string[];
  subsections?: GallerySidebarSubsection[];
}

const groupPages = (group: GallerySidebarGroup): string[] =>
  group.subsections
    ? group.subsections.flatMap((subsection) => subsection.pages)
    : (group.pages ?? []);

const GALLERY_SIDEBAR = SIDEBAR as GallerySidebarGroup[];
const DEFAULT_PAGE = `${GALLERY_SIDEBAR[0].category}/${groupPages(GALLERY_SIDEBAR[0])[0]}`;

const mql = matchMedia("(prefers-color-scheme: dark)");

const galleryLocalize = (key: string) =>
  (
    ({
      "ui.sidebar.sidebar_toggle": "Toggle sidebar",
      "ui.notification_drawer.title": "Notifications",
      "ui.sidebar.external_app_configuration": "App configuration",
      "panel.config": "Settings",
    }) as Record<string, string>
  )[key] ?? key;

const galleryConnection = {
  subscribeMessage(
    callback: (message: unknown) => void,
    message: { type?: string }
  ) {
    if (message.type === "frontend/subscribe_user_data") {
      callback({ value: { panelOrder: [], hiddenPanels: [] } });
    } else if (message.type === "persistent_notification/subscribe") {
      callback({ type: "current", notifications: {} });
    }
    return Promise.resolve(() => undefined);
  },
  sendMessagePromise() {
    return Promise.resolve({ value: null });
  },
} as unknown as Connection;

@customElement("ha-gallery")
class HaGallery extends LitElement {
  @state() private _page = this._pageFromLocation();

  @state() private _rtl = localStorage.getItem(RTL_STORAGE_KEY) === "true";

  @state() private _themeSettings = loadGalleryThemeSettings();

  @state() private _systemDark = mql.matches;

  @query("notification-manager")
  private _notifications!: HTMLElementTagNameMap["notification-manager"];

  @query("ha-sidebar")
  private _sidebar?: HTMLElementTagNameMap["ha-sidebar"];

  @query(".gallery-nav-item[selected]")
  private _selectedNavigationItem?: HTMLElementTagNameMap["ha-list-item-button"];

  private _narrow = window.matchMedia("(max-width: 600px)").matches;

  @state() private _drawerOpen = !this._narrow;

  // Fallback Lit context providers for the whole gallery. The real app's root
  // element provides these via `contextMixin`; here we mirror that so demos
  // which render context-consuming components without setting up their own hass
  // (e.g. bare component demos) still resolve `localize`, formatters, config,
  // etc. instead of throwing during init. Demos that call `provideHass`
  // register their own providers closer in the tree, which take precedence.
  private _contextProviders = {
    registries: new ContextProvider(this, { context: registriesContext }),
    internationalization: new ContextProvider(this, {
      context: internationalizationContext,
    }),
    api: new ContextProvider(this, { context: apiContext }),
    connection: new ContextProvider(this, { context: connectionContext }),
    ui: new ContextProvider(this, { context: uiContext }),
    config: new ContextProvider(this, { context: configContext }),
    formatters: new ContextProvider(this, { context: formattersContext }),
  };

  // The individual (non-grouped) contexts contextMixin also provides. Components
  // such as ha-area-picker / ha-entity-picker consume these directly, so the
  // fallback must cover them too.
  private _singleContextProviders = {
    states: new ContextProvider(this, { context: statesContext }),
    services: new ContextProvider(this, { context: servicesContext }),
    entities: new ContextProvider(this, { context: entitiesContext }),
    devices: new ContextProvider(this, { context: devicesContext }),
    areas: new ContextProvider(this, { context: areasContext }),
    floors: new ContextProvider(this, { context: floorsContext }),
  };

  protected willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    // Refresh the fallback contexts before each render so theme/page changes in
    // the gallery hass propagate to consuming components.
    const hass = this._galleryHass;
    (
      Object.keys(
        this._contextProviders
      ) as (keyof typeof this._contextProviders)[]
    ).forEach((group) => {
      const provider = this._contextProviders[group];
      provider.setValue(
        (updateHassGroups[group] as (h: HomeAssistant, v?: any) => any)(
          hass,
          provider.value
        )
      );
    });
    (
      Object.keys(
        this._singleContextProviders
      ) as (keyof typeof this._singleContextProviders)[]
    ).forEach((key) => {
      (this._singleContextProviders[key] as ContextProvider<any>).setValue(
        hass[key]
      );
    });
  }

  render() {
    const isSettingsPage = this._page === SETTINGS_PAGE;
    const page = isSettingsPage ? undefined : PAGES[this._page];

    return html`
      <ha-drawer
        .direction=${this._rtl ? "rtl" : "ltr"}
        .open=${this._drawerOpen}
        .type=${this._narrow ? "modal" : "dismissible"}
      >
        <ha-sidebar
          .hass=${this._galleryHass}
          .narrow=${this._narrow}
          .route=${{ prefix: "", path: this._page }}
          .alwaysExpand=${true}
          sidebar-title="Home Assistant Design"
          @hass-toggle-menu=${this._toggleDrawer}
        >
          ${this._renderSidebarNavigation()} ${this._renderSettingsItem()}
        </ha-sidebar>
        <div slot="appContent" class="app-content">
          <ha-top-app-bar-fixed .narrow=${this._narrow}>
            ${
              this._narrow || !this._drawerOpen
                ? html`<ha-icon-button
                    slot="navigationIcon"
                    @click=${this._toggleDrawer}
                    .path=${mdiMenu}
                  ></ha-icon-button>`
                : nothing
            }

            <div slot="title">
              ${
                isSettingsPage
                  ? "Settings"
                  : page?.metadata.title || this._page.split("/")[1]
              }
            </div>
            <div class="content">
              ${
                isSettingsPage
                  ? html`<gallery-settings
                      .hass=${this._galleryHass}
                      .themeSettings=${this._themeSettings}
                      .narrow=${this._narrow}
                      .rtl=${this._rtl}
                      @theme-settings-changed=${this._themeSettingsChanged}
                      @gallery-rtl-changed=${this._rtlChanged}
                    ></gallery-settings>`
                  : html`
                      ${
                        page?.description
                          ? html`
                              <page-description .page=${this._page}>
                              </page-description>
                            `
                          : nothing
                      }
                      ${dynamicElement(`demo-${this._page.replace("/", "-")}`)}
                    `
              }
            </div>
            ${isSettingsPage || !page ? nothing : this._renderPageFooter(page)}
          </ha-top-app-bar-fixed>
        </div>
      </ha-drawer>
      <notification-manager
        .hass=${this._galleryHass}
        id="notifications"
      ></notification-manager>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    mql.addEventListener("change", this._systemDarkChanged);
  }

  firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);

    this._applyDirection();
    this._applyTheme();

    this.addEventListener("show-notification", (ev) =>
      this._notifications.showDialog({ message: ev.detail.message })
    );
    this.addEventListener("alert-dismissed-clicked", () =>
      this._notifications.showDialog({ message: "Alert dismissed clicked" })
    );
    this.addEventListener("hass-more-info", (ev) => {
      if (ev.detail.entityId) {
        this._notifications.showDialog({
          message: `Showing more info for ${ev.detail.entityId}`,
        });
      }
    });

    if (document.location.hash.substring(1) !== this._page) {
      document.location.hash = this._page;
    }

    window.addEventListener("hashchange", this._hashChanged);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    mql.removeEventListener("change", this._systemDarkChanged);
    window.removeEventListener("hashchange", this._hashChanged);
  }

  private _hashChanged = () => {
    this._page = this._pageFromLocation();
    if (this._narrow) {
      this._drawerOpen = false;
    }
  };

  updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("_rtl")) {
      this._applyDirection();
    }

    if (changedProps.has("_themeSettings") || changedProps.has("_systemDark")) {
      this._applyTheme();
    }

    if (!changedProps.has("_page")) {
      return;
    }

    if (this._page === SETTINGS_PAGE) {
      return;
    }

    if (PAGES[this._page].demo) {
      PAGES[this._page].demo();
    }

    void this._scrollSelectedNavigationItemIntoView();
  }

  private async _scrollSelectedNavigationItemIntoView() {
    const menuItem = this._selectedNavigationItem;

    if (!menuItem) {
      return;
    }

    // Make sure section is expanded before measuring the selected item.
    if (menuItem.parentElement instanceof HaExpansionPanel) {
      menuItem.parentElement.expanded = true;
      await menuItem.parentElement.updateComplete;
    }

    const scrollable = this._sidebar?.shadowRoot?.querySelector<HTMLElement>(
      "ha-list-nav.before-spacer"
    );

    if (!scrollable) {
      return;
    }

    requestAnimationFrame(() => {
      const itemRect = menuItem.getBoundingClientRect();
      const scrollableRect = scrollable.getBoundingClientRect();
      const targetScrollTop =
        scrollable.scrollTop +
        itemRect.top -
        scrollableRect.top -
        (scrollableRect.height - itemRect.height) / 2;

      scrollable.scrollTo({
        top: Math.min(
          Math.max(0, targetScrollTop),
          scrollable.scrollHeight - scrollable.clientHeight
        ),
        left: 0,
      });
      scrollable.scrollLeft = 0;
    });
  }

  private _renderSidebarNavigation() {
    const sidebar: unknown[] = [];

    for (const group of GALLERY_SIDEBAR) {
      const expanded = groupPages(group).some(
        (page) => this._page === `${group.category}/${page}`
      );

      const content = group.subsections
        ? group.subsections.map((subsection) =>
            this._renderSidebarSubsection(group, subsection)
          )
        : this._renderPageLinks(group, group.pages ?? []);

      sidebar.push(
        group.header
          ? html`
              <ha-expansion-panel
                slot="main-navigation"
                class="gallery-sidebar-section"
                .header=${group.header}
                ?expanded=${expanded}
              >
                ${
                  group.icon
                    ? html`<ha-svg-icon
                        slot="leading-icon"
                        class="gallery-sidebar-icon"
                        .path=${group.icon}
                      ></ha-svg-icon>`
                    : nothing
                }
                ${content}
              </ha-expansion-panel>
            `
          : content
      );
    }

    return sidebar;
  }

  private _renderSidebarSubsection(
    group: GallerySidebarGroup,
    subsection: GallerySidebarSubsection
  ) {
    return html`
      <div class="gallery-sidebar-subheader">${subsection.header}</div>
      ${this._renderPageLinks(group, subsection.pages)}
    `;
  }

  private _renderPageLinks(group: GallerySidebarGroup, pages: string[]) {
    const links: unknown[] = [];
    for (const page of pages) {
      const key = `${group.category}/${page}`;
      if (!(key in PAGES)) {
        console.error("Undefined page referenced in sidebar.js:", key);
        continue;
      }
      links.push(
        this._renderPageLink(
          key,
          PAGES[key].metadata.title || page,
          group.header ? undefined : "main-navigation",
          group.header ? undefined : group.icon
        )
      );
    }
    return links;
  }

  private _renderPageLink(
    page: string,
    title: string,
    slot?: string,
    iconPath?: string
  ) {
    return html`
      <ha-list-item-button
        slot=${ifDefined(slot)}
        class=${classMap({
          "gallery-nav-item": true,
          "has-icon": Boolean(iconPath),
          selected: this._page === page,
        })}
        ?selected=${this._page === page}
        href=${`#${page}`}
      >
        ${
          iconPath
            ? html`<ha-svg-icon slot="start" .path=${iconPath}></ha-svg-icon>`
            : nothing
        }
        <span slot="headline">${title}</span>
      </ha-list-item-button>
    `;
  }

  private _renderSettingsItem() {
    return html`
      <ha-list-item-button
        slot="fixed-navigation"
        class=${classMap({
          "gallery-settings-item": true,
          selected: this._page === SETTINGS_PAGE,
        })}
        ?selected=${this._page === SETTINGS_PAGE}
        href="#settings"
      >
        <ha-svg-icon slot="start" .path=${mdiCog}></ha-svg-icon>
        <span slot="headline">Settings</span>
      </ha-list-item-button>
    `;
  }

  private _renderPageFooter(page: GalleryPage) {
    return html`<div class="page-footer">
      <div class="edit-docs">
        <div class="header">Help us to improve our documentation</div>
        <div class="secondary">
          Suggest an edit to this page, or provide/view feedback for this page.
        </div>
        <div>
          ${
            page.description || Object.keys(page.metadata).length > 0
              ? html`
                  <a
                    href=${`${GITHUB_DEMO_URL}${this._page}.markdown`}
                    target="_blank"
                  >
                    Edit text
                  </a>
                `
              : nothing
          }
          ${
            page.demo
              ? html`
                  <a
                    href=${`${GITHUB_DEMO_URL}${this._page}.ts`}
                    target="_blank"
                  >
                    Edit demo
                  </a>
                `
              : nothing
          }
        </div>
      </div>
    </div>`;
  }

  private _toggleDrawer(ev?: Event) {
    ev?.stopPropagation();
    this._drawerOpen = !this._drawerOpen;
  }

  private _applyDirection() {
    setDirectionStyles(this._rtl ? "rtl" : "ltr", this);
  }

  private _themeSettingsChanged(ev: HASSDomEvent<Partial<ThemeSettings>>) {
    this._themeSettings = {
      ...this._themeSettings,
      ...ev.detail,
      theme: "default",
    };
    localStorage.setItem(
      GALLERY_THEME_STORAGE_KEY,
      JSON.stringify(this._themeSettings)
    );
  }

  private _rtlChanged(ev: HASSDomEvent<{ rtl: boolean }>) {
    this._rtl = ev.detail.rtl;
    localStorage.setItem(RTL_STORAGE_KEY, String(this._rtl));
  }

  private _systemDarkChanged = (ev: MediaQueryListEvent) => {
    this._systemDark = ev.matches;
  };

  private _applyTheme() {
    applyThemesOnElement(
      document.documentElement,
      this._themes,
      "default",
      this._themeSettings,
      true
    );

    let schemeMeta = document.querySelector("meta[name=color-scheme]");
    if (!schemeMeta) {
      schemeMeta = document.createElement("meta");
      schemeMeta.setAttribute("name", "color-scheme");
      document.head.appendChild(schemeMeta);
    }
    schemeMeta.setAttribute(
      "content",
      this._effectiveDarkMode ? "dark" : "light"
    );
    document.documentElement.style.colorScheme = this._effectiveDarkMode
      ? "dark"
      : "light";

    const themeMeta = document.querySelector("meta[name=theme-color]");
    if (themeMeta) {
      if (!themeMeta.hasAttribute("default-content")) {
        themeMeta.setAttribute(
          "default-content",
          themeMeta.getAttribute("content") ?? ""
        );
      }
      const styles = getComputedStyle(document.documentElement);
      const themeColor =
        styles.getPropertyValue("--app-theme-color").trim() ||
        styles.getPropertyValue("--primary-background-color").trim() ||
        themeMeta.getAttribute("default-content") ||
        "";
      themeMeta.setAttribute("content", themeColor);
    }
  }

  private _pageFromLocation() {
    const page = document.location.hash.substring(1);
    return page === SETTINGS_PAGE || page in PAGES ? page : DEFAULT_PAGE;
  }

  private get _effectiveDarkMode() {
    return this._themeSettings.dark ?? this._systemDark;
  }

  private get _themes(): HomeAssistant["themes"] {
    return {
      default_theme: "default",
      default_dark_theme: null,
      themes: {},
      darkMode: this._effectiveDarkMode,
      theme: "default",
    };
  }

  private get _galleryHass(): HomeAssistant {
    return {
      auth: {},
      areas: {},
      config: {},
      connected: true,
      connection: galleryConnection,
      debugConnection: false,
      devices: {},
      dockedSidebar: "docked",
      enableShortcuts: true,
      entities: {},
      floors: {},
      hassUrl: (path) => path,
      kioskMode: false,
      language: "en",
      loadBackendTranslation: async () => galleryLocalize,
      loadFragmentTranslation: async () => undefined,
      locale: {
        language: "en",
        number_format: "language",
        time_format: "language",
        date_format: "language",
        first_weekday: "language",
        time_zone: "local",
      },
      localize: galleryLocalize,
      panelUrl: this._page,
      panels: {},
      selectedLanguage: null,
      selectedTheme: this._themeSettings,
      services: {},
      states: {},
      suspendWhenHidden: false,
      systemData: {},
      themes: this._themes,
      translationMetadata: { fragments: [], translations: {} },
      user: {
        id: "gallery",
        is_admin: false,
        is_owner: false,
        name: "Settings",
        credentials: [],
        mfa_modules: [],
      },
      userData: {},
      vibrate: false,
      callApi: async () => undefined,
      callApiRaw: async () => new Response(),
      callService: async () => ({ context: { id: "gallery" } }),
      callWS: async () => undefined,
      fetchWithAuth: async () => new Response(),
      sendWS: () => undefined,
      formatEntityState: (stateObj, stateValue) =>
        (stateValue != null ? stateValue : stateObj.state) ?? "",
      formatEntityStateToParts: (stateObj, stateValue) => [
        {
          type: "value",
          value: (stateValue != null ? stateValue : stateObj.state) ?? "",
        },
      ],
      formatEntityAttributeName: (_stateObj, attribute) => attribute,
      formatEntityAttributeValue: (stateObj, attribute, value) =>
        value != null ? value : (stateObj.attributes[attribute] ?? ""),
      formatEntityName: (stateObj, type) =>
        typeof type === "string"
          ? type
          : (stateObj.attributes.friendly_name ?? stateObj.entity_id),
    } as unknown as HomeAssistant;
  }

  static styles = [
    haStyle,
    css`
      :host {
        user-select: initial;
        --ha-sidebar-width: 300px;
        --ha-sidebar-expanded-width: 300px;
        --ha-sidebar-expanded-item-width: 292px;
        --ha-sidebar-expanded-section-item-width: 256px;
        --app-header-background-color: var(--sidebar-background-color);
        --app-header-text-color: var(--sidebar-text-color);
        --app-header-border-bottom: 1px solid var(--divider-color);
      }

      .gallery-sidebar-section {
        color: var(--sidebar-text-color);
        box-sizing: border-box;
        margin: 0 var(--ha-space-1) var(--ha-space-1);
        overflow-x: hidden;
        border-radius: var(--ha-border-radius-sm);
        --expansion-panel-summary-padding: 0 var(--ha-space-2);
      }

      .gallery-sidebar-section::part(summary) {
        min-height: var(--ha-space-10);
        border-radius: var(--ha-border-radius-sm);
        box-sizing: border-box;
      }

      .gallery-sidebar-section .gallery-nav-item {
        margin-inline-start: var(--ha-space-4);
        width: var(--ha-sidebar-expanded-section-item-width, 248px);
      }

      .gallery-sidebar-subheader {
        margin: var(--ha-space-2) var(--ha-space-4) var(--ha-space-1);
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
        font-weight: var(--ha-font-weight-medium);
        line-height: var(--ha-line-height-condensed);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .gallery-sidebar-icon,
      .gallery-nav-item ha-svg-icon[slot="start"] {
        color: var(--sidebar-icon-color);
        flex-shrink: 0;
        height: var(--ha-space-6);
        width: var(--ha-space-6);
      }

      .gallery-sidebar-icon {
        margin-inline-end: var(--ha-space-3);
      }

      .gallery-nav-item,
      .gallery-settings-item {
        flex-shrink: 0;
        margin: 0 var(--ha-space-1) var(--ha-space-1);
        border-radius: var(--ha-border-radius-sm);
        --ha-row-item-min-height: var(--ha-space-10);
        --ha-row-item-padding-block: 0;
        --ha-row-item-padding-inline: var(--ha-space-3);
        position: relative;
        width: var(--ha-sidebar-expanded-item-width, 248px);
        color: var(--sidebar-text-color);
      }

      .gallery-nav-item.has-icon,
      .gallery-settings-item {
        --ha-row-item-gap: var(--ha-space-3);
        --ha-row-item-padding-inline: var(--ha-space-2) var(--ha-space-3);
      }

      .gallery-nav-item::part(headline),
      .gallery-settings-item::part(headline) {
        color: inherit;
      }

      .gallery-nav-item[selected],
      .gallery-settings-item[selected] {
        color: var(--sidebar-selected-icon-color);
      }

      .gallery-nav-item[selected]::before,
      .gallery-settings-item[selected]::before {
        border-radius: var(--ha-border-radius-sm);
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        pointer-events: none;
        content: "";
        background-color: var(--sidebar-selected-icon-color);
        opacity: var(--dark-divider-opacity);
      }

      .gallery-settings-item ha-svg-icon[slot="start"] {
        color: var(--sidebar-icon-color);
        flex-shrink: 0;
        height: var(--ha-space-6);
        width: var(--ha-space-6);
      }

      .gallery-settings-item[selected] ha-svg-icon[slot="start"] {
        color: var(--sidebar-selected-icon-color);
      }

      .gallery-nav-item[selected] ha-svg-icon[slot="start"] {
        color: var(--sidebar-selected-icon-color);
      }

      .app-content {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background: var(--primary-background-color);
      }

      ha-drawer[type="dismissible"][open] ha-top-app-bar-fixed {
        --ha-top-app-bar-width: calc(100% - var(--ha-sidebar-width));
      }

      .content {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        flex: 1;
        padding-top: var(--ha-space-4);
      }

      page-description {
        display: block;
        margin: 0 var(--ha-space-4) var(--ha-space-4);
      }

      .page-footer {
        display: flex;
        border-radius: var(--ha-border-radius-lg);
        background-color: var(--primary-background-color);
      }

      .edit-docs {
        flex: 1;
        text-align: center;
        margin: 16px;
        padding: 16px;
      }

      .page-footer div {
        margin-top: 4px;
      }

      .page-footer .header {
        font-size: var(--ha-font-size-l);
        font-weight: var(--ha-font-weight-medium);
        line-height: var(--ha-line-height-normal);
        text-align: center;
      }

      .page-footer .secondary {
        line-height: var(--ha-line-height-normal);
        text-align: center;
      }

      .page-footer a {
        display: inline-block;
        margin: 0 8px;
        text-decoration: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-gallery": HaGallery;
  }
}
