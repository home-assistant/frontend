import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button";
import {
  mdiBell,
  mdiCellphoneCog,
  mdiClose,
  mdiMenu,
  mdiMenuOpen,
  mdiPlus,
  mdiViewDashboard,
} from "@mdi/js";
import "@polymer/paper-item/paper-icon-item";
import type { PaperIconItemElement } from "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
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
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { guard } from "lit-html/directives/guard";
import memoizeOne from "memoize-one";
import { LocalStorage } from "../common/decorators/local-storage";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import { compare } from "../common/string/compare";
import { computeRTL } from "../common/util/compute_rtl";
import { ActionHandlerDetail } from "../data/lovelace";
import {
  PersistentNotification,
  subscribeNotifications,
} from "../data/persistent_notification";
import {
  ExternalConfig,
  getExternalConfig,
} from "../external_app/external_config";
import { actionHandler } from "../panels/lovelace/common/directives/action-handler-directive";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant, PanelInfo } from "../types";
import "./ha-icon";
import "./ha-menu-button";
import "./ha-svg-icon";
import "./user/ha-user-badge";

const SHOW_AFTER_SPACER = ["config", "developer-tools", "hassio"];

const SUPPORT_SCROLL_IF_NEEDED = "scrollIntoViewIfNeeded" in document.body;

const SORT_VALUE_URL_PATHS = {
  map: 1,
  logbook: 2,
  history: 3,
  "developer-tools": 9,
  hassio: 10,
  config: 11,
};

const panelSorter = (
  reverseSort: string[],
  defaultPanel: string,
  a: PanelInfo,
  b: PanelInfo
) => {
  const indexA = reverseSort.indexOf(a.url_path);
  const indexB = reverseSort.indexOf(b.url_path);
  if (indexA !== indexB) {
    if (indexA < indexB) {
      return 1;
    }
    return -1;
  }
  return defaultPanelSorter(defaultPanel, a, b);
};

const defaultPanelSorter = (
  defaultPanel: string,
  a: PanelInfo,
  b: PanelInfo
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
    return compare(a.title!, b.title!);
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
  return compare(a.title!, b.title!);
};

const computePanels = memoizeOne(
  (
    panels: HomeAssistant["panels"],
    defaultPanel: HomeAssistant["defaultPanel"],
    panelsOrder: string[],
    hiddenPanels: string[]
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

    beforeSpacer.sort((a, b) => panelSorter(reverseSort, defaultPanel, a, b));
    afterSpacer.sort((a, b) => panelSorter(reverseSort, defaultPanel, a, b));

    return [beforeSpacer, afterSpacer];
  }
);

let Sortable;

let sortStyles: CSSResult;

@customElement("ha-sidebar")
class HaSidebar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ type: Boolean }) public alwaysExpand = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @internalProperty() private _externalConfig?: ExternalConfig;

  @internalProperty() private _notifications?: PersistentNotification[];

  @internalProperty() private _editMode = false;

  // property used only in css
  // @ts-ignore
  @property({ type: Boolean, reflect: true }) public rtl = false;

  @internalProperty() private _renderEmptySortable = false;

  private _mouseLeaveTimeout?: number;

  private _tooltipHideTimeout?: number;

  private _recentKeydownActiveUntil = 0;

  // @ts-ignore
  @LocalStorage("sidebarPanelOrder", true, {
    attribute: false,
  })
  private _panelOrder: string[] = [];

  // @ts-ignore
  @LocalStorage("sidebarHiddenPanels", true, {
    attribute: false,
  })
  private _hiddenPanels: string[] = [];

  private _sortable?;

  protected render() {
    const hass = this.hass;

    if (!hass) {
      return html``;
    }

    const [beforeSpacer, afterSpacer] = computePanels(
      hass.panels,
      hass.defaultPanel,
      this._panelOrder,
      this._hiddenPanels
    );

    let notificationCount = this._notifications
      ? this._notifications.length
      : 0;
    for (const entityId in hass.states) {
      if (computeDomain(entityId) === "configurator") {
        notificationCount++;
      }
    }

    return html`
      ${this._editMode
        ? html`
            <style>
              ${sortStyles?.cssText}
            </style>
          `
        : ""}
      <div
        class="menu"
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: !this._editMode,
          disabled: this._editMode,
        })}
      >
        ${!this.narrow
          ? html`
              <mwc-icon-button
                .label=${hass.localize("ui.sidebar.sidebar_toggle")}
                @click=${this._toggleSidebar}
              >
                <ha-svg-icon
                  .path=${hass.dockedSidebar === "docked"
                    ? mdiMenuOpen
                    : mdiMenu}
                ></ha-svg-icon>
              </mwc-icon-button>
            `
          : ""}
        <div class="title">
          ${this._editMode
            ? html`<mwc-button outlined @click=${this._closeEditMode}>
                ${hass.localize("ui.sidebar.done")}
              </mwc-button>`
            : "Home Assistant"}
        </div>
      </div>
      <paper-listbox
        attr-for-selected="data-panel"
        class="ha-scrollbar"
        .selected=${hass.panelUrl}
        @focusin=${this._listboxFocusIn}
        @focusout=${this._listboxFocusOut}
        @scroll=${this._listboxScroll}
        @keydown=${this._listboxKeydown}
      >
        ${this._editMode
          ? html`<div id="sortable">
              ${guard([this._hiddenPanels, this._renderEmptySortable], () =>
                this._renderEmptySortable
                  ? ""
                  : this._renderPanels(beforeSpacer)
              )}
            </div>`
          : this._renderPanels(beforeSpacer)}
        <div class="spacer" disabled></div>
        ${this._editMode && this._hiddenPanels.length
          ? html`
              ${this._hiddenPanels.map((url) => {
                const panel = this.hass.panels[url];
                return html`<paper-icon-item
                  @click=${this._unhidePanel}
                  class="hidden-panel"
                >
                  <ha-icon
                    slot="item-icon"
                    .icon=${panel.url_path === "lovelace"
                      ? "mdi:view-dashboard"
                      : panel.icon}
                  ></ha-icon>
                  <span class="item-text"
                    >${panel.url_path === "lovelace"
                      ? hass.localize("panel.states")
                      : hass.localize(`panel.${panel.title}`) ||
                        panel.title}</span
                  >
                  <ha-svg-icon
                    class="hide-panel"
                    .panel=${url}
                    .path=${mdiPlus}
                  ></ha-svg-icon>
                </paper-icon-item>`;
              })}
              <div class="spacer" disabled></div>
            `
          : ""}
        ${this._renderPanels(afterSpacer)}
        ${this._externalConfig && this._externalConfig.hasSettingsScreen
          ? html`
              <a
                aria-role="option"
                aria-label=${hass.localize(
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
                    ${hass.localize("ui.sidebar.external_app_configuration")}
                  </span>
                </paper-icon-item>
              </a>
            `
          : ""}
      </paper-listbox>

      <div class="divider"></div>

      <div
        class="notifications-container"
        @mouseenter=${this._itemMouseEnter}
        @mouseleave=${this._itemMouseLeave}
      >
        <paper-icon-item
          class="notifications"
          aria-role="option"
          @click=${this._handleShowNotificationDrawer}
        >
          <ha-svg-icon slot="item-icon" .path=${mdiBell}></ha-svg-icon>
          ${!this.expanded && notificationCount > 0
            ? html`
                <span class="notification-badge" slot="item-icon">
                  ${notificationCount}
                </span>
              `
            : ""}
          <span class="item-text">
            ${hass.localize("ui.notification_drawer.title")}
          </span>
          ${this.expanded && notificationCount > 0
            ? html`
                <span class="notification-badge">${notificationCount}</span>
              `
            : ""}
        </paper-icon-item>
      </div>

      <a
        class=${classMap({
          profile: true,
          // Mimick behavior that paper-listbox provides
          "iron-selected": hass.panelUrl === "profile",
        })}
        href="/profile"
        data-panel="panel"
        tabindex="-1"
        aria-role="option"
        aria-label=${hass.localize("panel.profile")}
        @mouseenter=${this._itemMouseEnter}
        @mouseleave=${this._itemMouseLeave}
      >
        <paper-icon-item>
          <ha-user-badge
            slot="item-icon"
            .user=${hass.user}
            .hass=${hass}
          ></ha-user-badge>

          <span class="item-text">
            ${hass.user ? hass.user.name : ""}
          </span>
        </paper-icon-item>
      </a>
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
      changedProps.has("_notifications") ||
      changedProps.has("_editMode") ||
      changedProps.has("_renderEmptySortable") ||
      changedProps.has("_hiddenPanels") ||
      (changedProps.has("_panelOrder") && !this._editMode)
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
      hass.language !== oldHass.language ||
      hass.states !== oldHass.states ||
      hass.defaultPanel !== oldHass.defaultPanel
    );
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    if (this.hass && this.hass.auth.external) {
      getExternalConfig(this.hass.auth.external).then((conf) => {
        this._externalConfig = conf;
      });
    }
    subscribeNotifications(this.hass.connection, (notifications) => {
      this._notifications = notifications;
    });
    window.addEventListener("hass-edit-sidebar", () =>
      this._activateEditMode()
    );
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("alwaysExpand")) {
      this.expanded = this.alwaysExpand;
    }
    if (!changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass || oldHass.language !== this.hass.language) {
      this.rtl = computeRTL(this.hass);
    }

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

  private get _tooltip() {
    return this.shadowRoot!.querySelector(".tooltip")! as HTMLDivElement;
  }

  private _handleAction(ev: CustomEvent<ActionHandlerDetail>) {
    if (ev.detail.action !== "hold") {
      return;
    }

    this._activateEditMode();
  }

  private async _activateEditMode() {
    if (!Sortable) {
      const [sortableImport, sortStylesImport] = await Promise.all([
        import("sortablejs/modular/sortable.core.esm"),
        import("../resources/ha-sortable-style"),
      ]);

      sortStyles = sortStylesImport.sortableStyles;

      Sortable = sortableImport.Sortable;
      Sortable.mount(sortableImport.OnSpill);
      Sortable.mount(sortableImport.AutoScroll());
    }
    this._editMode = true;

    fireEvent(this, "hass-open-menu");

    await this.updateComplete;

    this._createSortable();
  }

  private _createSortable() {
    this._sortable = new Sortable(this.shadowRoot!.getElementById("sortable"), {
      animation: 150,
      fallbackClass: "sortable-fallback",
      dataIdAttr: "data-panel",
      onSort: async () => {
        this._panelOrder = this._sortable.toArray();
      },
    });
  }

  private _closeEditMode() {
    this._sortable?.destroy();
    this._sortable = undefined;
    this._editMode = false;
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
    this._renderEmptySortable = false;
  }

  private async _unhidePanel(ev: Event) {
    ev.preventDefault();
    const index = this._hiddenPanels.indexOf((ev.target as any).panel);
    if (index < 0) {
      return;
    }
    this._hiddenPanels.splice(index, 1);
    // Make a copy for Memoize
    this._hiddenPanels = [...this._hiddenPanels];
    this._renderEmptySortable = true;
    await this.updateComplete;
    this._renderEmptySortable = false;
  }

  private _itemMouseEnter(ev: MouseEvent) {
    // On keypresses on the listbox, we're going to ignore mouse enter events
    // for 100ms so that we ignore it when pressing down arrow scrolls the
    // sidebar causing the mouse to hover a new icon
    if (
      this.expanded ||
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
    if (this.expanded || ev.target.nodeName !== "A") {
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

  private _handleExternalAppConfiguration(ev: Event) {
    ev.preventDefault();
    this.hass.auth.external!.fireMessage({
      type: "config_screen/show",
    });
  }

  private _toggleSidebar() {
    fireEvent(this, "hass-toggle-menu");
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
          ? mdiViewDashboard
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
    return html`
      <a
        aria-role="option"
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
          ${this._editMode
            ? html`<mwc-icon-button
                class="hide-panel"
                .panel=${urlPath}
                @click=${this._hidePanel}
              >
                <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
              </mwc-icon-button>`
            : ""}
        </paper-icon-item>
      </a>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleScrollbar,
      css`
        :host {
          height: 100%;
          display: block;
          overflow: hidden;
          -ms-user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          border-right: 1px solid var(--divider-color);
          background-color: var(--sidebar-background-color);
          width: 64px;
        }
        :host([expanded]) {
          width: calc(256px + env(safe-area-inset-left));
        }
        :host([rtl]) {
          border-right: 0;
          border-left: 1px solid var(--divider-color);
        }
        .menu {
          box-sizing: border-box;
          height: 65px;
          display: flex;
          padding: 0 8.5px;
          border-bottom: 1px solid transparent;
          white-space: nowrap;
          font-weight: 400;
          color: var(--primary-text-color);
          border-bottom: 1px solid var(--divider-color);
          background-color: var(--primary-background-color);
          font-size: 20px;
          align-items: center;
          padding-left: calc(8.5px + env(safe-area-inset-left));
        }
        :host([rtl]) .menu {
          padding-left: 8.5px;
          padding-right: calc(8.5px + env(safe-area-inset-right));
        }
        :host([expanded]) .menu {
          width: calc(256px + env(safe-area-inset-left));
        }
        :host([rtl][expanded]) .menu {
          width: calc(256px + env(safe-area-inset-right));
        }
        .menu mwc-icon-button {
          color: var(--sidebar-icon-color);
        }
        :host([expanded]) .menu mwc-icon-button {
          margin-right: 23px;
        }
        :host([expanded][rtl]) .menu mwc-icon-button {
          margin-right: 0px;
          margin-left: 23px;
        }

        .title {
          width: 100%;
          display: none;
        }
        :host([narrow]) .title {
          padding: 0 16px;
        }
        :host([expanded]) .title {
          display: initial;
        }
        .title mwc-button {
          width: 100%;
        }

        paper-listbox {
          padding: 4px 0;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          height: calc(100% - 196px - env(safe-area-inset-bottom));
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
          margin: 4px 8px;
          padding-left: 12px;
          border-radius: 4px;
          --paper-item-min-height: 40px;
          width: 48px;
        }
        :host([expanded]) paper-icon-item {
          width: 240px;
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
          right: 0;
          bottom: 0;
          left: 0;
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
        .notifications-container {
          display: flex;
          margin-left: env(safe-area-inset-left);
        }
        :host([rtl]) .notifications-container {
          margin-left: initial;
          margin-right: env(safe-area-inset-right);
        }
        .notifications {
          cursor: pointer;
        }
        .notifications .item-text {
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

        .notification-badge {
          min-width: 20px;
          box-sizing: border-box;
          border-radius: 50%;
          font-weight: 400;
          background-color: var(--accent-color);
          line-height: 20px;
          text-align: center;
          padding: 0px 6px;
          color: var(--text-accent-color, var(--text-primary-color));
        }
        ha-svg-icon + .notification-badge {
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

        :host([rtl]) .menu mwc-icon-button {
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
