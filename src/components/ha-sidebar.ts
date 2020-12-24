import "./ha-clickable-list-item";
import "./ha-icon";
import "./ha-menu-button";
import "./ha-svg-icon";
import "./user/ha-user-badge";
import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button";
import { List } from "@material/mwc-list";
import {
  mdiBell,
  mdiCellphoneCog,
  mdiClose,
  mdiMenu,
  mdiMenuOpen,
  mdiPlus,
  mdiViewDashboard,
} from "@mdi/js";
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
  query,
} from "lit-element";
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
import { ListItem } from "@material/mwc-list/mwc-list-item";
import { navigate } from "../common/navigate";

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

const isListItem = (element: Element): element is ListItem =>
  element.hasAttribute("mwc-list-item");

const isNodeElement = (node: Node): node is Element =>
  node.nodeType === Node.ELEMENT_NODE;

let Sortable;

@customElement("ha-sidebar")
class HaSidebar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ type: Boolean }) public alwaysExpand = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @property({ type: Boolean }) public editMode = false;

  @internalProperty() private _externalConfig?: ExternalConfig;

  @internalProperty() private _notifications?: PersistentNotification[];

  // property used only in css
  // @ts-ignore
  @property({ type: Boolean, reflect: true }) public rtl = false;

  @internalProperty() private _renderEmptySortable = false;

  @query("div.ha-scrollbar mwc-list.main-panels", false)
  private _standardPanelList!: List;

  @query("div.ha-scrollbar mwc-list.utility-panels", false)
  private _utilityPanelList!: List;

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
    if (!this.hass) {
      return html``;
    }

    // prettier-ignore
    return html`
      ${this._renderHeader()}
      <div class="ha-scrollbar">
      ${this._renderAllPanels()}
      </div>
      <mwc-list
        attr-for-selected="data-panel"
        @focusin=${this._listboxFocusIn}
        @focusout=${this._listboxFocusOut}
        @scroll=${this._listboxScroll}
        @keydown=${this._listboxKeydown}
      >
        <li divider role="separator"></li>
        ${this._renderNotifications()} 
        ${this._renderUserItem()}
        ${this._renderSpacer()}
      </mwc-list>
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

    if (this.hass && this.hass.auth.external) {
      getExternalConfig(this.hass.auth.external).then((conf) => {
        this._externalConfig = conf;
      });
    }
    subscribeNotifications(this.hass.connection, (notifications) => {
      this._notifications = notifications;
    });
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("alwaysExpand")) {
      this.expanded = this.alwaysExpand;
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
      this.rtl = computeRTL(this.hass);
    }

    if (!SUPPORT_SCROLL_IF_NEEDED) {
      return;
    }
    if (!oldHass || oldHass.panelUrl !== this.hass.panelUrl) {
      const selectedEl = this.shadowRoot!.querySelector(
        "ha-clickable-list-item[activated]"
      );
      if (selectedEl) {
        // @ts-ignore
        selectedEl.scrollIntoViewIfNeeded();
      }
    }
  }

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
            <mwc-icon-button
              .label=${this.hass.localize("ui.sidebar.sidebar_toggle")}
              @action=${this._toggleSidebar}
            >
              <ha-svg-icon
                .path=${this.hass.dockedSidebar === "docked"
                  ? mdiMenuOpen
                  : mdiMenu}
              ></ha-svg-icon>
            </mwc-icon-button>
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
    // prettier-ignore
    return html`
      ${this._renderNormalPanels()}
      ${this._renderUtilityPanels()}
      `;
  }

  private _renderNormalPanels() {
    const [beforeSpacer] = computePanels(
      this.hass.panels,
      this.hass.defaultPanel,
      this._panelOrder,
      this._hiddenPanels
    );

    // prettier-ignore
    return html`
      <mwc-list
        class="main-panels"
        attr-for-selected="data-panel"
        @focusin=${this._listboxFocusIn}
        @focusout=${this._listboxFocusOut}
        @scroll=${this._listboxScroll}
        @keydown=${this._listboxKeydown}
      >
        ${this.editMode
          ? this._renderPanelsEdit(beforeSpacer)
          : this._renderPanels(beforeSpacer)}
      </mwc-list>
    `;
  }

  private _renderPanelsEdit(beforeSpacer: PanelInfo[]) {
    // prettier-ignore
    return html`<div id="sortable">
        ${guard([this._hiddenPanels, this._renderEmptySortable], () =>
          this._renderEmptySortable ? "" : this._renderPanels(beforeSpacer)
        )}
      </div>
      ${this._renderHiddenItemSpacer()}
      ${this._renderHiddenPanels()} `;
  }

  private _renderHiddenPanels() {
    return html` ${this._hiddenPanels.length
      ? html`${this._hiddenPanels.map((url) => {
          const panel = this.hass.panels[url];
          if (!panel) {
            return "";
          }
          return html`<ha-clickable-list-item
            @click=${this._unhidePanel}
            class="hidden-panel"
            .panel=${url}
            graphic="icon"
            .rtl=${this.rtl}
          >
            <ha-icon
              slot="graphic"
              .icon=${panel.url_path === this.hass.defaultPanel
                ? "mdi:view-dashboard"
                : panel.icon}
            ></ha-icon>
            <span class="item-text"
              >${panel.url_path === this.hass.defaultPanel
                ? this.hass.localize("panel.states")
                : this.hass.localize(`panel.${panel.title}`) ||
                  panel.title}</span
            >
            <mwc-icon-button class="show-panel">
              <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
            </mwc-icon-button>
          </ha-clickable-list-item>`;
        })}
        ${this._renderSpacer()}`
      : ""}`;
  }

  private _renderUtilityPanels() {
    const [, afterSpacer] = computePanels(
      this.hass.panels,
      this.hass.defaultPanel,
      this._panelOrder,
      this._hiddenPanels
    );

    // prettier-ignore
    return html`
      <mwc-list
        @focusin=${this._listboxFocusIn}
        @focusout=${this._listboxFocusOut}
        @scroll=${this._listboxScroll}
        @keydown=${this._listboxKeydown}
        class="utility-panels"
      >
        ${afterSpacer.map((panel) =>
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
        )}
        ${this._renderExternalConfiguration()}
      </mwc-list>
    `;
  }

  private _renderSpacer() {
    return html`<li divider role="separator" class="spacer"></li>`;
  }

  private _renderHiddenItemSpacer() {
    return html`<li divider role="separator" class="spacer-hidden"></li>`;
  }

  private _renderNotifications() {
    let notificationCount = this._notifications
      ? this._notifications.length
      : 0;
    for (const entityId in this.hass.states) {
      if (computeDomain(entityId) === "configurator") {
        notificationCount++;
      }
    }

    return html`
      <ha-clickable-list-item
        aria-role="option"
        @click=${this._handleShowNotificationDrawer}
        graphic="icon"
        hasMeta
        @mouseenter=${this._itemMouseEnter}
        @mouseleave=${this._itemMouseLeave}
        .rtl=${this.rtl}
      >
        <ha-svg-icon slot="graphic" .path=${mdiBell}></ha-svg-icon>
        ${!this.expanded && notificationCount > 0
          ? html`
              <span class="notification-badge">
                ${notificationCount}
              </span>
            `
          : ""}
        <span class="item-text">
          ${this.hass.localize("ui.notification_drawer.title")}
        </span>
        ${this.expanded && notificationCount > 0
          ? html`
              <span class="notification-badge" slot="meta"
                >${notificationCount}</span
              >
            `
          : ""}
      </ha-clickable-list-item>
    `;
  }

  private _renderUserItem() {
    return html`<ha-clickable-list-item
      class="profile"
      .href=${"profile"}
      data-panel="panel"
      tabindex="-1"
      aria-label=${this.hass.localize("panel.profile")}
      @mouseenter=${this._itemMouseEnter}
      @mouseleave=${this._itemMouseLeave}
      graphic="icon"
      .activated=${this.hass.panelUrl === "profile"}
      .rtl=${this.rtl}
    >
      <ha-user-badge
        slot="graphic"
        .user=${this.hass.user}
        .hass=${this.hass}
      ></ha-user-badge>

      <span class="item-text">
        ${this.hass.user?.name}
      </span>
    </ha-clickable-list-item> `;
  }

  private _renderExternalConfiguration() {
    return html`${this._externalConfig && this._externalConfig.hasSettingsScreen
      ? html`
          <ha-clickable-list-item
            aria-role="option"
            aria-label=${this.hass.localize(
              "ui.sidebar.external_app_configuration"
            )}
            href="#external-app-configuration"
            tabindex="-1"
            @click=${this._handleExternalAppConfiguration}
            @mouseenter=${this._itemMouseEnter}
            @mouseleave=${this._itemMouseLeave}
            graphic="icon"
            .rtl=${this.rtl}
          >
            <ha-svg-icon slot="graphic" .path=${mdiCellphoneCog}></ha-svg-icon>
            <span class="item-text">
              ${this.hass.localize("ui.sidebar.external_app_configuration")}
            </span>
          </ha-clickable-list-item>
        `
      : ""}
    ${this._renderSpacer()} `;
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
    if (!Sortable) {
      const [sortableImport, sortStylesImport] = await Promise.all([
        import("sortablejs/modular/sortable.core.esm"),
        import("../resources/ha-sortable-style-ha-clickable"),
      ]);

      const style = document.createElement("style");
      style.innerHTML = sortStylesImport.sortableStyles.cssText;
      this.shadowRoot!.appendChild(style);

      Sortable = sortableImport.Sortable;
      Sortable.mount(sortableImport.OnSpill);
      Sortable.mount(sortableImport.AutoScroll());
    }

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
      this.expanded ||
      new Date().getTime() < this._recentKeydownActiveUntil
    ) {
      return;
    }
    if (this._mouseLeaveTimeout) {
      clearTimeout(this._mouseLeaveTimeout);
      this._mouseLeaveTimeout = undefined;
    }
    this._showTooltip(ev.currentTarget);
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
    this._showTooltip(ev.target.querySelector("ha-clickable-list-item"));
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

  private _getIndexOfTarget(evt: Event): number {
    const listbox = evt.currentTarget as List;
    const elements = listbox.items;
    const path = evt.composedPath();

    for (const pathItem of path as Node[]) {
      let index = -1;
      if (isNodeElement(pathItem) && isListItem(pathItem)) {
        index = elements.indexOf(pathItem);
      }

      if (index !== -1) {
        return index;
      }
    }

    return -1;
  }

  private _getCurrentListPosition(ev: KeyboardEvent) {
    return {
      index: this._getIndexOfTarget(ev),
      list: ev.currentTarget as List,
    };
  }

  private _selectNextItem(ev: KeyboardEvent) {
    const [beforeSpacer, afterSpacer] = computePanels(
      this.hass.panels,
      this.hass.defaultPanel,
      this._panelOrder,
      this._hiddenPanels
    );

    const { index, list } = this._getCurrentListPosition(ev);

    if (list === this._standardPanelList && index === beforeSpacer.length - 1) {
      this._setFocusPanelList(this._utilityPanelList, "top");
    } else if (
      list === this._utilityPanelList &&
      index === afterSpacer.length - 1
    ) {
      this._setFocusPanelList(this._standardPanelList, "top");
    }
  }

  private _selectPreviousItem(ev: KeyboardEvent) {
    const { index, list } = this._getCurrentListPosition(ev);

    if (list === this._standardPanelList && index === 0) {
      this._setFocusPanelList(this._utilityPanelList, "bottom");
    } else if (list === this._utilityPanelList && index === 0) {
      this._setFocusPanelList(this._standardPanelList, "bottom");
    }
  }

  private _listboxKeydown(ev: KeyboardEvent) {
    if (ev.code === "ArrowDown") {
      this._selectNextItem(ev);
    } else if (ev.code === "ArrowUp") {
      this._selectPreviousItem(ev);
    } else if (ev.code === "Enter") {
      (ev.target as ListItem)?.shadowRoot?.querySelector("a")?.click();
    }

    this._recentKeydownActiveUntil = new Date().getTime() + 100;
  }

  private _setFocusPanelList(list: List, position: "top" | "bottom") {
    let index = 0;

    if (position === "bottom") {
      index = list.querySelectorAll("ha-clickable-list-item").length - 1;
    }

    list.focusItemAtIndex(index);
  }

  private _showTooltip(item) {
    if (this._tooltipHideTimeout) {
      clearTimeout(this._tooltipHideTimeout);
      this._tooltipHideTimeout = undefined;
    }
    const tooltip = this._tooltip;
    const listbox = this.shadowRoot!.querySelector("mwc-list")!;
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

  private _toggleSidebar(ev: CustomEvent) {
    if (ev.detail.action !== "tap") {
      return;
    }
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
      <ha-clickable-list-item
        .activated=${urlPath === this.hass.panelUrl}
        .href=${urlPath}
        .disableHref=${this.editMode}
        data-panel=${urlPath}
        tabindex="-1"
        @mouseenter=${this._itemMouseEnter}
        @mouseleave=${this._itemMouseLeave}
        @click=${() => navigate(this, `/${urlPath}`)}
        graphic="icon"
        .rtl=${this.rtl}
      >
        ${iconPath
          ? html`<ha-svg-icon slot="graphic" .path=${iconPath}></ha-svg-icon>`
          : html`<ha-icon slot="graphic" .icon=${icon}></ha-icon>`}
        ${title}
        ${this.editMode
          ? html`<mwc-icon-button
              class="hide-panel"
              .panel=${urlPath}
              @click=${this._hidePanel}
            >
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </mwc-icon-button>`
          : ""}
      </ha-clickable-list-item>
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
          width: 56px;
        }
        :host([expanded]) {
          width: 256px;
          width: calc(256px + env(safe-area-inset-left));
        }
        :host([rtl]) {
          border-right: 0;
          border-left: 1px solid var(--divider-color);
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
        .menu mwc-icon-button {
          color: var(--sidebar-icon-color);
        }

        ha-clickable-list-item {
          margin: 4px;
          border-radius: 4px;
          height: 40px;
          --mdc-list-side-padding: 12px;
          --mdc-theme-text-icon-on-background: var(--sidebar-icon-color);
        }

        ha-clickable-list-item[activated] {
          --mdc-theme-text-icon-on-background: var(
            --sidebar-selected-icon-color
          );
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

        .ha-scrollbar {
          height: calc(100% - var(--header-height) - 105px);
          height: calc(
            100% - var(--header-height) - 105px - env(safe-area-inset-bottom)
          );
          overflow-x: hidden;
          display: flex;
          justify-content: space-between;
          flex-direction: column;
        }

        mwc-list {
          width: var(--app-drawer-width);
          --mdc-list-vertical-padding: 4px 0;
          margin-left: env(safe-area-inset-left);
          -ms-user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          background-color: var(--sidebar-background-color);
        }

        :host([rtl]) mwc-list {
          border-right: 0;
          /* border-left: 1px solid var(--divider-color); */
        }

        :host([expanded]) mwc-list {
          width: 256px;
          width: calc(256px + env(safe-area-inset-left));
        }

        [slot="graphic"] {
          width: 100%;
        }

        :host([rtl]) mwc-list {
          margin-left: initial;
          margin-right: env(safe-area-inset-right);
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
          --mdc-list-item-graphic-margin: 16px;
          --mdc-list-item-graphic-size: 40px;
          --mdc-list-side-padding: 4px;
        }
        :host([rtl]) .profile {
          --mdc-list-item-graphic-size: 40px;
          --mdc-list-side-padding: 4px;
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
          line-height: 1.5rem;
          text-align: center;
          padding: 2px 6px;
          color: var(--text-accent-color, var(--text-primary-color));
          font-size: 14px;
        }

        ha-svg-icon + .notification-badge {
          position: absolute;
          bottom: 18px;
          left: 25px;
          padding: 0px 0px;
        }

        .spacer {
          flex: 1;
          pointer-events: none;
          border: 0px;
        }

        .spacer-hidden {
          flex: 1;
          pointer-events: none;
          height: 77px;
          border: 0px;
        }

        .subheader {
          color: var(--sidebar-text-color);
          font-weight: 500;
          font-size: 14px;
          padding: 16px;
          white-space: nowrap;
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
