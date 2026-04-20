import {
  mdiBell,
  mdiCellphoneCog,
  mdiCog,
  mdiMenu,
  mdiMenuOpen,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
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
} from "../data/panel";
import type { PersistentNotification } from "../data/persistent_notification";
import { subscribeNotifications } from "../data/persistent_notification";
import { subscribeRepairsIssueRegistry } from "../data/repairs";
import type { UpdateEntity } from "../data/update";
import { updateCanInstall } from "../data/update";
import { showEditSidebarDialog } from "../dialogs/sidebar/show-dialog-edit-sidebar";
import { ScrollableFadeMixin } from "../mixins/scrollable-fade-mixin";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { actionHandler } from "../panels/lovelace/common/directives/action-handler-directive";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant, PanelInfo, Route } from "../types";
import "./ha-fade-in";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-md-list";
import "./ha-md-list-item";
import "./ha-spinner";
import "./ha-svg-icon";
import "./ha-tooltip";
import "./user/ha-user-badge";

const SORT_VALUE_URL_PATHS = {
  energy: 1,
  map: 2,
  logbook: 3,
  history: 4,
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

    const allPanels = Object.values(panels).filter(
      (panel) => !FIXED_PANELS.includes(panel.url_path)
    );

    allPanels.forEach((panel) => {
      const isDefaultPanel = panel.url_path === defaultPanel;

      if (
        !isDefaultPanel &&
        (!panel.title ||
          panel.show_in_sidebar === false ||
          hiddenPanels.includes(panel.url_path) ||
          (panel.default_visible === false &&
            !panelsOrder.includes(panel.url_path)))
      ) {
        return;
      }
      beforeSpacer.push(panel);
    });

    const reverseSort = [...panelsOrder].reverse();

    beforeSpacer.sort((a, b) =>
      panelSorter(reverseSort, defaultPanel, a, b, locale.language)
    );

    return [beforeSpacer, []];
  }
);

@customElement("ha-sidebar")
class HaSidebar extends SubscribeMixin(ScrollableFadeMixin(LitElement)) {
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

  private _unsubPersistentNotifications: UnsubscribeFunc | undefined;

  @query(".before-spacer") private _scrollableList?: HTMLDivElement;

  protected get scrollableElement(): HTMLElement | null {
    return this._scrollableList as HTMLElement | null;
  }

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
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const selectedPanel = this.hass.panelUrl;

    // prettier-ignore
    return html`
      ${this._renderHeader()}
      ${this._renderAllPanels(selectedPanel)}`;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (
      changedProps.has("expanded") ||
      changedProps.has("narrow") ||
      changedProps.has("alwaysExpand") ||
      changedProps.has("_updatesCount") ||
      changedProps.has("_issuesCount") ||
      changedProps.has("_notifications") ||
      changedProps.has("_hiddenPanels") ||
      changedProps.has("_panelOrder") ||
      changedProps.has("_contentScrolled") ||
      changedProps.has("_contentScrollable")
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
    const renderList = (content, cls: string, scrollable: boolean) =>
      html`<ha-md-list
        class=${classMap({
          "ha-scrollbar": scrollable,
          [cls]: true,
        })}
        >${content}</ha-md-list
      >`;

    if (!this._panelOrder || !this._hiddenPanels) {
      return html`
        <ha-fade-in .delay=${500}>
          <ha-spinner size="small"></ha-spinner>
        </ha-fade-in>
        ${renderList(
          html`${this._renderFixedPanels(selectedPanel)}`,
          "after-spacer",
          false
        )}
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

    // prettier-ignore
    return html`<div class="panels-list">
      <div class="wrapper">
        ${renderList(
      this._renderPanels(beforeSpacer, selectedPanel),
      "before-spacer",
      true
    )}
        ${this.renderScrollableFades()}
      </div>
      ${this._renderSpacer()}
      ${renderList(
      html`
          ${this._renderPanels(afterSpacer, selectedPanel)}
          ${this._renderFixedPanels(selectedPanel)}
        `,
      "after-spacer",
      false
    )}
    </div>`;
  }

  private _renderFixedPanels(selectedPanel: string) {
    // prettier-ignore
    return html`
      ${this.hass.user?.is_admin
        ? this._renderConfiguration(selectedPanel)
        : this._renderExternalConfiguration()}
      ${this._renderNotifications()}
      ${this._renderUserItem(selectedPanel)}
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
        id="sidebar-panel-${urlPath}"
        class=${classMap({ selected: isSelected })}
      >
        ${iconPath
          ? html`<ha-svg-icon slot="start" .path=${iconPath}></ha-svg-icon>`
          : html`<ha-icon slot="start" .icon=${icon}></ha-icon>`}
        <span class="item-text" slot="headline">${title}</span>
      </ha-md-list-item>
      ${!this.alwaysExpand && title
        ? this._renderToolTip(`sidebar-panel-${urlPath}`, title)
        : nothing}
    `;
  }

  private _renderSpacer() {
    return html`<div class="spacer" disabled></div>`;
  }

  private _renderConfiguration(selectedPanel: string) {
    if (!this.hass.user?.is_admin) {
      return nothing;
    }
    const isSelected = selectedPanel === "config";
    return html`
      <ha-md-list-item
        class="configuration ${classMap({ selected: isSelected })}"
        type="button"
        href="/config"
        id="sidebar-config"
      >
        <ha-svg-icon slot="start" .path=${mdiCog}></ha-svg-icon>
        ${this._updatesCount > 0 || this._issuesCount > 0
          ? html`
              <span class="badge" slot="start">
                ${this._updatesCount + this._issuesCount}
              </span>
            `
          : nothing}
        <span class="item-text" slot="headline"
          >${this.hass.localize("panel.config")}</span
        >
        ${this._updatesCount > 0 || this._issuesCount > 0
          ? html`
              <span class="badge" slot="end"
                >${this._updatesCount + this._issuesCount}</span
              >
            `
          : nothing}
      </ha-md-list-item>
      ${!this.alwaysExpand
        ? this._renderToolTip(
            "sidebar-config",
            this.hass.localize("panel.config")
          )
        : nothing}
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
        type="button"
        id="sidebar-notifications"
      >
        <ha-svg-icon slot="start" .path=${mdiBell}></ha-svg-icon>
        ${notificationCount > 0
          ? html`
              <span class="badge" slot="start"> ${notificationCount} </span>
            `
          : nothing}
        <span class="item-text" slot="headline"
          >${this.hass.localize("ui.notification_drawer.title")}</span
        >
        ${notificationCount > 0
          ? html`<span class="badge" slot="end">${notificationCount}</span>`
          : nothing}
      </ha-md-list-item>
      ${!this.alwaysExpand
        ? this._renderToolTip(
            "sidebar-notifications",
            this.hass.localize("ui.notification_drawer.title")
          )
        : nothing}
    `;
  }

  private _renderUserItem(selectedPanel: string) {
    const isRTL = computeRTL(this.hass);
    const isSelected = selectedPanel === "profile";

    return html`
      <ha-md-list-item
        href="/profile"
        type="link"
        id="sidebar-profile"
        class=${classMap({
          user: true,
          selected: isSelected,
          rtl: isRTL,
        })}
      >
        <ha-user-badge
          slot="start"
          .user=${this.hass.user}
          .hass=${this.hass}
        ></ha-user-badge>
        <span class="item-text" slot="headline"
          >${this.hass.user ? this.hass.user.name : ""}</span
        >
      </ha-md-list-item>
      ${!this.alwaysExpand && this.hass.user
        ? this._renderToolTip("sidebar-profile", this.hass.user.name)
        : nothing}
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
        id="sidebar-external-config"
      >
        <ha-svg-icon slot="start" .path=${mdiCellphoneCog}></ha-svg-icon>
        <span class="item-text" slot="headline"
          >${this.hass.localize("ui.sidebar.external_app_configuration")}</span
        >
      </ha-md-list-item>
      ${!this.alwaysExpand
        ? this._renderToolTip(
            "sidebar-external-config",
            this.hass.localize("ui.sidebar.external_app_configuration")
          )
        : nothing}
    `;
  }

  private _renderToolTip(id: string, text: string) {
    return html`<ha-tooltip
      for=${id}
      show-delay="0"
      hide-delay="0"
      placement="right"
    >
      ${text}
    </ha-tooltip>`;
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

  private _handleShowNotificationDrawer() {
    fireEvent(this, "hass-show-notifications");
  }

  private _toggleSidebar(ev: CustomEvent) {
    if (ev.detail.action !== "tap") {
      return;
    }
    fireEvent(this, "hass-toggle-menu");
  }

  static get styles() {
    return [
      ...super.styles,
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
          padding-bottom: calc(14px + var(--safe-area-inset-bottom, 0px));
        }
        .menu {
          height: calc(var(--header-height) + var(--safe-area-inset-top, 0px));
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
          overflow: hidden;
          width: calc(56px + var(--safe-area-inset-left, 0px));
          padding-left: calc(
            var(--ha-space-1) + var(--safe-area-inset-left, 0px)
          );
          padding-inline-start: calc(
            var(--ha-space-1) + var(--safe-area-inset-left, 0px)
          );
          padding-inline-end: initial;
          padding-top: var(--safe-area-inset-top, 0px);
          transition: width var(--ha-animation-duration-normal) ease;
        }
        :host([expanded]) .menu {
          width: calc(256px + var(--safe-area-inset-left, 0px));
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
          flex: 1;
          min-width: 0;
          max-width: 0;
          opacity: 0;
          transition:
            max-width var(--ha-animation-duration-normal) ease,
            opacity var(--ha-animation-duration-normal) ease;
        }
        :host([narrow]) .title {
          margin: 0;
          padding: 0 var(--ha-space-4);
        }
        :host([expanded]) .title {
          max-width: 100%;
          opacity: 1;
          transition-delay: 0ms, 80ms;
        }

        .panels-list {
          display: flex;
          flex-direction: column;
          height: calc(
            100vh - var(--header-height) - var(--safe-area-inset-top, 0px)
          );
        }

        ha-fade-in {
          padding: var(--ha-space-1) 0;
          box-sizing: border-box;
          display: flex;
          justify-content: center;
          align-items: center;
          height: calc(
            100vh - var(--header-height) - var(--safe-area-inset-top, 0px) -
              152px
          ); /* 152px = three list items w/o padding-top */
        }

        ha-md-list {
          overflow-x: hidden;
          background: none;
          margin-left: var(--safe-area-inset-left, 0px);
        }

        .wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          min-height: 0;
          flex: 1;
        }
        ha-md-list.before-spacer {
          padding-bottom: 0;
        }
        ha-md-list.after-spacer {
          padding-top: 0;
          min-height: fit-content;
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
          transition: width var(--ha-animation-duration-normal) ease;
        }
        :host([expanded]) ha-md-list-item {
          width: 248px;
        }
        :host([narrow][expanded]) ha-md-list-item {
          width: calc(240px - var(--safe-area-inset-left, 0px));
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
          display: block;
          max-width: 0;
          opacity: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
          transition:
            max-width var(--ha-animation-duration-normal) ease,
            opacity var(--ha-animation-duration-normal) ease;
        }
        :host([expanded]) ha-md-list-item .item-text {
          max-width: 100%;
          opacity: 1;
          transition-delay: 0ms, 80ms;
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
          transition:
            opacity var(--ha-animation-duration-normal) ease,
            transform var(--ha-animation-duration-normal) ease;
        }

        ha-svg-icon + .badge {
          position: absolute;
          top: var(--ha-space-1);
          left: 26px;
          border-radius: var(--ha-border-radius-md);
          font-size: 0.65em;
          line-height: var(--ha-line-height-expanded);
          padding: 0 var(--ha-space-1);
        }
        :host([expanded]) .badge[slot="start"],
        :host(:not([expanded])) .badge[slot="end"] {
          opacity: 0;
          transform: scale(0.8);
          pointer-events: none;
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
          margin-top: auto;
          pointer-events: none;
        }

        .menu ha-icon-button {
          -webkit-transform: scaleX(var(--scale-direction));
          transform: scaleX(var(--scale-direction));
        }

        @media (prefers-reduced-motion: reduce) {
          .menu,
          ha-md-list-item,
          ha-md-list-item .item-text,
          .title {
            transition: 1ms;
          }
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
