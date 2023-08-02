import "@material/mwc-button/mwc-button";
import {
  mdiCalendar,
  mdiCart,
  mdiChartBox,
  mdiFormatListBulletedType,
  mdiHammer,
  mdiLightningBolt,
  mdiPlayBoxMultiple,
  mdiTooltipAccount,
  mdiViewDashboard,
} from "@mdi/js";
import { LitElement, PropertyValues, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { storage } from "../common/decorators/storage";
import { fireEvent } from "../common/dom/fire_event";
import { stringCompare } from "../common/string/compare";
import { HomeAssistant, PanelInfo } from "../types";
import "./ha-sidebar-edit-panels";
import "./ha-sidebar-panel";
import "./ha-sidebar-panel-config";
import "./ha-sidebar-panel-ext-config";

const styles = css`
  :host {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    margin: 0 -12px;
    padding: 0 12px;
  }
  .spacer {
    flex: 1;
  }
`;

const SHOW_AFTER_SPACER = ["config", "developer-tools"];
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
  "shopping-list": mdiCart,
};
const panelSorter = (
  a: PanelInfo,
  b: PanelInfo,
  panelOrder: string[],
  defaultPanel: string,
  language: string
) => {
  const indexA = panelOrder.indexOf(a.url_path);
  const indexB = panelOrder.indexOf(b.url_path);
  const order = indexA - indexB;
  if (order) return order;
  return defaultPanelSorter(defaultPanel, a, b, language);
};
const defaultPanelSorter = (
  defaultPanel: string,
  a: PanelInfo,
  b: PanelInfo,
  language: string
) => {
  if (a.url_path === defaultPanel) return -1;
  if (b.url_path === defaultPanel) return 1;

  const aLovelace = a.component_name === "lovelace";
  const bLovelace = b.component_name === "lovelace";

  if (aLovelace && bLovelace)
    return stringCompare(a.title!, b.title!, language);
  if (aLovelace) return -1;
  if (bLovelace) return 1;

  const aBuiltIn = a.url_path in SORT_VALUE_URL_PATHS;
  const bBuiltIn = b.url_path in SORT_VALUE_URL_PATHS;

  if (aBuiltIn && bBuiltIn) {
    return SORT_VALUE_URL_PATHS[a.url_path] - SORT_VALUE_URL_PATHS[b.url_path];
  }
  if (aBuiltIn) return -1;
  if (bBuiltIn) return 1;

  return stringCompare(a.title!, b.title!, language);
};
const _computePanels = (
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

  beforeSpacer.sort((a, b) =>
    panelSorter(a, b, panelsOrder, defaultPanel, locale.language)
  );
  afterSpacer.sort((a, b) =>
    panelSorter(a, b, panelsOrder, defaultPanel, locale.language)
  );
  return [beforeSpacer, afterSpacer];
};
const computePanels = memoizeOne(_computePanels);

@customElement("ha-sidebar-panels")
class HaSidebarPanels extends LitElement {
  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public editMode = false;

  @property({ type: Boolean }) public expanded = false;

  @property({ type: String }) public currentPanel = "";

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

  private searchKeys = "";

  private searchKeysUpdated = 0;

  static styles = styles;

  constructor() {
    super();
    const getCurrentFocus = () => {
      let activeItem = this.shadowRoot?.activeElement;
      activeItem = activeItem?.shadowRoot?.activeElement;
      if (!(activeItem instanceof HTMLElement)) return null;

      const items = this._listItems();
      return { items, index: items.indexOf(activeItem) };
    };
    this.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const focus = getCurrentFocus();
      if (!focus) return;
      const next = e.key === "ArrowUp" ? focus.index - 1 : focus.index + 1;
      if (next >= 0 && next < focus.items.length) {
        e.preventDefault();
        const item = focus.items[next];
        item.focus();
      }
    });
    this.addEventListener("keydown", (e) => {
      if (e.key.length > 1) return;
      if (Date.now() - this.searchKeysUpdated > 500) {
        this.searchKeys = "";
      }
      this.searchKeys += e.key.toLowerCase();
      this.searchKeysUpdated = Date.now();

      const items = this._listItems();
      const item = items.find((i) => {
        const name = i.getAttribute("aria-label");
        return name && name.toLowerCase().startsWith(this.searchKeys);
      });
      if (item) {
        item.focus();
      }
    });
  }

  protected render() {
    const [beforeSpacer, afterSpacer] = computePanels(
      this.hass.panels,
      this.hass.defaultPanel,
      this._panelOrder,
      this._hiddenPanels,
      this.hass.locale
    );
    const getName = (panel: PanelInfo) =>
      panel.url_path === this.hass.defaultPanel
        ? panel.title || this.hass.localize("panel.states")
        : this.hass.localize(`panel.${panel.title}`) || panel.title || "";
    const getIconPath = (panel: PanelInfo) =>
      panel.url_path === this.hass.defaultPanel && !panel.icon
        ? PANEL_ICONS.lovelace
        : panel.url_path in PANEL_ICONS
        ? PANEL_ICONS[panel.url_path]
        : undefined;
    const renderPanel = (panel: PanelInfo) =>
      panel.url_path === "config"
        ? html`<ha-sidebar-panel-config
            .hass=${this.hass}
            .expanded=${this.expanded}
            .selected=${this.currentPanel === "config"}
            .name=${this.hass.localize(`panel.${panel.title}`) ||
            panel.title ||
            ""}
            @mouseenter=${this._panelOver}
            @mouseleave=${this._panelLeave}
          ></ha-sidebar-panel-config>`
        : html`<ha-sidebar-panel
            .expanded=${this.expanded}
            .selected=${this.currentPanel === panel.url_path}
            .path=${panel.url_path}
            .name=${getName(panel)}
            .icon=${panel.icon || ""}
            .iconPath=${getIconPath(panel)}
            @mouseenter=${this._panelOver}
            @mouseleave=${this._panelLeave}
          ></ha-sidebar-panel>`;
    return [
      this.editMode
        ? html`<ha-sidebar-edit-panels
            .hass=${this.hass}
            .panels=${beforeSpacer.map((p) => ({
              url_path: p.url_path,
              name: getName(p),
              icon: p.icon,
              iconPath: getIconPath(p),
            }))}
            .hiddenPanels=${this._hiddenPanels.map((p) => {
              const panel = this.hass.panels[p];
              if (!panel) return {};
              return {
                url_path: p,
                name: getName(panel),
                icon: panel.icon,
                iconPath: getIconPath(panel),
              };
            })}
            @panel-reorder=${this._panelReorder}
            @panel-hide=${this._panelHide}
            @panel-show=${this._panelShow}
          ></ha-sidebar-edit-panels>`
        : html`${beforeSpacer.map(renderPanel)}`,
      html`<div class="spacer"></div>`,
      ...afterSpacer.map(renderPanel),
      ...(!this.hass.user?.is_admin &&
      this.hass.auth.external?.config.hasSettingsScreen
        ? [
            html`<ha-sidebar-panel-ext-config
              .hass=${this.hass}
              .expanded=${this.expanded}
              .name=${this.hass.localize(
                "ui.sidebar.external_app_configuration"
              )}
              @mouseenter=${this._panelOver}
              @mouseleave=${this._panelLeave}
            ></ha-sidebar-panel-ext-config>`,
          ]
        : []),
    ];
  }

  protected shouldUpdate(changedProps: PropertyValues) {
    const nonOrderProps = [...changedProps.keys()].filter(
      (p) => p !== "_panelOrder"
    );
    return nonOrderProps.length > 0;
  }

  private _panelOver(ev: CustomEvent) {
    fireEvent(this, "panel-hover", ev.target as HTMLElement);
  }

  private _panelLeave() {
    fireEvent(this, "panel-leave");
  }

  private _panelReorder(ev: CustomEvent) {
    this._panelOrder = ev.detail;
  }

  private _panelHide(ev: CustomEvent) {
    this._hiddenPanels = [...this._hiddenPanels, ev.detail];
  }

  private _panelShow(ev: CustomEvent) {
    this._hiddenPanels = this._hiddenPanels.filter((p) => p !== ev.detail);
  }

  private _listItems() {
    return [...this.shadowRoot!.children].reduce<HTMLElement[]>(
      (acc, child) => {
        if (child.shadowRoot) {
          const item = child.shadowRoot.firstElementChild;
          if (item instanceof HTMLElement) acc.push(item);
        }
        return acc;
      },
      []
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sidebar-panels": HaSidebarPanels;
  }
  interface HASSDomEvents {
    "panel-hover": HTMLElement;
    "panel-leave": undefined;
  }
}
