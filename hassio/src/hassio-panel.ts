import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import { HassioHassOSInfo, HassioHostInfo } from "../../src/data/hassio/host";
import {
  HassioHomeAssistantInfo,
  HassioSupervisorInfo,
} from "../../src/data/hassio/supervisor";
import "../../src/resources/ha-style";
import { HomeAssistant, Route } from "../../src/types";
import "./hassio-panel-router";
import type { PageNavigation } from "../../src/layouts/hass-tabs-subpage";

export const supervisorTabs: PageNavigation[] = [
  {
    name: "Dashboard",
    path: `/hassio/dashboard`,
    icon: "hassio:view-dashboard",
  },
  {
    name: "Add-on store",
    path: `/hassio/store`,
    icon: "hassio:store",
  },
  {
    name: "Snapshots",
    path: `/hassio/snapshots`,
    icon: "hassio:backup-restore",
  },
  {
    name: "System",
    path: `/hassio/system`,
    icon: "hassio:cogs",
  },
];

@customElement("hassio-panel")
class HassioPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public supervisorInfo!: HassioSupervisorInfo;

  @property({ attribute: false }) public hostInfo!: HassioHostInfo;

  @property({ attribute: false }) public hassInfo!: HassioHomeAssistantInfo;

  @property({ attribute: false }) public hassOsInfo!: HassioHassOSInfo;

  protected render(): TemplateResult {
    return html`
      <hassio-panel-router
        .route=${this.route}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .supervisorInfo=${this.supervisorInfo}
        .hostInfo=${this.hostInfo}
        .hassInfo=${this.hassInfo}
        .hassOsInfo=${this.hassOsInfo}
      ></hassio-panel-router>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-panel": HassioPanel;
  }
}
