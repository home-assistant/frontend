import "@material/mwc-button/mwc-button";
import {
  mdiCalendar,
  mdiHammer,
  mdiLightningBolt,
  mdiChartBox,
  mdiFormatListBulletedType,
  mdiViewDashboard,
  mdiTooltipAccount,
  mdiPlayBoxMultiple,
  mdiCart,
} from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { HomeAssistant, PanelInfo } from "../types";
import "./ha-sidebar-config";
import "./ha-sidebar-panel";

const styles = css`
  :host {
    display: contents;
  }
  .spacer {
    flex: 1;
  }
`;

const SHOW_AFTER_SPACER = ["config", "developer-tools"];
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

  // const reverseSort = [...panelsOrder].reverse();
  return [beforeSpacer, afterSpacer];
};
const computePanels = memoizeOne(_computePanels);

@customElement("ha-sidebar-panels")
class HaSidebarPanels extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public expanded = false;

  @property({ type: String }) public currentPanel = "";

  static styles = styles;

  protected render() {
    const [beforeSpacer, afterSpacer] = computePanels(
      this.hass.panels,
      this.hass.defaultPanel,
      [],
      [],
      this.hass.locale
    );
    const renderPanel = (panel: PanelInfo) =>
      panel.url_path === "config"
        ? html`<ha-sidebar-config
            .hass=${this.hass}
            .expanded=${this.expanded}
            .selected=${this.currentPanel === "config"}
            .name=${this.hass.localize(`panel.${panel.title}`) ||
            panel.title ||
            ""}
            @mouseenter=${this._panelOver}
            @mouseleave=${this._panelLeave}
          ></ha-sidebar-config>`
        : html`<ha-sidebar-panel
            .expanded=${this.expanded}
            .selected=${this.currentPanel === panel.url_path}
            .path=${panel.url_path}
            .name=${panel.url_path === this.hass.defaultPanel
              ? panel.title || this.hass.localize("panel.states")
              : this.hass.localize(`panel.${panel.title}`) || panel.title || ""}
            .icon=${panel.icon || ""}
            .iconPath=${panel.url_path === this.hass.defaultPanel && !panel.icon
              ? PANEL_ICONS.lovelace
              : panel.url_path in PANEL_ICONS
              ? PANEL_ICONS[panel.url_path]
              : undefined}
            @mouseenter=${this._panelOver}
            @mouseleave=${this._panelLeave}
          ></ha-sidebar-panel>`;
    return [
      ...beforeSpacer.map(renderPanel),
      html`<div class="spacer"></div>`,
      ...afterSpacer.map(renderPanel),
    ];
  }

  private _panelOver(ev: CustomEvent) {
    fireEvent(this, "panel-hover", ev.target as HTMLElement);
  }

  private _panelLeave() {
    fireEvent(this, "panel-leave");
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
