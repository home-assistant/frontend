import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import "../../../components/ha-card";
import "../ha-config-section";
import "./zha-device-card";
import "@polymer/paper-icon-button/paper-icon-button";

import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import { ZHADevice } from "../../../data/zha";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { navigate } from "../../../common/navigate";

@customElement("zha-node")
export class ZHANode extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public isWide?: boolean;
  @property() public device?: ZHADevice;
  @property() private _showHelp: boolean = false;

  protected render(): TemplateResult | void {
    return html`
      <ha-config-section .isWide="${this.isWide}">
        <div class="header" slot="header">
          <span
            >${this.hass!.localize(
              "ui.panel.config.zha.node_management.header"
            )}</span
          >
          <paper-icon-button
            class="toggle-help-icon"
            @click="${this._onHelpTap}"
            icon="hass:help-circle"
          ></paper-icon-button>
        </div>
        <span slot="introduction">
          ${this.hass!.localize(
            "ui.panel.config.zha.node_management.introduction"
          )}
          <br /><br />
          ${this.hass!.localize(
            "ui.panel.config.zha.node_management.hint_battery_devices"
          )}
          <br /><br />
          ${this.hass!.localize(
            "ui.panel.config.zha.node_management.hint_wakeup"
          )}
        </span>
        <div class="content">
          ${this.device
            ? html`
                <zha-device-card
                  class="card"
                  .hass=${this.hass}
                  .device=${this.device}
                  .narrow=${!this.isWide}
                  .showHelp=${this._showHelp}
                  showName
                  showModelInfo
                  .showEntityDetail=${false}
                  .showActions="${this.device.device_type !== "Coordinator"}"
                  @zha-device-removed=${this._onDeviceRemoved}
                ></zha-device-card>
              `
            : html`
                <paper-spinner
                  active
                  alt=${this.hass!.localize("ui.common.loading")}
                ></paper-spinner>
              `}
        </div>
      </ha-config-section>
    `;
  }

  private _onHelpTap(): void {
    this._showHelp = !this._showHelp;
  }

  private _onDeviceRemoved(): void {
    this.device = undefined;
    navigate(this, `/config/zha`, true);
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .node-info {
          margin-left: 16px;
        }

        .help-text {
          color: grey;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 16px;
        }

        .content {
          max-width: 680px;
        }

        .card {
          padding: 28px 20px 0;
          margin-top: 24px;
        }

        ha-service-description {
          display: block;
          color: grey;
        }

        [hidden] {
          display: none;
        }

        .header {
          flex-grow: 1;
        }

        .toggle-help-icon {
          float: right;
          top: 6px;
          right: 0;
          padding-right: 0px;
          color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-node": ZHANode;
  }
}
