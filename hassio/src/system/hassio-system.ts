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
        <div class="title">Information</div>
        <hassio-supervisor-info
          .hass=${this.hass}
          .supervisorInfo=${this.supervisorInfo}
        ></hassio-supervisor-info>
        <hassio-host-info
          .hass=${this.hass}
          .hostInfo=${this.hostInfo}
          .hassOsInfo=${this.hassOsInfo}
        ></hassio-host-info>
        <div class="title">System log</div>
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
          margin: 4px;
          color: var(--primary-text-color);
        }
        .title {
          margin-top: 24px;
          color: var(--primary-text-color);
          font-size: 2em;
          padding-left: 8px;
          margin-bottom: 8px;
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
