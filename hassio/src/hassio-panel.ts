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
  HassioInfo,
} from "../../src/data/hassio/supervisor";
import { HomeAssistant, Route } from "../../src/types";
import "./hassio-panel-router";

@customElement("hassio-panel")
class HassioPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public supervisorInfo!: HassioSupervisorInfo;

  @property({ attribute: false }) public hassioInfo!: HassioInfo;

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
        .hassioInfo=${this.hassioInfo}
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
