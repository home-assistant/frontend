import "@polymer/paper-menu-button/paper-menu-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";
import {
  HassioHostInfo,
  HassioHassOSInfo,
} from "../../../src/data/hassio/host";
import { HassioSupervisorInfo } from "../../../src/data/hassio/supervisor";
import { HomeAssistant } from "../../../src/types";

import "./hassio-host-info";
import "./hassio-supervisor-info";
import "./hassio-supervisor-log";

@customElement("hassio-system")
class HassioSystem extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public supervisorInfo!: HassioSupervisorInfo;
  @property() public hostInfo!: HassioHostInfo;
  @property() public hassOsInfo!: HassioHassOSInfo;

  public render(): TemplateResult | void {
    return html`
      <div class="content">
        <h1>Information</h1>
        <div class="side-by-side">
          <hassio-supervisor-info
            .hass=${this.hass}
            .supervisorInfo=${this.supervisorInfo}
          ></hassio-supervisor-info>
          <hassio-host-info
            .hass=${this.hass}
            .hostInfo=${this.hostInfo}
            .hassOsInfo=${this.hassOsInfo}
          ></hassio-host-info>
        </div>
        <h1>System log</h1>
        <hassio-supervisor-log .hass=${this.hass}></hassio-supervisor-log>
      </div>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        .content {
          margin: 8px;
          color: var(--primary-text-color);
        }
        .title {
          margin-top: 24px;
          color: var(--primary-text-color);
          font-size: 2em;
          padding-left: 8px;
          margin-bottom: 8px;
        }
        .side-by-side {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          grid-gap: 8px;
        }
        hassio-supervisor-log {
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-system": HassioSystem;
  }
}
