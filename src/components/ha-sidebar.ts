import {
  mdiBell,
  mdiCellphoneCog,
  mdiCog,
  mdiMenu,
  mdiMenuOpen,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
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
import { fireEvent } from "../common/dom/fire_event";
import { toggleAttribute } from "../common/dom/toggle_attribute";
import { stringCompare } from "../common/string/compare";
import { computeRTL } from "../common/util/compute_rtl";
import { throttle } from "../common/util/throttle";
import { subscribeFrontendUserData } from "../data/frontend";
import type { ActionHandlerDetail } from "../data/lovelace/action_handler";
import {
  FIXED_PANELS,
  getDefaultPanelUrlPath,
  getPanelIcon,
  getPanelIconPath,
  getPanelTitle,
  SHOW_AFTER_SPACER_PANELS,
} from "../data/panel";
import type { PersistentNotification } from "../data/persistent_notification";
import { subscribeNotifications } from "../data/persistent_notification";
import { subscribeRepairsIssueRegistry } from "../data/repairs";
import type { UpdateEntity } from "../data/update";
import { updateCanInstall } from "../data/update";
import { showEditSidebarDialog } from "../dialogs/sidebar/show-dialog-edit-sidebar";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { actionHandler } from "../panels/lovelace/common/directives/action-handler-directive";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant, PanelInfo, Route } from "../types";
import "./ha-fade-in";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-md-list";
import "./ha-md-list-item";
import type { HaMdListItem } from "./ha-md-list-item";
import "./ha-spinner";
import "./ha-svg-icon";
import "./user/ha-user-badge";

const SUPPORT_SCROLL_IF_NEEDED = "scrollIntoViewIfNeeded" in document.body;

const SORT_VALUE_URL_PATHS = {
  energy: 1,
  map: 2,
  logbook: 3,
  history: 4,
  "developer-tools": 9,
  config: 11,
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

export const computePanels = memoizeOne(
  (
    panels: HomeAssistant["panels"],
    defaultPanel: string,
    panelsOrder: string[],
    hiddenPanels: string[],
    locale: HomeAssistant["locale"]
  ): [PanelInfo[], PanelInfo[]] => {
    if (!panels) {
      return [[], []];
    }

    const beforeSpacer: PanelInfo[] = [];
    const afterSpacer: PanelInfo[] = [];

    const allPanels = Object.values(panels).filter(
      (panel) => !FIXED_PANELS.includes(panel.url_path)
    );

    allPanels.forEach((panel) => {
      const isDefaultPanel = panel.url_path === defaultPanel;

      if (
        !isDefaultPanel &&
        (!panel.title ||
          hiddenPanels.includes(panel.url_path) ||
          (panel.default_visible === false &&
            !panelsOrder.includes(panel.url_path)))
      ) {
        return;
      }
      (SHOW_AFTER_SPACER_PANELS.includes(panel.url_path)
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

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: "always-expand", type: Boolean })
  public alwaysExpand = false;

  @state() private _notifications?: PersistentNotification[];

  @state() private _updatesCount = 0;

  @state() private _issuesCount = 0;

  @state() private _panelOrder?: string[];

  @state() private _hiddenPanels?: string[];

  private _mouseLeaveTimeout?: number;

  private _touchendTimeout?: number;

  private _tooltipHideTimeout?: number;

  private _recentKeydownActiveUntil = 0;

  private _unsubPersistentNotifications: UnsubscribeFunc | undefined;

  @query(".tooltip") private _tooltip!: HTMLDivElement;

  public hassSubscribe() {
    return [
      subscribeFrontendUserData(
        this.hass.connection,
        "sidebar",
        ({ value }) => {
          this._panelOrder = value?.panelOrder;
          this._hiddenPanels = value?.hiddenPanels;

          // fallback to old localStorage values
          if (!this._panelOrder) {
            const storedOrder = localStorage.getItem("sidebarPanelOrder");
            this._panelOrder = storedOrder ? JSON.parse(storedOrder) : [];
          }
          if (!this._hiddenPanels) {
            const storedHidden = localStorage.getItem("sidebarHiddenPanels");
            this._hiddenPanels = storedHidden ? JSON.parse(storedHidden) : [];
          }
        }
      ),
      ...(this.hass.user?.is_admin
        ? [
            subscribeRepairsIssueRegistry(this.hass.connection!, (repairs) => {
              this._issuesCount = repairs.issues.filter(
                (issue) => !issue.ignored
              ).length;
            }),
          ]
        : []),
    ];
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    // clear timeouts
    clearTimeout(this._mouseLeaveTimeout);
    clearTimeout(this._tooltipHideTimeout);
    clearTimeout(this._touchendTimeout);
    // set undefined values
    this._mouseLeaveTimeout = undefined;
    this._tooltipHideTimeout = undefined;
    this._touchendTimeout = undefined;
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const selectedPanel = this.hass.panelUrl;

    // prettier-ignore
    return html`
      ${this._renderHeader()}
      ${this._renderAllPanels(selectedPanel)}
      ${this._renderDivider()}
      <ha-md-list>
        ${this._renderNotifications()}
        ${this._renderUserItem(selectedPanel)}
      </ha-md-list>
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
      changedProps.has("_hiddenPanels") ||
      changedProps.has("_panelOrder")
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
      hass.userData !== oldHass.userData ||
      hass.systemData !== oldHass.systemData ||
      hass.connected !== oldHass.connected
    );
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._subscribePersistentNotifications();
  }

  private _subscribePersistentNotifications(): void {
    if (this._unsubPersistentNotifications) {
      this._unsubPersistentNotifications();
    }
    this._unsubPersistentNotifications = subscribeNotifications(
      this.hass.connection,
      (notifications) => {
        this._notifications = notifications;
      }
    );
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("alwaysExpand")) {
      toggleAttribute(this, "expanded", this.alwaysExpand);
    }
    if (!changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (
      this.hass &&
      oldHass?.connected === false &&
      this.hass.connected === true
    ) {
      this._subscribePersistentNotifications();
    }

    this._calculateCounts();

    if (!SUPPORT_SCROLL_IF_NEEDED) {
      return;
    }
    if (oldHass?.panelUrl !== this.hass.panelUrl) {
      const selectedEl = this.shadowRoot!.querySelector(".selected");
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
        !this.hass.entities[entityId]?.hidden &&
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
        hasHold: true,
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
      <div class="title">Home Assistant</div>
    </div>`;
  }

  private _renderAllPanels(selectedPanel: string) {
    if (!this._panelOrder || !this._hiddenPanels) {
      return html`
        <ha-fade-in .delay=${500}>
          <ha-spinner size="small"></ha-spinner>
        </ha-fade-in>
      `;
    }

    const defaultPanel = getDefaultPanelUrlPath(this.hass);

    const [beforeSpacer, afterSpacer] = computePanels(
      this.hass.panels,
      defaultPanel,
      this._panelOrder,
      this._hiddenPanels,
      this.hass.locale
    );

    return html`
      <ha-md-list
        class="ha-scrollbar"
        @focusin=${this._listboxFocusIn}
        @focusout=${this._listboxFocusOut}
        @touchend=${this._listboxTouchend}
        @scroll=${this._listboxScroll}
        @keydown=${this._listboxKeydown}
      >
        ${this._renderPanels(beforeSpacer, selectedPanel)}
        ${this._renderSpacer()}
        ${this._renderPanels(afterSpacer, selectedPanel)}
        ${this.hass.user?.is_admin
          ? this._renderConfiguration(selectedPanel)
          : this._renderExternalConfiguration()}
      </ha-md-list>
    `;
  }

  private _renderPanels(panels: PanelInfo[], selectedPanel: string) {
    return panels.map((panel) =>
      this._renderPanel(panel, panel.url_path === selectedPanel)
    );
  }

  private _renderPanel(panel: PanelInfo, isSelected: boolean) {
    const title = getPanelTitle(this.hass, panel);
    const urlPath = panel.url_path;
    const icon = getPanelIcon(panel);
    const iconPath = getPanelIconPath(panel);

    return html`
      <ha-md-list-item
        .href=${`/${urlPath}`}
        type="link"
        class=${classMap({ selected: isSelected })}
        @mouseenter=${this._itemMouseEnter}
        @mouseleave=${this._itemMouseLeave}
      >
        ${iconPath
          ? html`<ha-svg-icon slot="start" .path=${iconPath}></ha-svg-icon>`
          : html`<ha-icon slot="start" .icon=${icon}></ha-icon>`}
        <span class="item-text" slot="headline">${title}</span>
      </ha-md-list-item>
    `;
  }

  private _renderDivider() {
    return html`<div class="divider"></div>`;
  }

  private _renderSpacer() {
    return html`<div class="spacer" disabled></div>`;
  }

  private _renderConfiguration(selectedPanel: string) {
    if (!this.hass.user?.is_admin) {
      return nothing;
    }
    const isSelected =
      selectedPanel === "config" || this.route.path?.startsWith("/hassio/");
    return html`
      <ha-md-list-item
        class="configuration ${classMap({ selected: isSelected })}"
        type="button"
        href="/config"
        @mouseenter=${this._itemMouseEnter}
        @mouseleave=${this._itemMouseLeave}
      >
        <ha-svg-icon slot="start" .path=${mdiCog}></ha-svg-icon>
        ${!this.alwaysExpand &&
        (this._updatesCount > 0 || this._issuesCount > 0)
          ? html`
              <span class="badge" slot="start">
                ${this._updatesCount + this._issuesCount}
              </span>
            `
          : nothing}
        <span class="item-text" slot="headline"
          >${this.hass.localize("panel.config")}</span
        >
        ${this.alwaysExpand && (this._updatesCount > 0 || this._issuesCount > 0)
          ? html`
              <span class="badge" slot="end"
                >${this._updatesCount + this._issuesCount}</span
              >
            `
          : nothing}
      </ha-md-list-item>
    `;
  }

  private _renderNotifications() {
    const notificationCount = this._notifications
      ? this._notifications.length
      : 0;

    return html`
      <ha-md-list-item
        class="notifications"
        @click=${this._handleShowNotificationDrawer}
        @mouseenter=${this._itemMouseEnter}
        @mouseleave=${this._itemMouseLeave}
        type="button"
      >
        <ha-svg-icon slot="start" .path=${mdiBell}></ha-svg-icon>
        ${!this.alwaysExpand && notificationCount > 0
          ? html`
              <span class="badge" slot="start"> ${notificationCount} </span>
            `
          : nothing}
        <span class="item-text" slot="headline"
          >${this.hass.localize("ui.notification_drawer.title")}</span
        >
        ${this.alwaysExpand && notificationCount > 0
          ? html`<span class="badge" slot="end">${notificationCount}</span>`
          : nothing}
      </ha-md-list-item>
    `;
  }

  private _renderUserItem(selectedPanel: string) {
    const isRTL = computeRTL(this.hass);
    const isSelected = selectedPanel === "profile";

    return html`
      <ha-md-list-item
        href="/profile"
        type="link"
        class=${classMap({
          user: true,
          selected: isSelected,
          rtl: isRTL,
        })}
        @mouseenter=${this._itemMouseEnter}
        @mouseleave=${this._itemMouseLeave}
      >
        <ha-user-badge
          slot="start"
          .user=${this.hass.user}
          .hass=${this.hass}
        ></ha-user-badge>
        <span class="item-text" slot="headline">
          ${this.hass.user ? this.hass.user.name : ""}
        </span>
      </ha-md-list-item>
    `;
  }

  private _renderExternalConfiguration() {
    if (!this.hass.auth.external?.config.hasSettingsScreen) {
      return nothing;
    }
    return html`
      <ha-md-list-item
        @click=${this._handleExternalAppConfiguration}
        type="button"
        @mouseenter=${this._itemMouseEnter}
        @mouseleave=${this._itemMouseLeave}
      >
        <ha-svg-icon slot="start" .path=${mdiCellphoneCog}></ha-svg-icon>
        <span class="item-text" slot="headline">
          ${this.hass.localize("ui.sidebar.external_app_configuration")}
        </span>
      </ha-md-list-item>
    `;
  }

  private _handleExternalAppConfiguration(ev: Event) {
    ev.preventDefault();
    this.hass.auth.external!.fireMessage({
      type: "config_screen/show",
    });
  }

  private _handleAction(ev: CustomEvent<ActionHandlerDetail>) {
    if (ev.detail.action !== "hold") {
      return;
    }

    showEditSidebarDialog(this);
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
    this._showTooltip(ev.currentTarget as HaMdListItem);
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
    if (this.alwaysExpand || ev.target.localName !== "ha-md-list-item") {
      return;
    }
    this._showTooltip(ev.target);
  }

  private _listboxFocusOut() {
    this._hideTooltip();
  }

  private _listboxTouchend() {
    clearTimeout(this._touchendTimeout);
    this._touchendTimeout = window.setTimeout(() => {
      // Allow 1 second for users to read the tooltip on touch devices
      this._hideTooltip();
    }, 1000);
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

  private _showTooltip(item: HaMdListItem) {
    if (this._tooltipHideTimeout) {
      clearTimeout(this._tooltipHideTimeout);
      this._tooltipHideTimeout = undefined;
    }
    const tooltip = this._tooltip;
    const allListbox = this.shadowRoot!.querySelectorAll("ha-md-list")!;
    const listbox = [...allListbox].find((lb) => lb.contains(item));

    const top =
      item.offsetTop +
      11 +
      (listbox?.offsetTop ?? 0) -
      (listbox?.scrollTop ?? 0);

    tooltip.innerText = (
      item.querySelector(".item-text") as HTMLElement
    ).innerText;
    tooltip.style.display = "block";
    tooltip.style.position = "fixed";
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `calc(${item.offsetLeft + item.clientWidth + 8}px + var(--safe-area-inset-left, var(--ha-space-0)))`;
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
          padding-bottom: calc(
            14px + var(--safe-area-inset-bottom, var(--ha-space-0))
          );
        }
        .menu {
          height: calc(
            var(--header-height) + var(--safe-area-inset-top, var(--ha-space-0))
          );
          box-sizing: border-box;
          display: flex;
          padding: 0 var(--ha-space-1);
          border-bottom: 1px solid transparent;
          white-space: nowrap;
          font-weight: var(--ha-font-weight-normal);
          color: var(
            --sidebar-menu-button-text-color,
            var(--primary-text-color)
          );
          border-bottom: 1px solid var(--divider-color);
          background-color: var(
            --sidebar-menu-button-background-color,
            inherit
          );
          font-size: var(--ha-font-size-xl);
          align-items: center;
          padding-left: calc(
            var(--ha-space-1) + var(--safe-area-inset-left, var(--ha-space-0))
          );
          padding-inline-start: calc(
            var(--ha-space-1) + var(--safe-area-inset-left, var(--ha-space-0))
          );
          padding-inline-end: initial;
          padding-top: var(--safe-area-inset-top, var(--ha-space-0));
        }
        :host([expanded]) .menu {
          width: calc(256px + var(--safe-area-inset-left, var(--ha-space-0)));
        }
        :host([narrow][expanded]) .menu {
          width: 100%;
        }
        .menu ha-icon-button {
          color: var(--sidebar-icon-color);
        }
        .title {
          margin-left: 3px;
          margin-inline-start: 3px;
          margin-inline-end: initial;
          width: 100%;
          display: none;
        }
        :host([narrow]) .title {
          margin: var(--ha-space-0);
          padding: var(--ha-space-0) var(--ha-space-4);
        }
        :host([expanded]) .title {
          display: initial;
        }
        .hidden-panel {
          display: none;
        }

        ha-fade-in,
        ha-md-list {
          height: calc(
            100% - var(--header-height) - var(
                --safe-area-inset-top,
                var(--ha-space-0)
              ) -
              132px
          );
        }

        ha-fade-in {
          padding: var(--ha-space-1) var(--ha-space-0);
          box-sizing: border-box;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        ha-md-list {
          overflow-x: hidden;
          background: none;
          margin-left: var(--safe-area-inset-left, var(--ha-space-0));
        }

        ha-md-list-item {
          flex-shrink: 0;
          box-sizing: border-box;
          margin: var(--ha-space-1);
          border-radius: var(--ha-border-radius-sm);
          --md-list-item-one-line-container-height: var(--ha-space-10);
          --md-list-item-top-space: 0;
          --md-list-item-bottom-space: 0;
          width: var(--ha-space-12);
          position: relative;
          --md-list-item-label-text-color: var(--sidebar-text-color);
          --md-list-item-leading-space: var(--ha-space-3);
          --md-list-item-trailing-space: var(--ha-space-3);
          --md-list-item-leading-icon-size: var(--ha-space-6);
        }
        :host([expanded]) ha-md-list-item {
          width: 248px;
        }
        :host([narrow][expanded]) ha-md-list-item {
          width: calc(240px - var(--safe-area-inset-left, var(--ha-space-0)));
        }

        ha-md-list-item.selected {
          --md-list-item-label-text-color: var(--sidebar-selected-icon-color);
          --md-ripple-hover-color: var(--sidebar-selected-icon-color);
        }
        ha-md-list-item.selected::before {
          border-radius: var(--ha-border-radius-sm);
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          pointer-events: none;
          content: "";
          transition: opacity 15ms linear;
          will-change: opacity;
          background-color: var(--sidebar-selected-icon-color);
          opacity: var(--dark-divider-opacity);
        }

        ha-icon[slot="start"],
        ha-svg-icon[slot="start"] {
          width: var(--ha-space-6);
          flex-shrink: 0;
          color: var(--sidebar-icon-color);
        }

        ha-md-list-item.selected ha-svg-icon[slot="start"],
        ha-md-list-item.selected ha-icon[slot="start"] {
          color: var(--sidebar-selected-icon-color);
        }

        ha-md-list-item .item-text {
          display: none;
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
        }
        :host([expanded]) ha-md-list-item .item-text {
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
        .badge {
          display: flex;
          justify-content: center;
          align-items: center;
          min-width: var(--ha-space-2);
          border-radius: var(--ha-border-radius-xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: normal;
          background-color: var(--accent-color);
          padding: 2px 6px;
          color: var(--text-accent-color, var(--text-primary-color));
        }

        ha-svg-icon + .badge {
          position: absolute;
          top: var(--ha-space-1);
          left: 26px;
          border-radius: var(--ha-border-radius-md);
          font-size: 0.65em;
          line-height: var(--ha-line-height-expanded);
          padding: var(--ha-space-0) var(--ha-space-1);
        }

        ha-md-list-item.user {
          --md-list-item-leading-icon-size: var(--ha-space-10);
          --md-list-item-leading-space: var(--ha-space-1);
        }

        ha-md-list-item.user.rtl {
          --md-list-item-leading-space: var(--ha-space-3);
        }

        ha-user-badge {
          flex-shrink: 0;
          margin-right: calc(var(--ha-space-2) * -1);
        }

        .spacer {
          flex: 1;
          pointer-events: none;
        }

        .subheader {
          color: var(--sidebar-text-color);
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
          padding: var(--ha-space-4);
          white-space: nowrap;
        }

        .tooltip {
          display: none;
          position: absolute;
          opacity: 0.9;
          border-radius: var(--ha-border-radius-sm);
          white-space: nowrap;
          color: var(--sidebar-background-color);
          background-color: var(--sidebar-text-color);
          padding: var(--ha-space-1);
          font-weight: var(--ha-font-weight-medium);
        }

        .menu ha-icon-button {
          -webkit-transform: scaleX(var(--scale-direction));
          transform: scaleX(var(--scale-direction));
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
