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
import "../../src/layouts/hass-tabs-subpage";

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
    const supervisorTabs: PageNavigation[] = [
      {
        name: "Dashboard",
        path: `/hassio/dashboard`,
        icon: "mdi:view-dashboard",
      },
      {
        name: "Add-on store",
        path: `/hassio/store`,
        icon: "mdi:store",
      },
      {
        name: "Snapshots",
        path: `/hassio/snapshots`,
        icon: "mdi:backup-restore",
      },
      {
        name: "System",
        path: `/hassio/system`,
        icon: "mdi:cogs",
      },
    ];

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${supervisorTabs}
      >
        <span slot="header">Supervisor</span>
        <hassio-panel-router
          .route=${this.route}
          .hass=${this.hass}
          .supervisorInfo=${this.supervisorInfo}
          .hostInfo=${this.hostInfo}
          .hassInfo=${this.hassInfo}
          .hassOsInfo=${this.hassOsInfo}
        ></hassio-panel-router>
      </hass-tabs-subpage>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-panel": HassioPanel;
  }
}
