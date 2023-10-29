import "@material/mwc-button/mwc-button";
import {
  mdiBell,
  mdiCalendar,
  mdiCellphoneCog,
  mdiChartBox,
  mdiClipboardList,
  mdiClose,
  mdiCog,
  mdiFormatListBulletedType,
  mdiHammer,
  mdiLightningBolt,
  mdiMenu,
  mdiMenuOpen,
  mdiPlayBoxMultiple,
  mdiPlus,
  mdiTooltipAccount,
  mdiViewDashboard,
} from "@mdi/js";
import "@polymer/paper-item/paper-icon-item";
import type { PaperIconItemElement } from "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  CSSResult,
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, eventOptions, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { guard } from "lit/directives/guard";
import memoizeOne from "memoize-one";
import { storage } from "../common/decorators/storage";
import { fireEvent } from "../common/dom/fire_event";
import { toggleAttribute } from "../common/dom/toggle_attribute";
import { stringCompare } from "../common/string/compare";
import { computeRTL } from "../common/util/compute_rtl";
import { throttle } from "../common/util/throttle";
import { ActionHandlerDetail } from "../data/lovelace";
import {
  PersistentNotification,
  subscribeNotifications,
} from "../data/persistent_notification";
import { subscribeRepairsIssueRegistry } from "../data/repairs";
import { UpdateEntity, updateCanInstall } from "../data/update";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { actionHandler } from "../panels/lovelace/common/directives/action-handler-directive";
import type { SortableInstance } from "../resources/sortable";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant, PanelInfo, Route } from "../types";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-menu-button";
import "./ha-svg-icon";
import "./user/ha-user-badge";

const SHOW_AFTER_SPACER = ["config", "developer-tools"];

const SUPPORT_SCROLL_IF_NEEDED = "scrollIntoViewIfNeeded" in document.body;

const SORT_VALUE_URL_PATHS = {
  energy: 1,
  map: 2,
  logbook: 3,
  history: 4,
  "developer-tools": 9,
  config: 11,
};

const PANEL_ICONS = {
  calendar: mdiCalendar,
  "developer-tools": mdiHammer,
  energy: mdiLightningBolt,
  history: mdiChartBox,
  logbook: mdiFormatListBulletedType,
  lovelace: mdiViewDashboard,
  map: mdiTooltipAccount,
  "media-browser": mdiPlayBoxMultiple,
  todo: mdiClipboardList,
};

const panelSorter = (
  reverseSort: string[],
  defaultPanel: string,
  a: PanelInfo,
  b: PanelInfo,
  language: string
) => {
  const indexA = reverseSort.indexOf(a.url_path);
  const indexB = reverseSort.indexOf(b.url_path);
  if (indexA !== indexB) {
    if (indexA < indexB) {
      return 1;
    }
    return -1;
  }
  return defaultPanelSorter(defaultPanel, a, b, language);
};

const defaultPanelSorter = (
  defaultPanel: string,
  a: PanelInfo,
  b: PanelInfo,
  language: string
) => {
  // Put all the Lovelace at the top.
  const aLovelace = a.component_name === "lovelace";
  const bLovelace = b.component_name === "lovelace";

  if (a.url_path === defaultPanel) {
    return -1;
  }
  if (b.url_path === defaultPanel) {
    return 1;
  }

  if (aLovelace && bLovelace) {
    return stringCompare(a.title!, b.title!, language);
  }
  if (aLovelace && !bLovelace) {
    return -1;
  }
  if (bLovelace) {
    return 1;
  }

  const aBuiltIn = a.url_path in SORT_VALUE_URL_PATHS;
  const bBuiltIn = b.url_path in SORT_VALUE_URL_PATHS;

  if (aBuiltIn && bBuiltIn) {
    return SORT_VALUE_URL_PATHS[a.url_path] - SORT_VALUE_URL_PATHS[b.url_path];
  }
  if (aBuiltIn) {
    return -1;
  }
  if (bBuiltIn) {
    return 1;
  }
  // both not built in, sort by title
  return stringCompare(a.title!, b.title!, language);
};

const computePanels = memoizeOne(
  (
    panels: HomeAssistant["panels"],
    defaultPanel: HomeAssistant["defaultPanel"],
    panelsOrder: string[],
    hiddenPanels: string[],
    locale: HomeAssistant["locale"]
  ): [PanelInfo[], PanelInfo[]] => {
    if (!panels) {
      return [[], []];
    }

    const beforeSpacer: PanelInfo[] = [];
    const afterSpacer: PanelInfo[] = [];

    Object.values(panels).forEach((panel) => {
      if (
        hiddenPanels.includes(panel.url_path) ||
        (!panel.title && panel.url_path !== defaultPanel)
      ) {
        return;
      }
      (SHOW_AFTER_SPACER.includes(panel.url_path)
        ? afterSpacer
        : beforeSpacer
      ).push(panel);
    });

    const reverseSort = [...panelsOrder].reverse();

    beforeSpacer.sort((a, b) =>
      panelSorter(reverseSort, defaultPanel, a, b, locale.language)
    );
    afterSpacer.sort((a, b) =>
      panelSorter(reverseSort, defaultPanel, a, b, locale.language)
    );

    return [beforeSpacer, afterSpacer];
  }
);

@customElement("ha-sidebar")
class HaSidebar extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property() public route!: Route;

  @property({ type: Boolean }) public alwaysExpand = false;

  @property({ type: Boolean }) public editMode = false;

  @state() private _notifications?: PersistentNotification[];

  @state() private _updatesCount = 0;

  @state() private _issuesCount = 0;

  @state() private _renderEmptySortable = false;

  private _mouseLeaveTimeout?: number;

  private _tooltipHideTimeout?: number;

  private _recentKeydownActiveUntil = 0;

  private sortableStyleLoaded = false;

  @storage({
    key: "sidebarPanelOrder",
    state: true,
    subscribe: true,
  })
  private _panelOrder: string[] = [];

  @storage({
    key: "sidebarHiddenPanels",
    state: true,
    subscribe: true,
  })
  private _hiddenPanels: string[] = [];

  private _sortable?: SortableInstance;

  public hassSubscribe(): UnsubscribeFunc[] {
    return this.hass.user?.is_admin
      ? [
          subscribeRepairsIssueRegistry(this.hass.connection!, (repairs) => {
            this._issuesCount = repairs.issues.filter(
              (issue) => !issue.ignored
            ).length;
          }),
        ]
      : [];
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    // prettier-ignore
    return html`
      ${this._renderHeader()}
      ${this._renderAllPanels()}
      ${this._renderDivider()}
      ${this._renderNotifications()}
      ${this._renderUserItem()}
      <div disabled class="bottom-spacer"></div>
      <div class="tooltip"></div>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (
      changedProps.has("expanded") ||
      changedProps.has("narrow") ||
      changedProps.has("alwaysExpand") ||
      changedProps.has("_externalConfig") ||
      changedProps.has("_updatesCount") ||
      changedProps.has("_issuesCount") ||
      changedProps.has("_notifications") ||
      changedProps.has("editMode") ||
      changedProps.has("_renderEmptySortable") ||
      changedProps.has("_hiddenPanels") ||
      (changedProps.has("_panelOrder") && !this.editMode)
    ) {
      return true;
    }
    if (!this.hass || !changedProps.has("hass")) {
      return false;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant;
    if (!oldHass) {
      return true;
    }
    const hass = this.hass;
    return (
      hass.panels !== oldHass.panels ||
      hass.panelUrl !== oldHass.panelUrl ||
      hass.user !== oldHass.user ||
      hass.localize !== oldHass.localize ||
      hass.locale !== oldHass.locale ||
      hass.states !== oldHass.states ||
      hass.defaultPanel !== oldHass.defaultPanel
    );
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    subscribeNotifications(this.hass.connection, (notifications) => {
      this._notifications = notifications;
    });
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("alwaysExpand")) {
      toggleAttribute(this, "expanded", this.alwaysExpand);
    }
    if (changedProps.has("editMode")) {
      if (this.editMode) {
        this._activateEditMode();
      } else {
        this._deactivateEditMode();
      }
    }
    if (!changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass || oldHass.locale !== this.hass.locale) {
      toggleAttribute(this, "rtl", computeRTL(this.hass));
    }

    this._calculateCounts();

    if (!SUPPORT_SCROLL_IF_NEEDED) {
      return;
    }
    if (!oldHass || oldHass.panelUrl !== this.hass.panelUrl) {
      const selectedEl = this.shadowRoot!.querySelector(".iron-selected");
      if (selectedEl) {
        // @ts-ignore
        selectedEl.scrollIntoViewIfNeeded();
      }
    }
  }

  private _calculateCounts = throttle(() => {
    let updateCount = 0;

    for (const entityId of Object.keys(this.hass.states)) {
      if (
        entityId.startsWith("update.") &&
        updateCanInstall(this.hass.states[entityId] as UpdateEntity)
      ) {
        updateCount++;
      }
    }

    this._updatesCount = updateCount;
  }, 5000);

  private _renderHeader() {
    return html`<div
      class="menu"
      @action=${this._handleAction}
      .actionHandler=${actionHandler({
        hasHold: !this.editMode,
        disabled: this.editMode,
      })}
    >
      ${!this.narrow
        ? html`
            <ha-icon-button
              .label=${this.hass.localize("ui.sidebar.sidebar_toggle")}
              .path=${this.hass.dockedSidebar === "docked"
                ? mdiMenuOpen
                : mdiMenu}
              @action=${this._toggleSidebar}
            ></ha-icon-button>
          `
        : ""}
      ${this.editMode
        ? html`<mwc-button outlined @click=${this._closeEditMode}>
            ${this.hass.localize("ui.sidebar.done")}
          </mwc-button>`
        : html`<div class="title">Home Assistant</div>`}
    </div>`;
  }

  private _renderAllPanels() {
    const [beforeSpacer, afterSpacer] = computePanels(
      this.hass.panels,
      this.hass.defaultPanel,
      this._panelOrder,
      this._hiddenPanels,
      this.hass.locale
    );

    // Show the supervisor as beeing part of configuration
    const selectedPanel = this.route.path?.startsWith("/hassio/")
      ? "config"
      : this.hass.panelUrl;

    // prettier-ignore
    return html`
      <paper-listbox
        attr-for-selected="data-panel"
        class="ha-scrollbar"
        .selected=${selectedPanel}
        @focusin=${this._listboxFocusIn}
        @focusout=${this._listboxFocusOut}
        @scroll=${this._listboxScroll}
        @keydown=${this._listboxKeydown}
      >
        ${this.editMode
          ? this._renderPanelsEdit(beforeSpacer)
          : this._renderPanels(beforeSpacer)}
        ${this._renderSpacer()}
        ${this._renderPanels(afterSpacer)}
        ${this._renderExternalConfiguration()}
      </paper-listbox>
    `;
  }

  private _renderPanels(panels: PanelInfo[]) {
    return panels.map((panel) =>
      this._renderPanel(
        panel.url_path,
        panel.url_path === this.hass.defaultPanel
          ? panel.title || this.hass.localize("panel.states")
          : this.hass.localize(`panel.${panel.title}`) || panel.title,
        panel.icon,
        panel.url_path === this.hass.defaultPanel && !panel.icon
          ? PANEL_ICONS.lovelace
          : panel.url_path in PANEL_ICONS
          ? PANEL_ICONS[panel.url_path]
          : undefined
      )
    );
  }

  private _renderPanel(
    urlPath: string,
    title: string | null,
    icon?: string | null,
    iconPath?: string | null
  ) {
    return urlPath === "config"
      ? this._renderConfiguration(title)
      : html`
          <a
            role="option"
            href=${`/${urlPath}`}
            data-panel=${urlPath}
            tabindex="-1"
            @mouseenter=${this._itemMouseEnter}
            @mouseleave=${this._itemMouseLeave}
          >
            <paper-icon-item>
              ${iconPath
                ? html`<ha-svg-icon
                    slot="item-icon"
                    .path=${iconPath}
                  ></ha-svg-icon>`
                : html`<ha-icon slot="item-icon" .icon=${icon}></ha-icon>`}
              <span class="item-text">${title}</span>
            </paper-icon-item>
            ${this.editMode
              ? html`<ha-icon-button
                  .label=${this.hass.localize("ui.sidebar.hide_panel")}
                  .path=${mdiClose}
                  class="hide-panel"
                  .panel=${urlPath}
                  @click=${this._hidePanel}
                ></ha-icon-button>`
              : ""}
          </a>
        `;
  }

  private _renderPanelsEdit(beforeSpacer: PanelInfo[]) {
    // prettier-ignore
    return html`<div id="sortable">
        ${guard([this._hiddenPanels, this._renderEmptySortable], () =>
          this._renderEmptySortable ? "" : this._renderPanels(beforeSpacer)
        )}
      </div>
      ${this._renderSpacer()}
      ${this._renderHiddenPanels()} `;
  }

  private _renderHiddenPanels() {
    return html`${this._hiddenPanels.length
      ? html`${this._hiddenPanels.map((url) => {
          const panel = this.hass.panels[url];
          if (!panel) {
            return "";
          }
          return html`<paper-icon-item
            @click=${this._unhidePanel}
            class="hidden-panel"
            .panel=${url}
          >
            ${panel.url_path === this.hass.defaultPanel && !panel.icon
              ? html`<ha-svg-icon
                  slot="item-icon"
                  .path=${PANEL_ICONS.lovelace}
                ></ha-svg-icon>`
              : panel.url_path in PANEL_ICONS
              ? html`<ha-svg-icon
                  slot="item-icon"
                  .path=${PANEL_ICONS[panel.url_path]}
                ></ha-svg-icon>`
              : html`<ha-icon slot="item-icon" .icon=${panel.icon}></ha-icon>`}
            <span class="item-text"
              >${panel.url_path === this.hass.defaultPanel
                ? this.hass.localize("panel.states")
                : this.hass.localize(`panel.${panel.title}`) ||
                  panel.title}</span
            >
            <ha-icon-button
              .label=${this.hass.localize("ui.sidebar.show_panel")}
              .path=${mdiPlus}
              class="show-panel"
            ></ha-icon-button>
          </paper-icon-item>`;
        })}
        ${this._renderSpacer()}`
      : ""}`;
  }

  private _renderDivider() {
    return html`<div class="divider"></div>`;
  }

  private _renderSpacer() {
    return html`<div class="spacer" disabled></div>`;
  }

  private _renderConfiguration(title: string | null) {
    return html`<a
      class="configuration-container"
      role="option"
      href="/config"
      data-panel="config"
      tabindex="-1"
      @mouseenter=${this._itemMouseEnter}
      @mouseleave=${this._itemMouseLeave}
    >
      <paper-icon-item class="configuration" role="option">
        <ha-svg-icon slot="item-icon" .path=${mdiCog}></ha-svg-icon>
        ${!this.alwaysExpand &&
        (this._updatesCount > 0 || this._issuesCount > 0)
          ? html`
              <span class="configuration-badge" slot="item-icon">
                ${this._updatesCount + this._issuesCount}
              </span>
            `
          : ""}
        <span class="item-text">${title}</span>
        ${this.alwaysExpand && (this._updatesCount > 0 || this._issuesCount > 0)
          ? html`
              <span class="configuration-badge"
                >${this._updatesCount + this._issuesCount}</span
              >
            `
          : ""}
      </paper-icon-item>
    </a>`;
  }

  private _renderNotifications() {
    const notificationCount = this._notifications
      ? this._notifications.length
      : 0;

    return html`<div
      class="notifications-container"
      @mouseenter=${this._itemMouseEnter}
      @mouseleave=${this._itemMouseLeave}
    >
      <paper-icon-item
        class="notifications"
        role="option"
        @click=${this._handleShowNotificationDrawer}
      >
        <ha-svg-icon slot="item-icon" .path=${mdiBell}></ha-svg-icon>
        ${!this.alwaysExpand && notificationCount > 0
          ? html`
              <span class="notification-badge" slot="item-icon">
                ${notificationCount}
              </span>
            `
          : ""}
        <span class="item-text">
          ${this.hass.localize("ui.notification_drawer.title")}
        </span>
        ${this.alwaysExpand && notificationCount > 0
          ? html` <span class="notification-badge">${notificationCount}</span> `
          : ""}
      </paper-icon-item>
    </div>`;
  }

  private _renderUserItem() {
    return html`<a
      class=${classMap({
        profile: true,
        // Mimick behavior that paper-listbox provides
        "iron-selected": this.hass.panelUrl === "profile",
      })}
      href="/profile"
      data-panel="panel"
      tabindex="-1"
      role="option"
      aria-label=${this.hass.localize("panel.profile")}
      @mouseenter=${this._itemMouseEnter}
      @mouseleave=${this._itemMouseLeave}
    >
      <paper-icon-item>
        <ha-user-badge
          slot="item-icon"
          .user=${this.hass.user}
          .hass=${this.hass}
        ></ha-user-badge>

        <span class="item-text">
          ${this.hass.user ? this.hass.user.name : ""}
        </span>
      </paper-icon-item>
    </a>`;
  }

  private _renderExternalConfiguration() {
    return html`${!this.hass.user?.is_admin &&
    this.hass.auth.external?.config.hasSettingsScreen
      ? html`
          <a
            role="option"
            aria-label=${this.hass.localize(
              "ui.sidebar.external_app_configuration"
            )}
            href="#external-app-configuration"
            tabindex="-1"
            @click=${this._handleExternalAppConfiguration}
            @mouseenter=${this._itemMouseEnter}
            @mouseleave=${this._itemMouseLeave}
          >
            <paper-icon-item>
              <ha-svg-icon
                slot="item-icon"
                .path=${mdiCellphoneCog}
              ></ha-svg-icon>
              <span class="item-text">
                ${this.hass.localize("ui.sidebar.external_app_configuration")}
              </span>
            </paper-icon-item>
          </a>
        `
      : ""}`;
  }

  private _handleExternalAppConfiguration(ev: Event) {
    ev.preventDefault();
    this.hass.auth.external!.fireMessage({
      type: "config_screen/show",
    });
  }

  private get _tooltip() {
    return this.shadowRoot!.querySelector(".tooltip")! as HTMLDivElement;
  }

  private _handleAction(ev: CustomEvent<ActionHandlerDetail>) {
    if (ev.detail.action !== "hold") {
      return;
    }

    fireEvent(this, "hass-edit-sidebar", { editMode: true });
  }

  private async _activateEditMode() {
    await Promise.all([this._loadSortableStyle(), this._createSortable()]);
  }

  private async _loadSortableStyle() {
    if (this.sortableStyleLoaded) return;

    const sortStylesImport = await import("../resources/ha-sortable-style");

    const style = document.createElement("style");
    style.innerHTML = (sortStylesImport.sortableStyles as CSSResult).cssText;
    this.shadowRoot!.appendChild(style);

    this.sortableStyleLoaded = true;
    await this.updateComplete;
  }

  private async _createSortable() {
    const Sortable = (await import("../resources/sortable")).default;
    this._sortable = new Sortable(
      this.shadowRoot!.getElementById("sortable")!,
      {
        animation: 150,
        fallbackClass: "sortable-fallback",
        dataIdAttr: "data-panel",
        handle: "paper-icon-item",
        onSort: async () => {
          this._panelOrder = this._sortable!.toArray();
        },
      }
    );
  }

  private _deactivateEditMode() {
    this._sortable?.destroy();
    this._sortable = undefined;
  }

  private _closeEditMode() {
    fireEvent(this, "hass-edit-sidebar", { editMode: false });
  }

  private async _hidePanel(ev: Event) {
    ev.preventDefault();
    const panel = (ev.currentTarget as any).panel;
    if (this._hiddenPanels.includes(panel)) {
      return;
    }
    // Make a copy for Memoize
    this._hiddenPanels = [...this._hiddenPanels, panel];
    this._renderEmptySortable = true;
    await this.updateComplete;
    const container = this.shadowRoot!.getElementById("sortable")!;
    while (container.lastElementChild) {
      container.removeChild(container.lastElementChild);
    }
    this._renderEmptySortable = false;
  }

  private async _unhidePanel(ev: Event) {
    ev.preventDefault();
    const panel = (ev.currentTarget as any).panel;
    this._hiddenPanels = this._hiddenPanels.filter(
      (hidden) => hidden !== panel
    );
    this._renderEmptySortable = true;
    await this.updateComplete;
    const container = this.shadowRoot!.getElementById("sortable")!;
    while (container.lastElementChild) {
      container.removeChild(container.lastElementChild);
    }
    this._renderEmptySortable = false;
  }

  private _itemMouseEnter(ev: MouseEvent) {
    // On keypresses on the listbox, we're going to ignore mouse enter events
    // for 100ms so that we ignore it when pressing down arrow scrolls the
    // sidebar causing the mouse to hover a new icon
    if (
      this.alwaysExpand ||
      new Date().getTime() < this._recentKeydownActiveUntil
    ) {
      return;
    }
    if (this._mouseLeaveTimeout) {
      clearTimeout(this._mouseLeaveTimeout);
      this._mouseLeaveTimeout = undefined;
    }
    this._showTooltip(ev.currentTarget as PaperIconItemElement);
  }

  private _itemMouseLeave() {
    if (this._mouseLeaveTimeout) {
      clearTimeout(this._mouseLeaveTimeout);
    }
    this._mouseLeaveTimeout = window.setTimeout(() => {
      this._hideTooltip();
    }, 500);
  }

  private _listboxFocusIn(ev) {
    if (this.alwaysExpand || ev.target.nodeName !== "A") {
      return;
    }
    this._showTooltip(ev.target.querySelector("paper-icon-item"));
  }

  private _listboxFocusOut() {
    this._hideTooltip();
  }

  @eventOptions({
    passive: true,
  })
  private _listboxScroll() {
    // On keypresses on the listbox, we're going to ignore scroll events
    // for 100ms so that if pressing down arrow scrolls the sidebar, the tooltip
    // will not be hidden.
    if (new Date().getTime() < this._recentKeydownActiveUntil) {
      return;
    }
    this._hideTooltip();
  }

  private _listboxKeydown() {
    this._recentKeydownActiveUntil = new Date().getTime() + 100;
  }

  private _showTooltip(item: PaperIconItemElement) {
    if (this._tooltipHideTimeout) {
      clearTimeout(this._tooltipHideTimeout);
      this._tooltipHideTimeout = undefined;
    }
    const tooltip = this._tooltip;
    const listbox = this.shadowRoot!.querySelector("paper-listbox")!;
    let top = item.offsetTop + 11;
    if (listbox.contains(item)) {
      top -= listbox.scrollTop;
    }
    tooltip.innerHTML = item.querySelector(".item-text")!.innerHTML;
    tooltip.style.display = "block";
    tooltip.style.position = "fixed";
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${item.offsetLeft + item.clientWidth + 4}px`;
  }

  private _hideTooltip() {
    // Delay it a little in case other events are pending processing.
    if (!this._tooltipHideTimeout) {
      this._tooltipHideTimeout = window.setTimeout(() => {
        this._tooltipHideTimeout = undefined;
        this._tooltip.style.display = "none";
      }, 10);
    }
  }

  private _handleShowNotificationDrawer() {
    fireEvent(this, "hass-show-notifications");
  }

  private _toggleSidebar(ev: CustomEvent) {
    if (ev.detail.action !== "tap") {
      return;
    }
    fireEvent(this, "hass-toggle-menu");
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        :host {
          overflow: visible;
          height: 100%;
          display: block;
          overflow: hidden;
          -ms-user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          background-color: var(--sidebar-background-color);
          width: 100%;
          box-sizing: border-box;
        }
        .menu {
          height: var(--header-height);
          box-sizing: border-box;
          display: flex;
          padding: 0 4px;
          border-bottom: 1px solid transparent;
          white-space: nowrap;
          font-weight: 400;
          color: var(--sidebar-menu-button-text-color, --primary-text-color);
          border-bottom: 1px solid var(--divider-color);
          background-color: var(
            --sidebar-menu-button-background-color,
            --primary-background-color
          );
          font-size: 20px;
          align-items: center;
          padding-left: calc(4px + env(safe-area-inset-left));
        }
        :host([rtl]) .menu {
          padding-left: 4px;
          padding-right: calc(4px + env(safe-area-inset-right));
        }
        :host([expanded]) .menu {
          width: calc(256px + env(safe-area-inset-left));
        }
        :host([rtl][expanded]) .menu {
          width: calc(256px + env(safe-area-inset-right));
        }
        .menu ha-icon-button {
          color: var(--sidebar-icon-color);
        }
        .title {
          margin-left: 19px;
          width: 100%;
          display: none;
        }
        :host([rtl]) .title {
          margin-left: 0;
          margin-right: 19px;
        }
        :host([narrow]) .title {
          margin: 0;
          padding: 0 16px;
        }
        :host([expanded]) .title {
          display: initial;
        }
        :host([expanded]) .menu mwc-button {
          margin: 0 8px;
        }
        .menu mwc-button {
          width: 100%;
        }
        #sortable,
        .hidden-panel {
          display: none;
        }

        paper-listbox {
          padding: 4px 0;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          height: calc(100% - var(--header-height) - 132px);
          height: calc(
            100% - var(--header-height) - 132px - env(safe-area-inset-bottom)
          );
          overflow-x: hidden;
          background: none;
          margin-left: env(safe-area-inset-left);
        }

        :host([rtl]) paper-listbox {
          margin-left: initial;
          margin-right: env(safe-area-inset-right);
        }

        a {
          text-decoration: none;
          color: var(--sidebar-text-color);
          font-weight: 500;
          font-size: 14px;
          position: relative;
          display: block;
          outline: 0;
        }

        paper-icon-item {
          box-sizing: border-box;
          margin: 4px;
          padding-left: 12px;
          border-radius: 4px;
          --paper-item-min-height: 40px;
          width: 48px;
        }
        :host([expanded]) paper-icon-item {
          width: 248px;
        }
        :host([rtl]) paper-icon-item {
          padding-left: auto;
          padding-right: 12px;
        }

        ha-icon[slot="item-icon"],
        ha-svg-icon[slot="item-icon"] {
          color: var(--sidebar-icon-color);
        }

        .iron-selected paper-icon-item::before,
        a:not(.iron-selected):focus::before {
          border-radius: 4px;
          position: absolute;
          top: 0;
          right: 2px;
          bottom: 0;
          left: 2px;
          pointer-events: none;
          content: "";
          transition: opacity 15ms linear;
          will-change: opacity;
        }
        .iron-selected paper-icon-item::before {
          background-color: var(--sidebar-selected-icon-color);
          opacity: 0.12;
        }
        a:not(.iron-selected):focus::before {
          background-color: currentColor;
          opacity: var(--dark-divider-opacity);
          margin: 4px 8px;
        }
        .iron-selected paper-icon-item:focus::before,
        .iron-selected:focus paper-icon-item::before {
          opacity: 0.2;
        }

        .iron-selected paper-icon-item[pressed]:before {
          opacity: 0.37;
        }

        paper-icon-item span {
          color: var(--sidebar-text-color);
          font-weight: 500;
          font-size: 14px;
        }

        a.iron-selected paper-icon-item ha-icon,
        a.iron-selected paper-icon-item ha-svg-icon {
          color: var(--sidebar-selected-icon-color);
        }

        a.iron-selected .item-text {
          color: var(--sidebar-selected-text-color);
        }

        paper-icon-item .item-text {
          display: none;
          max-width: calc(100% - 56px);
        }
        :host([expanded]) paper-icon-item .item-text {
          display: block;
        }

        .divider {
          bottom: 112px;
          padding: 10px 0;
        }
        .divider::before {
          content: " ";
          display: block;
          height: 1px;
          background-color: var(--divider-color);
        }
        .notifications-container,
        .configuration-container {
          display: flex;
          margin-left: env(safe-area-inset-left);
        }
        :host([rtl]) .notifications-container,
        :host([rtl]) .configuration-container {
          margin-left: initial;
          margin-right: env(safe-area-inset-right);
        }
        .notifications {
          cursor: pointer;
        }
        .notifications .item-text,
        .configuration .item-text {
          flex: 1;
        }
        .profile {
          margin-left: env(safe-area-inset-left);
        }
        :host([rtl]) .profile {
          margin-left: initial;
          margin-right: env(safe-area-inset-right);
        }
        .profile paper-icon-item {
          padding-left: 4px;
        }
        :host([rtl]) .profile paper-icon-item {
          padding-left: auto;
          padding-right: 4px;
        }
        .profile .item-text {
          margin-left: 8px;
        }
        :host([rtl]) .profile .item-text {
          margin-right: 8px;
        }

        .notification-badge,
        .configuration-badge {
          position: absolute;
          left: calc(var(--app-drawer-width, 248px) - 42px);
          min-width: 20px;
          box-sizing: border-box;
          border-radius: 50%;
          font-weight: 400;
          background-color: var(--accent-color);
          line-height: 20px;
          text-align: center;
          padding: 0px 2px;
          color: var(--text-accent-color, var(--text-primary-color));
        }
        ha-svg-icon + .notification-badge,
        ha-svg-icon + .configuration-badge {
          position: absolute;
          bottom: 14px;
          left: 26px;
          font-size: 0.65em;
        }

        .spacer {
          flex: 1;
          pointer-events: none;
        }

        .subheader {
          color: var(--sidebar-text-color);
          font-weight: 500;
          font-size: 14px;
          padding: 16px;
          white-space: nowrap;
        }

        .dev-tools {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          padding: 0 8px;
          width: 256px;
          box-sizing: border-box;
        }

        .dev-tools a {
          color: var(--sidebar-icon-color);
        }

        .tooltip {
          display: none;
          position: absolute;
          opacity: 0.9;
          border-radius: 2px;
          white-space: nowrap;
          color: var(--sidebar-background-color);
          background-color: var(--sidebar-text-color);
          padding: 4px;
          font-weight: 500;
        }

        :host([rtl]) .menu ha-icon-button {
          -webkit-transform: scaleX(-1);
          transform: scaleX(-1);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sidebar": HaSidebar;
  }
}
